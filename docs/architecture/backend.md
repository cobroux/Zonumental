# Architecture backend — R0 « Socle »

**Statut :** proposé par `tech-lead-back` le 2026-10-19, à relire avec `tech-lead-front` (contrat) et `devops` (déploiement).
**Décisions :** ADR [0001](../adr/0001-back-versions-socle.md) à [0009](../adr/0009-back-observabilite-erreurs.md). **Contrat :** [`docs/api/openapi.yaml`](../api/openapi.yaml).

## 1. Vue d'ensemble

```
 Navigateur (Angular PWA)  ── même origine, HTTPS ──  reverse proxy (devops)
                                                        │  /        -> front statique
                                                        │  /api/*   -> backend
                                                        ▼
 Spring Boot 4.1 (Java 25), un seul jar, monolithe modulaire (Spring Modulith)
 fr.zonumental
 ├─ commun        format d'erreur RFC 9457, Clock Europe/Paris          (aucune dépendance)
 ├─ compte        inscription, vérification, session, mot de passe,
 │                consentements, export, suppression, inactivité, sécurité  -> commun
 ├─ catalogue     villes, monuments (lecture), import                        -> commun
 ├─ capture       R1 (package-info seul en R0)                -> compte, catalogue, commun
 └─ progression   R2 (package-info seul en R0)                -> capture (événements), catalogue, commun
        │                         │                                   │
 PostgreSQL 18 + PostGIS 3.6    SMTP UE (Mailpit en local/recette)   S3 UE (R1, ADR 0006)
 schémas : compte, catalogue
        ▲
 Import ponctuel (même jar, --zonumental.catalogue.importer=true)
   -> Wikidata SPARQL, Wikimedia Pageviews, Wikipédia REST, Commons API
```

Événement inter-modules publié en R0 : `fr.zonumental.compte.CompteSupprime(UUID utilisateurId)` (aucun écouteur avant R1).

### Arborescence cible (R0)

```
backend/src/main/java/fr/zonumental/
├─ ZonumentalApplication.java          @EnableAsync @EnableScheduling
├─ commun/      package-info.java, ErreurMetier, GestionErreurs, HorlogeConfig
├─ compte/      package-info.java, CompteSupprime            (API publique du module)
│  ├─ utilisateur/   Utilisateur, UtilisateurRepository, Email (normalisation)
│  ├─ inscription/   InscriptionController, InscriptionService, DemandeInscription
│  ├─ jeton/         Jeton, JetonRepository, Jetons (émission, consommation)
│  ├─ verification/  VerificationEmailController
│  ├─ session/       SecuriteConfig, JwtConfig, AuthController, Sessions, Session,
│  │                 SessionRepository, TentativesConnexion, CookieSession
│  ├─ motdepasse/    MotDePasseController, MotDePasseService
│  ├─ consentement/  Consentement, ConsentementRepository, ConsentementController, VersionsLegales
│  ├─ donnees/       ProfilController (moi), ExportController, SuppressionService, PurgeComptes, Inactivite
│  └─ courriel/      Courriels (+ resources/courriels/*.txt)
├─ catalogue/   package-info.java
│  ├─ monument/      Monument, Ville, MonumentRepository, VilleRepository, MonumentController, TypeMonument, Rarete
│  └─ importation/   ImportCatalogueRunner, ImportCatalogue, QuotasCatalogue (@ConfigurationProperties),
│                    SelectionCatalogue (logique pure), SourceMonuments (+ SourceWikimedia)
├─ capture/     package-info.java
└─ progression/ package-info.java
backend/src/main/resources/
├─ application.yml, catalogue-quotas.yml, courriels/*.txt
└─ db/migration/V1__socle.sql, V2__compte.sql, V3__catalogue.sql …
```

Les noms de classes sont indicatifs ; la règle (sous-package = fonctionnalité, pas de couche) ne l'est pas.

## 2. Flux principaux

**Inscription (r0-socle-6)** : `POST /api/compte/inscription` → validation (champs, âge ≥ 15 ans à la date Europe/Paris, CGU et confidentialité acceptées avec la version courante, pseudo libre) → si l'e-mail existe : rien n'est créé, e-mail « tu as déjà un carnet » au titulaire → sinon : utilisateur + 4 lignes de consentement + jeton de vérification, en une transaction → après commit, e-mail de vérification (asynchrone) → `202` identique dans les deux cas. L'utilisateur n'est **pas** connecté : écran « vérifie ton e-mail » (r0-socle-16).

**Vérification (r0-socle-7)** : lien `/verifier-email?jeton=…` (front) → `POST /api/compte/email/verification {jeton}` (public) → `204` | `410 jeton-expire` | `409 jeton-deja-utilise` | `400 jeton-invalide`. Renvoi : `POST /api/compte/email/verification/renvoi {email}` (public, `202` toujours).

**Connexion (r0-socle-8, -9)** : `POST /api/auth/connexion` → bloqué ? `429` → mot de passe (Argon2id, hash factice si e-mail inconnu) → échec : compteur, `401 identifiants-invalides` → compte en suppression : `409 suppression-en-cours` → succès : ligne supprimée du compteur, session créée, `200 {jetonAcces, expireDans}` + cookie `zonumental_session`.
**Renouvellement** : `POST /api/auth/renouvellement` (cookie) → session valide et compte actif → nouveau JWT + cookie prolongé de 30 jours ; sinon `401 session-expiree` + cookie effacé. Le front l'appelle au démarrage et sur `401`.
**Déconnexion** : `POST /api/auth/deconnexion` → session supprimée, cookie effacé, `204` (idempotent).

**Suppression (r0-socle-14)** : `POST /api/compte/suppression` → demande datée, sessions révoquées, e-mail → `202 {suppressionDefinitiveLe}`. Purge nocturne, une transaction par compte, publication de `CompteSupprime`. Annulation : `POST /api/compte/suppression/annulation {email, motDePasse}` → comme une connexion réussie.

**Import (r0-socle-18 à -20)** : lecture et validation du yml → lectures réseau (aucune écriture) → `SelectionCatalogue` (places libres, numéros, rareté) → une transaction sous verrou consultatif → journal de synthèse → arrêt de l'appli.

## 3. Modèle de données R0

Schéma `compte` :

| Table | Colonnes (type, contrainte) | Notes |
| --- | --- | --- |
| `utilisateur` | `id uuid PK`, `email text NOT NULL UNIQUE` (normalisé : trim + minuscules), `pseudo text NOT NULL`, `mot_de_passe_hash text NOT NULL`, `date_naissance date NOT NULL`, `email_verifie_le timestamptz NULL`, `cree_le timestamptz NOT NULL`, `derniere_activite_le timestamptz NOT NULL`, `suppression_demandee_le timestamptz NULL`, `avertissement_inactivite_le timestamptz NULL` | index unique `lower(pseudo)` ; `CHECK (pseudo ~ '^[A-Za-z0-9_-]{3,20}$')` |
| `consentement` | `id bigint identity PK`, `utilisateur_id uuid FK ON DELETE CASCADE`, `type text CHECK IN (CGU, CONFIDENTIALITE, CLASSEMENT, EMAILS)`, `accorde boolean`, `version_texte text`, `horodatage timestamptz` | ajout seul ; index `(utilisateur_id, type, horodatage DESC)` |
| `jeton` | `id bigint identity PK`, `utilisateur_id uuid FK CASCADE`, `usage text CHECK IN (VERIFICATION_EMAIL, REINITIALISATION_MDP)`, `empreinte bytea UNIQUE` (SHA-256), `cree_le`, `expire_le`, `utilise_le NULL` | |
| `session` | `id bigint identity PK`, `utilisateur_id uuid FK CASCADE`, `empreinte bytea UNIQUE` (SHA-256), `cree_le`, `derniere_utilisation_le`, `expire_le` | index `utilisateur_id` |
| `tentative_connexion` | `empreinte_email bytea PK` (HMAC), `echecs int`, `bloque_jusqu_au timestamptz NULL`, `derniere_tentative_le timestamptz` | sans lien avec `utilisateur` (adresses inexistantes) |

Schéma `catalogue` :

| Table | Colonnes | Notes |
| --- | --- | --- |
| `ville` | `code_insee text PK`, `nom text NOT NULL`, `quota int NOT NULL CHECK (quota >= 0)` | quota recopié du yml à chaque import (traçabilité, §5) |
| `monument` | `numero int PK`, `wikidata_id text UNIQUE NOT NULL`, `merimee_id text NULL`, `nom text NOT NULL`, `type text NOT NULL`, `ville_code_insee text FK ville`, `latitude double precision`, `longitude double precision`, `position geography(Point,4326) GENERATED … STORED` (index GiST), `rayon_capture_m int NOT NULL DEFAULT 150 CHECK (50..500)`, `rarete text CHECK IN (COMMUN, RARE, LEGENDAIRE)`, `popularite bigint NOT NULL`, `annee int NULL`, `style text NULL`, `hauteur_m numeric(6,1) NULL`, `histoire_texte text NULL`, `histoire_source_url text NULL`, `histoire_licence text NULL`, `image_url text NULL`, `image_source_url text NULL`, `image_licence text NULL`, `image_licence_url text NULL`, `image_auteur text NULL`, `cree_le`, `mis_a_jour_le` | `CHECK (image_url IS NULL OR image_licence IS NOT NULL)`, idem pour l'histoire |

Pas de table d'événements en R0 (registre Modulith ajouté en R1, ADR 0008).

## 4. Configuration (variables d'environnement, `.env.example` par devops)

`SPRING_DATASOURCE_URL/USERNAME/PASSWORD`, `ZONUMENTAL_JWT_SECRET` (≥ 32 octets, base64), `ZONUMENTAL_HMAC_SECRET`, `SPRING_MAIL_HOST/PORT/USERNAME/PASSWORD`, `ZONUMENTAL_MAIL_EXPEDITEUR`, `ZONUMENTAL_FRONT_URL` (liens des e-mails), `ZONUMENTAL_CORS_ORIGINES` (vide si même origine), `ZONUMENTAL_LEGAL_VERSION_CGU`, `ZONUMENTAL_LEGAL_VERSION_CONFIDENTIALITE`. Durées `zonumental.compte.*` (`Duration`) avec les valeurs validées par défaut : vérification 24 h, réinitialisation 1 h, session 30 j, blocage 15 min / 5 échecs, suppression 30 j, inactivité 3 ans + 30 j.

## 5. Plan technique par story

Chaque story est déléguée à `dev-backend` en TDD. Revue `tech-lead-back` obligatoire pour : -1 (pom, Modulith), -6, -8, -9, -10, -14 (auth, données), toutes les migrations.

### r0-socle-1 — Projet backend et garde-fous
- **Fichiers** : `backend/` généré depuis start.spring.io (Boot 4.1.1, Java 25, Maven, dépendances : web, validation, security, oauth2-resource-server, data-jpa, flyway, postgresql, mail, actuator, modulith, testcontainers) ; ajouter `flyway-database-postgresql`, `bcprov-jdk18on`, springdoc ; Maven Wrapper 3.3.4 / Maven 3.9.16 ; plugins Spotless (google-java-format), Checkstyle (config Google allégée, échec sur erreur), JaCoCo (`check` ≥ 80 % sur `fr.zonumental.*` hors `*Config`, `*Application`, DTO).
- `package-info.java` des 5 modules avec `@ApplicationModule(allowedDependencies=…)` (ADR 0002) ; `ModulesTest` (`ApplicationModules.verify()`) ; `V1__socle.sql` (extension `postgis`, schémas `compte`, `catalogue`).
- Sécurité minimale : tout est authentifié sauf `/api/health/**` (la chaîne complète arrive en -8).
- Test d'intégration de base : contexte Spring + Testcontainers PostGIS, `GET /api/health` = 200 sans jeton.
- **Critère « un module qui lit les tables d'un autre fait échouer le build »** : démontré par un test qui vérifie qu'un accès d'un module à un type interne d'un autre est rejeté (module de test factice dans `src/test`), pas en laissant du code fautif.
- **Risques** : Docker absent en CI (vérifier le runner) ; Checkstyle Google brut trop bavard → partir de la config Google, indentation alignée sur google-java-format.

### r0-socle-4 — Contrat OpenAPI et client généré (côté backend)
- springdoc 3.1.1, `springdoc.api-docs.version=openapi_3_1`, `springdoc.show-actuator=true` limité à `health`.
- Test `ContratOpenApiTest` : récupère `/v3/api-docs.yaml` et le compare (après normalisation JSON) à `docs/api/openapi.yaml` ; échec = contrat désynchronisé. Avec `-Dcontrat.ecrire=true`, le test réécrit le fichier (commit du diff dans la PR).
- **Méthode** (alignée sur l'ADR 0014 du front) : le contrat se modifie **d'abord** dans `docs/api/openapi.yaml`, validé par les deux tech leads ; le code doit ensuite produire exactement ce contrat. Seule exception : au premier alignement, les écarts purement cosmétiques de springdoc (ordre, formulation) sont repris dans le fichier.
- Annotations : `@Tag`, `@Operation(operationId=…)` sur chaque endpoint (les `operationId` du premier jet sont repris tels quels pour stabiliser le client généré).
- **Risque** : springdoc rend mal certaines constructions OpenAPI 3.1 du premier jet (`type: [x, 'null']`, `oneOf` avec `null`) ; il faudra peut-être des annotations `@Schema` ou simplifier le fichier, en accord avec le front.

### r0-socle-6 — Inscription
- Packages : `compte.utilisateur`, `compte.inscription`, `compte.consentement`, `compte.jeton`, `compte.courriel`. Migration `V2__compte.sql` (tables `utilisateur`, `consentement`, `jeton`, `session`, `tentative_connexion`).
- Endpoint : `POST /api/compte/inscription` → `202`. Erreurs : `400 validation`, `422 age-minimum`, `422 consentement-obligatoire`, `409 version-texte-obsolete`, `409 pseudo-deja-pris`.
- Règles : âge via `Clock` (Europe/Paris), `naissance.plusYears(15) ≤ aujourd'hui` (un 29 février donne le 28 février) ; date future → `422 age-minimum` ; e-mail normalisé ; mot de passe NFC, 12-128 ; Argon2id ; course sur le pseudo ou l'e-mail : la contrainte unique tranche (`DataIntegrityViolation` traduite en `409 pseudo-deja-pris` ou en `202` générique pour l'e-mail).
- Refus (âge, consentements) : rien persisté, rien journalisé de la demande.
- Tests : les 8 critères ; un test vérifie que la colonne hash commence par `$argon2id$`.
- **Risque** : fuite d'existence par le temps de réponse (création + hash vs rien) → on calcule le hash Argon2 dans les deux cas.

### r0-socle-7 — Vérification de l'e-mail
- `compte.verification`, réutilise `compte.jeton`. Endpoints : `POST /api/compte/email/verification` (public), `POST /api/compte/email/verification/renvoi` (public, `202`). État exposé : `emailVerifie` dans `GET /api/compte/moi`.
- Renvoi : supprime les jetons de vérification non utilisés, en émet un nouveau (anti-rafale 60 s). Compte déjà vérifié ou e-mail inconnu : `202` sans envoi.
- **Risque** : le lien est ouvert par les scanners anti-spam des messageries ; comme la vérification est un `POST` déclenché par la page Angular, un simple `GET` du lien ne consomme pas le jeton.

### r0-socle-8 — Connexion, déconnexion, session
- `compte.session` : `SecuriteConfig` (chaîne unique : routes publiques listées, tout le reste authentifié, resource server JWT, CORS depuis la configuration, CSRF désactivé + contrôle `Origin` sur `/api/auth/*`, en-têtes Spring Security par défaut + `Cache-Control: no-store`), `JwtConfig` (encodeur/décodeur HS256), `Sessions`, `CookieSession`.
- Endpoints : `POST /api/auth/connexion`, `POST /api/auth/renouvellement`, `POST /api/auth/deconnexion`, `GET /api/compte/moi` (page protégée de démonstration).
- Le renouvellement refuse un compte en suppression ; met à jour `derniere_activite_le` (au plus une fois par jour).
- Tests : expiration du JWT (horloge décalée), session 5 j OK / 31 j KO, déconnexion qui invalide le cookie, attributs du cookie.
- **Risques** : `SameSite=Strict` impose le même site front/API (point d'accord) ; jeton d'accès encore valable 15 min après déconnexion (accepté, ADR 0004).

### r0-socle-9 — Limitation des tentatives
- `compte.session.TentativesConnexion` : upsert atomique sur `tentative_connexion`, clé HMAC de l'e-mail normalisé ; `429 connexion-bloquee` + en-tête `Retry-After` (secondes) ; nettoyage nocturne des lignes de plus de 24 h.
- Le compteur s'applique aussi à `POST /api/compte/suppression/annulation`.
- Tests : 5 échecs puis bon mot de passe refusé, accepté après 15 min (horloge), succès au 4e qui remet à zéro, adresse inexistante bloquée pareil.
- **Risque** : 20 requêtes parallèles peuvent passer le contrôle avant l'incrément ; l'incrément atomique borne l'écart à la concurrence d'un instant. Limitation par IP au proxy en complément.

### r0-socle-10 — Mot de passe oublié
- `compte.motdepasse`. Endpoints : `POST /api/compte/mot-de-passe/oubli {email}` → `202` ; `POST /api/compte/mot-de-passe/reinitialisation {jeton, nouveauMotDePasse}` → `204` | erreurs `jeton-*`, `400 validation`.
- Réussite : nouveau hash, jeton marqué utilisé, **toutes les sessions supprimées**, compteur de tentatives remis à zéro.
- **Risque** : jeton d'accès encore valable 15 min (ADR 0004).

### r0-socle-11 — Consentements facultatifs
- `compte.consentement`. Endpoints : `GET /api/compte/consentements`, `PUT /api/compte/consentements {classement, emails}` → état courant. N'ajoute une ligne que pour une valeur qui change. CGU et confidentialité ne se retirent pas ici (le retrait = suppression du compte).
- « Plus d'e-mail non indispensable » : R0 n'envoie que des e-mails indispensables, donc rien à filtrer. Règle pour la suite : tout futur e-mail non indispensable vérifie le consentement `EMAILS` avant envoi (à rappeler en revue).

### r0-socle-12 — Pages légales (côté backend)
- Rien d'autre que les versions courantes en configuration et leur contrôle à l'inscription (`409 version-texte-obsolete`). Les textes sont servis par le front (point d'accord).

### r0-socle-13 — Export
- `compte.donnees.ExportController` : `GET /api/compte/export` → `application/zip` (`Content-Disposition: attachment`), `donnees.json` (profil, consentements datés, `captures: []`), produit avec `java.util.zip` en flux.
- Tests : lecture du zip, absence de `mot_de_passe`, de jetons, de toute clé `latitude`/`longitude`.

### r0-socle-14 — Suppression et annulation
- `compte.donnees.SuppressionService`, `PurgeComptes` (`@Scheduled(cron = "0 0 3 * * *", zone = "Europe/Paris")`). Endpoints : `POST /api/compte/suppression` → `202 {suppressionDefinitiveLe}` ; `POST /api/compte/suppression/annulation` → `200` comme la connexion.
- Purge : une transaction par compte, suppression en cascade dans le schéma `compte`, `ApplicationEventPublisher.publishEvent(new CompteSupprime(id))`.
- Tests : connexion refusée pendant le délai, annulation, purge à J+30 (horloge), pseudo/e-mail réutilisables après purge, purge relancée sans effet, test `@ApplicationModuleTest` vérifiant la publication de l'événement (`PublishedEvents`).
- **Risque** : sans écouteur en R0 la garantie de rejeu n'est pas testée ; elle arrive avec le registre d'événements en R1.

### r0-socle-15 — Inactivité (pour mémoire)
- `compte.donnees.Inactivite`, même tâche nocturne, colonnes déjà prévues dans `V2`. Durées en propriétés.

### r0-socle-18 — Import avec quotas
- `catalogue.importation` + `catalogue.monument` ; migration `V3__catalogue.sql`. `catalogue-quotas.yml` (contenu amoa). Lecture des sources derrière une interface `SourceMonuments` (une implémentation Wikimedia avec `RestClient`) pour tester l'import en intégration avec des données figées.
- Tests : `SelectionCatalogue` en JUnit pur (quota, égalité alphabétique, ville sous-dotée, Lyon 10 → 12, quota diminué) ; import en Testcontainers avec une source factice (rejeu identique, rayon conservé, rayon surchargé, monument disparu conservé) ; client Wikimedia testé sur des réponses JSON enregistrées (`src/test/resources/wikimedia/`).
- **Risques** : disponibilité et limites de débit de `query.wikidata.org` (timeout 60 s, une requête par ville) ; qualité des résultats (stations de métro ou statues classées MH très consultées) → revue humaine du premier import ; critère d'éligibilité à valider par le client.

### r0-socle-19 — Numéros et rareté
- Dans `SelectionCatalogue` : numérotation `max + 1` par popularité décroissante ; rareté par rang avec arrondi demi vers le haut ; existants intouchés.
- Tests : 120 monuments → 6 / 24 / 90 ; ajout après 118 → n° 119 ; n° 5 absent des sources → jamais réattribué ; second import → rareté des existants inchangée.

### r0-socle-20 — Sources, licences, stats
- Correspondance des licences Commons, nettoyage HTML de l'auteur, règles « pas de licence = pas d'image », année seulement si précision ≥ année, hauteur seulement en mètres.
- Endpoints de lecture : `GET /api/catalogue/monuments` (résumés, ~120 éléments sans pagination), `GET /api/catalogue/monuments/{numero}` (fiche complète). Authentifiés (RG-001). Les stats inconnues sont `null` (le front affiche « — »).
- **Risque (R1)** : la section histoire sera verrouillée tant que le monument n'est pas capturé ; en R0 elle est renvoyée. Le contrat la déclare déjà nullable. En R1, l'information « capturé » viendra de `capture` : la fiche enrichie devra être servie par `capture` (qui dépend de `catalogue`), pas par `catalogue`.

## 6. Points d'attention transverses

- **Même origine** front/API derrière le reverse proxy : simplifie CORS et rend `SameSite=Strict` fiable. À confirmer avec front et devops.
- **CSP et en-têtes HTML** : posés par le serveur qui sert le front (proxy) ; l'API garde les en-têtes Spring Security par défaut.
- **Limitation de débit par IP** (inscription, oubli, connexion, renvoi) : au proxy.
- Section Backend de `docs/ARCHITECTURE.md` (référencé par `CLAUDE.md`, inexistant) : un index pointant vers ce document et vers `frontend.md` est à créer par `scribe`.


## Réconciliation avec le front (2026-10-19)

- `ErreurChamp.code` est une liste fermée : `obligatoire`, `format`, `trop-court`, `trop-long`, `date-invalide`.
- `MonumentResume.image` est toujours présent dans la réponse (`null` si aucune image).
- Santé sous `/api/health` (voir ADR 0009, révision).
- Liste du catalogue : en-têtes `ETag` et `Cache-Control: no-cache` (réponse `304` si inchangée).
- Images de référence servies depuis notre origine (copie dans le stockage S3 à l'import), jamais depuis upload.wikimedia.org (RGPD et CSP `img-src 'self'`), avant R1.
