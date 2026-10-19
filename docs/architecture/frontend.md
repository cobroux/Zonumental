# Architecture frontend — R0 « Socle »

**Statut :** proposé par `tech-lead-front` le 2026-10-19, à relire avec `tech-lead-back` (contrat, section 6) et `devops` (même origine, CSP).
**Décisions :** ADR [0010](../adr/0010-front-angular-22-node-24.md) à [0019](../adr/0019-front-tests-i18n.md). **Back :** [`backend.md`](backend.md), ADR 0001 à 0009. **Contrat :** [`docs/api/openapi.yaml`](../api/openapi.yaml).

## 1. Vue d'ensemble

| Sujet | Choix | ADR |
| --- | --- | --- |
| Framework | Angular 22.2.x zoneless, standalone, TypeScript 6.0.x, Node 24 LTS | 0010 |
| PWA | `@angular/service-worker`, manifeste, API jamais en cache ; Capacitor plus tard sans code anticipé | 0011 |
| Organisation | `features/<f>` + `shared/` (DS) + `core/` (session, client d'API), frontières vérifiées par `eslint-plugin-boundaries` | 0012 |
| État, formulaires, routes | signals, Signal Forms, `loadChildren` par fonctionnalité, gardes `canMatch` | 0013 |
| Client d'API | `ng-openapi-gen` depuis `docs/api/openapi.yaml`, non versionné, régénéré à chaque build | 0014 |
| Session et sécurité | jeton d'accès en mémoire, cookie `zonumental_session`, même origine, CSP stricte | 0015 |
| Design system | tokens CSS natifs, polices auto-hébergées, composants sur éléments natifs | 0016 |
| Encre, papier, mouvement | grain papier statique, filtre d'encre seulement sur les tampons immobiles (R1), `prefers-reduced-motion` | 0017 |
| Accessibilité | WCAG 2.2 AA, axe à 0 violation, revue clavier et lecteur d'écran | 0018 |
| Tests et i18n | Vitest + TestBed, Playwright + axe + GPS simulé sur la pile complète ; français seul, sans framework i18n | 0019 |

```
 Navigateur / PWA installée ── https://<domaine>/ ──► reverse proxy (devops)
   Angular (bundle statique + ngsw)                   ├─ /        → fichiers du front (nginx), CSP, Referrer-Policy
   jeton d'accès en mémoire                           └─ /api/*   → Spring Boot
   cookie zonumental_session (httpOnly, Path=/api/auth) envoyé seulement à /api/auth/*
```

## 2. Arborescence cible (R0)

```
frontend/
├─ .nvmrc  (24)   package.json   angular.json   ng-openapi-gen.json   proxy.conf.json
├─ eslint.config.js   .prettierrc   .prettierignore (src/app/core/api)
├─ public/  manifest.webmanifest, icons/*, icons.svg (sprite), textures/papier.webp
├─ e2e/  playwright.config.ts, outils/ (boîte e-mail, axe), compte/*.spec.ts, onboarding/*.spec.ts, legal/*.spec.ts
└─ src/
   ├─ index.html (lang="fr"), main.ts, styles.css (importe shared/styles)
   └─ app/
      ├─ app.ts|html|css        coque : lien d'évitement, <main>, focus sur le h1 après navigation, bandeau de mise à jour
      ├─ app.config.ts          provideRouter, provideHttpClient(withInterceptors), provideAppInitializer, LOCALE_ID fr-FR, service worker
      ├─ app.routes.ts          redirection de « / », loadChildren des fonctionnalités
      ├─ core/
      │  ├─ api/                GÉNÉRÉ (ignoré par git)
      │  ├─ session/            session.ts, jeton.interceptor.ts, gardes.ts, retour.ts (+ spec)
      │  └─ legal/versions.ts   VERSION_CGU, VERSION_CONFIDENTIALITE
      ├─ shared/
      │  ├─ styles/             tokens.css, base.css (reset, typographie, focus, mouvement réduit)
      │  ├─ ui/                 bouton/, champ/, date-naissance/, case/, interrupteur/, message/, ecran/
      │  └─ util/               erreur-api.ts (lecture d'un Problem Details), telechargement.ts
      └─ features/
         ├─ onboarding/         onboarding.routes.ts, bienvenue/, localisation/
         ├─ compte/             compte.routes.ts, messages.ts, inscription/, verifie-ton-email/, verifier-email/,
         │                      connexion/, mot-de-passe-oublie/, reinitialiser-mot-de-passe/, profil/,
         │                      suppression/, carnet-supprime/
         ├─ legal/              legal.routes.ts, cgu/, confidentialite/, mentions-legales/
         └─ design-system/      design-system.routes.ts, demo/   (route déclarée seulement si isDevMode())
```

## 3. Flux d'authentification côté client

```
Démarrage ─► provideAppInitializer ─► POST /api/auth/renouvellement (cookie)
               200 {jetonAcces} → session.connecte = true        401 / réseau → anonyme
            ─► 1re navigation : gardes canMatch (connecteGuard / inviteGuard)

Requête /api/** ─► intercepteur : Bearer si jeton en mémoire (jamais pour /api/auth/** ni pour une autre origine)
   ├─ 2xx → écran
   └─ 401 et la requête portait un Bearer
         ─► renouvellement unique partagé ─► OK : rejoue la requête une fois
                                           └► KO : session vidée → /connexion?retour=<url>

Connexion   POST /api/auth/connexion {email, motDePasse}
   200 → jeton en mémoire → navigateByUrl(retour validé ou « / »)
   401 identifiants-invalides → « E-mail ou mot de passe incorrect »
   429 connexion-bloquee (Retry-After) → « Trop d'essais. Réessaie dans N min. »
   409 suppression-en-cours → choix : « Annuler la suppression et me connecter » → POST /api/compte/suppression/annulation
Déconnexion POST /api/auth/deconnexion → location.assign('/bienvenue')
```

`retour` n'est accepté que s'il commence par `/` et pas par `//`. Sinon, on va sur `/`.

## 4. Routes R0

| Route | Fonctionnalité | Accès | Écran (un écran = un job) | Story |
| --- | --- | --- | --- | --- |
| `/` | app | — | redirection : connecté → `/localisation` si l'écran n'a pas été traité sur l'appareil, sinon `/profil` ; anonyme → `/bienvenue` | -8, -16 |
| `/bienvenue` | onboarding | invité | promesse du jeu en une phrase, « Créer mon carnet », « J'ai déjà un carnet » | -16 |
| `/inscription` | compte | invité | « Crée ton carnet » (2 étapes, voir -6) | -6, -16 |
| `/inscription/verifie-ton-email` | compte | public | « Vérifie ton e-mail » + renvoi | -7, -16 |
| `/verifier-email?jeton=` | compte | public | résultat de la vérification (lien de l'e-mail, ADR 0004) | -7 |
| `/connexion?retour=` | compte | invité | connexion, blocage, annulation de suppression | -8, -9, -14 |
| `/mot-de-passe-oublie` | compte | invité | demande du lien | -10 |
| `/reinitialiser-mot-de-passe?jeton=` | compte | public | nouveau mot de passe (lien de l'e-mail, ADR 0004) | -10 |
| `/localisation` | onboarding | connecté | explication + demande système | -17 |
| `/profil` | compte | connecté | consentements, mes données, liens légaux, déconnexion | -8, -11, -13 |
| `/profil/suppression` | compte | connecté | confirmation explicite de la suppression | -14 |
| `/carnet-supprime?le=` | compte | public | « Ton carnet sera supprimé le … ; reconnecte-toi avant pour annuler » | -14 |
| `/legal/cgu`, `/legal/confidentialite`, `/legal/mentions-legales` | legal | public | texte versionné | -12 |
| `/design-system` | design-system | dev uniquement | démonstration des composants + appel de santé | -3, -4 |
| `**` | app | — | page « Introuvable » simple avec un lien vers `/` | -2 |

« invité » : `inviteGuard` (un explorateur connecté est renvoyé sur `/`). « connecté » : `connecteGuard` (`/connexion?retour=`). « public » : aucune garde. Sont publics Bienvenue et les pages légales (RG-001), plus les pages techniques de lien d'e-mail et de fin de suppression, qui n'ont aucun sens derrière une connexion.

## 5. Parcours d'onboarding R0 (à valider, voir 7.1)

```
Bienvenue ─► Crée ton carnet (étape 1 : pseudo, e-mail, mot de passe ; étape 2 : naissance, consentements)
   ─► 202 ─► Vérifie ton e-mail (renvoi possible)
   ─► clic sur le lien ─► E-mail confirmé ─► Connexion
   ─► 1re connexion sur l'appareil ─► Localisation (3 engagements) ─► demande système ─► Profil (R0) / Explorer (R1)
```

L'inscription **n'ouvre pas de session** : le back répond `202` de la même façon, que l'e-mail existe ou non (RG-004, ADR 0004). Sinon, l'ouverture d'une session révélerait que l'adresse était libre. L'explorateur se connecte donc une fois après l'inscription. Il peut le faire avant d'avoir cliqué le lien : l'exploration reste possible sans e-mail vérifié (Q-10).

## 6. Plan technique par story

Chaque story est déléguée à `dev-frontend` en TDD. **Revue `tech-lead-front` obligatoire** pour -2 (configuration, frontières), -3 (tokens, composants), -4 (génération) et -8 (session, intercepteur, gardes). Les autres passent par `qa`. Chaque écran a son test axe (0 violation) et un test « tient sans défilement à 360 × 740, clavier fermé ». Ce dernier est un objectif mesuré, pas une contrainte CSS (ADR 0018).

### r0-socle-2 — Projet Angular PWA et garde-fous
- `ng new frontend --style=css --ssr=false --routing` : zoneless et Vitest sont les choix par défaut du CLI 22 (ADR 0010). Puis `ng add @angular/pwa` et `ng add angular-eslint`, ajout de `eslint-plugin-boundaries` et Prettier.
- Configuration : `.nvmrc`, `engines`, alias `@core/*` `@shared/*` `@features/*`, `proxy.conf.json`, budgets `angular.json` (initial : alerte 300 kB, erreur 500 kB), `inlineCritical: false`, `ngsw-config.json` (sans `dataGroups`, `navigationUrls` sans `/api/**`), `.prettierignore` (`src/app/core/api`). Règles ESLint : frontières (ADR 0012), `prefer-on-push-component-change-detection`, `no-restricted-properties` sur `bypassSecurityTrust*`, règles du template angular-eslint `accessibility`.
- Coque (`app.ts`) : lien d'évitement, `<main>`, focus sur le `<h1>` après navigation, bandeau `SwUpdate`, page `**`.
- Scripts : `lint`, `format`, `test` (avec couverture et seuils, ADR 0019), `e2e`, `api` (ADR 0014). Le hook `pre-commit` existant appelle déjà `npm run lint` et `prettier --check .`.
- Tests : fixture ESLint (un import entre fonctionnalités fait échouer le lint) ; E2E sur le build de production (`<link rel="manifest">` présent, `navigator.serviceWorker.ready` résolu, manifeste valide).
- **Risques** : l'installabilité n'est vérifiable qu'en HTTPS (en local, `localhost` est accepté) ; sur iOS, il n'y a pas d'invitation d'installation, l'ajout passe par le menu Partager (recette manuelle).

### r0-socle-3 — Design system
- `shared/styles/tokens.css` et `base.css`, polices `@fontsource*` (sous-ensemble latin), composants de `shared/ui` (ADR 0016), page `/design-system` qui affiche chaque composant dans tous ses états (repos, focus, erreur, désactivé, occupé).
- Tests : unitaires sur l'accessibilité des composants (lien `label`/`for`, `aria-describedby` vers l'erreur, `role=switch`, `aria-busy`) ; E2E axe sur `/design-system` ; un test qui vérifie que chaque message d'erreur ou de succès comporte une icône **et** un texte. Le contrôle CI « aucune couleur hexadécimale hors `tokens.css` » remplace le critère « tokens définis une seule fois ».
- Hors périmètre (story) : tampons, silhouettes, NavBar, chip de rareté. Ils sont spécifiés dans l'ADR 0016 et implémentés en R1.
- **Risques** : le logo et les icônes définitives ne sont pas encore livrés par `ux-designer` (on utilise des icônes provisoires conformes à la règle « un seul détail intérieur ») ; la valeur de `--zn-encre-douce` est à fixer, avec au moins 4,5:1.

### r0-socle-4 — Client généré (côté client)
- `ng-openapi-gen.json`, script `api` appelé en `postinstall`, `prebuild`, `pretest`, `prelint` et `prestart` ; `src/app/core/api/` dans `.gitignore`.
- `/design-system` appelle l'endpoint de santé via le client généré et affiche « API : en ligne / injoignable ».
- Test : un test unitaire (`HttpTestingController`) vérifie que l'appel passe par le service généré ; la CI fait `npm ci && ng build`, ce qui fait échouer la compilation si le contrat casse un usage.
- **Risque** : l'endpoint de santé est sous `/actuator`, hors `/api` (voir 7.2, point 3).

### r0-socle-6 — Inscription (`/inscription`)
- Un composant, un modèle Signal Forms et **deux étapes** dans la même route (signal `etape`) : (1) pseudo, e-mail, mot de passe ; (2) date de naissance (3 champs), case « J'accepte les CGU et la politique de confidentialité » (liens vers `/legal/*` ouverts dans le même onglet, avec retour par le bouton précédent), « Apparaître au classement » et « Recevoir des e-mails » décochées. Une seule requête à la fin. Le découpage est **à valider par `ux-designer`** : en un seul écran, le formulaire ne tient pas sans défilement avec le clavier ouvert.
- Validations côté client (confort uniquement) : pseudo `^[A-Za-z0-9_-]{3,20}$` (même règle que la contrainte SQL du back), mot de passe de 12 à 128 caractères avec un compteur, âge ≥ 15 ans calculé à la date du jour à Europe/Paris (`Intl.DateTimeFormat` avec `timeZone: 'Europe/Paris'`), date future ou invalide refusée.
- Envoi : `inscrire` avec `consentements: { cgu: true, confidentialite: true, versionCgu, versionConfidentialite, classement, emails }` (forme du contrat). Les versions viennent de `core/legal/versions.ts`, et la case unique met `cgu` et `confidentialite` à vrai. Sur `202` : `navigateByUrl('/inscription/verifie-ton-email', { state: { email } })`.
- Erreurs : `400 validation` → message sur chaque champ ; `409 pseudo-deja-pris` → champ pseudo, « Ce pseudo est déjà pris, choisis-en un autre » ; `422 age-minimum` → « Il faut avoir au moins 15 ans pour créer un carnet » ; `422 consentement-obligatoire` → case CGU ; `409 version-texte-obsolete` → « Les conditions ont changé » puis rechargement de la page (nouvelle version du front).
- Tests : bornes d'âge (15 ans aujourd'hui accepté, 15 ans demain refusé, 29 février), mot de passe de 11 caractères refusé, 12 caractères avec accents et espaces accepté, cases facultatives décochées par défaut, envoi impossible sans CGU, correspondance de chaque code d'erreur ; E2E R0-01 à R0-07.
- **Risque** : le mot de passe reste en mémoire jusqu'à la navigation, ce qui est normal ; il ne doit jamais apparaître dans un journal ni dans l'état du routeur.

### r0-socle-7 — Vérification de l'e-mail
- `/inscription/verifie-ton-email` : e-mail repris depuis `history.state` (3.3.7). Sans état (page rechargée) : champ e-mail. « Renvoyer le lien » → `renvoyerVerification` → `202` → `role="status"` « Si un carnet existe pour cette adresse, un nouveau lien vient de partir ». Lien « Me connecter ».
- `/verifier-email?jeton=` : à l'ouverture, on lit le jeton, on le retire de l'URL, puis `POST` ; un `GET` du lien par un scanner anti-spam ne consomme donc rien (ADR 0004). États : `204` « E-mail confirmé » ; `410 jeton-expire` « Ce lien a expiré » + champ e-mail + renvoi ; `409 jeton-deja-utilise` « Ce lien a déjà servi : ton e-mail est sans doute déjà confirmé » ; `400 jeton-invalide` « Ce lien n'est plus valide » + renvoi. Action suivante : « Continuer » si connecté, sinon « Me connecter ».
- Tests : chaque état ; E2E R0-08, R0-09 avec le lien récupéré dans la boîte de test.
- **Risque** : le lien est ouvert dans le navigateur par défaut, et pas dans la PWA installée. Le parcours doit donc fonctionner sans session, ce qui est le cas.

### r0-socle-8 (+ -9) — Connexion, session, déconnexion
- `core/session/` : `session.ts`, `jeton.interceptor.ts`, `gardes.ts`, `retour.ts`, plus l'initialiseur (ADR 0013, 0015). `/connexion` : e-mail (`autocomplete="username"`), mot de passe (`current-password`, bouton « Afficher »), lien « Mot de passe oublié ».
- Messages : `401` « E-mail ou mot de passe incorrect » ; `429` « Trop d'essais. Réessaie dans N min. » (N calculé depuis `Retry-After`, arrondi à la minute supérieure) ; erreur réseau « Pas de connexion. Réessayer ».
- `/profil` sert de page protégée de démonstration (contenu en -11).
- Tests unitaires : intercepteur (Bearer seulement sur `/api/` hors `/api/auth/`, rien vers une autre origine, un seul renouvellement pour N requêtes 401, aucun renouvellement sur le 401 d'une requête sans Bearer, redirection si le renouvellement échoue), gardes, `retour` (`//evil.com` et `https://…` refusés). E2E : R0-10 (session conservée après rechargement), R0-11, R0-12 (blocage, avec horloge back accélérée ou durée courte en environnement de test), R0-15 (lien profond protégé, puis retour à la page demandée).
- **Risques** : les 30 jours d'inactivité ne se testent pas en E2E, c'est le back qui les teste avec son horloge ; jeton encore valide 15 min après déconnexion (accepté par l'ADR 0004).

### r0-socle-10 — Mot de passe oublié
- `/mot-de-passe-oublie` : e-mail → `202` → message identique dans tous les cas (RG-011).
- `/reinitialiser-mot-de-passe?jeton=` : on lit le jeton et on le retire de l'URL ; nouveau mot de passe (`new-password`, compteur 12 à 128) → `204` → « Mot de passe changé » → `location.assign('/connexion')` pour vider la mémoire (sessions révoquées côté back). Erreurs `jeton-*` comme en -7, avec un lien vers `/mot-de-passe-oublie`.
- Tests : messages identiques ; 11 caractères refusé, 12 acceptés ; E2E R0-13, R0-14.

### r0-socle-11 — Profil et consentements (`/profil`)
- `monCompte` (pseudo, `emailVerifie`) et `mesConsentements` en `resource()`. Deux interrupteurs (« Apparaître au classement », « Recevoir des e-mails »). Au changement : `modifierConsentements` avec les deux valeurs, interrupteur `disabled` + `aria-busy` pendant l'envoi, `role="status"` « Enregistré » ; en cas d'échec, on revient à l'ancienne valeur et on affiche une erreur `role="alert"`. Pas de bouton « Enregistrer » : le retrait prend effet immédiatement (RG-012).
- Sections « Mes données » (Exporter, Supprimer mon carnet → `/profil/suppression`), liens légaux, « Se déconnecter ».
- Tests : bascule, retour arrière en cas d'erreur, pas de double envoi ; E2E R0-16.
- **Risque** : profil, consentements, données et liens doivent tenir dans un écran. Si ce n'est pas le cas, « Mes données » devient une sous-route (décision de `ux-designer`).

### r0-socle-12 — Pages légales
- Trois composants dont le texte est écrit **dans le template** (titres `h1`/`h2` hiérarchisés, pas d'`innerHTML`) ; version affichée en tête (« Version du … ») depuis `core/legal/versions.ts` ; bandeau « Texte provisoire » tant que l'`amoa` n'a pas livré `docs/rgpd/`.
- Tests : accès sans session ; axe ; E2E qui vérifie que la version tamponnée par le back à l'inscription (`consentements[].versionTexte` de `donnees.json` dans l'export) est égale à la version affichée ; navigation au clavier.
- **Risque** : il faut changer la version à deux endroits (front et `ZONUMENTAL_LEGAL_VERSION_*` du back). Un oubli donne `409 version-texte-obsolete` à l'inscription, et le test E2E le détecte.

### r0-socle-13 — Export
- Bouton « Exporter mes données » dans `/profil` : `exporterMesDonnees` avec `responseType: 'blob'`, nom de fichier lu dans `Content-Disposition`, téléchargement via `shared/util/telechargement.ts` (`URL.createObjectURL`, `<a download>`, `revokeObjectURL`). Bouton occupé pendant la préparation.
- Tests : unitaire du téléchargement (nom, libération de l'URL) ; E2E : le zip contient `donnees.json` sans `motDePasse` ni `latitude`/`longitude`.
- **Risques** : téléchargement de blob dans une PWA iOS installée (feuille de partage) à vérifier en recette ; le zip au lieu du JSON nu est un écart signalé par le back (ADR 0008), il ne change rien côté front.

### r0-socle-14 — Suppression
- `/profil/suppression` : conséquences en clair (tout est effacé sous 30 jours, annulable en se reconnectant d'ici là, e-mail de confirmation), bouton `danger` « Supprimer mon carnet », lien « Garder mon carnet ». Confirmation explicite par cet écran dédié, sans mot de passe (choix du back, ADR 0004, accepté). `202 { suppressionDefinitiveLe }` → `location.assign('/carnet-supprime?le=…')`.
- `/connexion` sur `409 suppression-en-cours` : l'écran affiche « Ton carnet doit être supprimé le … » avec « Annuler la suppression et me connecter » → `annulerSuppression` avec l'e-mail et le mot de passe encore dans le formulaire → `200` = connecté.
- Tests : flux complet ; E2E R0-18 (connexion refusée pendant le délai, annulation).

### r0-socle-16 — Onboarding : Bienvenue, création, vérification
- `/bienvenue` (onboarding) : une phrase, « Créer mon carnet » → `/inscription`, « J'ai déjà un carnet » → `/connexion`. Grain papier et guilloches (ADR 0017), titre en Gloock.
- Enchaînement par URL avec -6 et -7, sans import entre fonctionnalités.
- Tests : E2E du parcours Bienvenue → inscription → vérifie ton e-mail, axe, objectif « sans défilement » à 360 × 740.

### r0-socle-17 — Localisation (`/localisation`)
- Si `navigator.permissions.query({ name: 'geolocation' })` vaut `granted`, on passe directement à `/`. Sinon : les 3 engagements (texte de l'`amoa`), « Activer la localisation », « Plus tard ».
- « Activer » : `navigator.geolocation.getCurrentPosition(() => {}, onRefus, { enableHighAccuracy: false, maximumAge: Infinity, timeout: 10000 })`. **Le résultat est ignoré** : rien n'est conservé, rien n'est envoyé. Refus ou « Plus tard » : un message explique comment l'activer plus tard (réglages du navigateur ou du téléphone), puis « Continuer ». Dans tous les cas, `localStorage zn.localisation = traitee`, puis `/`.
- Tests : unitaires (granted, prompt puis accepté, refusé) ; E2E avec `grantPermissions(['geolocation'])` + `setGeolocation`, et avec un contexte sans permission (refus).
- **Écart technique à signaler** : la story dit « aucune lecture de position, seule l'autorisation est demandée ». Or **aucune API web ne demande l'autorisation de géolocalisation sans lire une position** : `getCurrentPosition` est le seul déclencheur. Le navigateur lit donc une position une fois, et l'application la jette immédiatement. Les engagements (« jamais stockée, jamais envoyée ») restent vrais. La formulation est à confirmer par l'`amoa`.

### Pour mémoire
- r0-socle-9 : aucun écran propre, le message de blocage fait partie de -8.
- r0-socle-15 : aucun écran ; la reconnexion d'un compte averti passe par la connexion normale.
- r0-socle-18 à -20 : aucun écran en R0. Les besoins du carnet et de la fiche (R1) sont écrits en 7.3 pour que l'import produise ce qu'il faut.

## 7. Besoins du front sur le contrat d'API

Réconcilié avec le premier jet du back : `backend.md`, ADR 0004, 0008, 0009 et `docs/api/openapi.yaml` (0.1.0-r0). **J'ai lancé `ng-openapi-gen` 1.1.0 sur ce fichier** : 22 modèles et 4 services sont générés, et les nullables OpenAPI 3.1 (`type: [string, 'null']`) donnent bien `T | null`. L'outil retenu (ADR 0014) convient donc. **Accord** = le front prend tel quel. **Demande** = à trancher avec `tech-lead-back`.

### 7.1 Conventions

| Sujet | Besoin du front | État |
| --- | --- | --- |
| Origine | même origine, API sous `/api` | accord |
| Erreurs | RFC 9457, schéma `Probleme` ; le front ne s'appuie **que** sur `code` (énumération `CodeErreur`) et `erreurs[].champ` / `erreurs[].code` ; les textes affichés sont côté front (`features/<f>/messages.ts`) | accord |
| Codes d'erreur par champ | `ErreurChamp.code` n'est qu'une chaîne avec des exemples. **Demande** : en faire une énumération fermée (`obligatoire`, `format`, `trop-court`, `trop-long`, `date-invalide`), sinon le front ne peut pas garantir un message pour chaque cas | demande |
| 401 | `non-authentifie` / `session-expiree` pour le jeton ; `identifiants-invalides` seulement sur les routes publiques (connexion, annulation). Le front ne renouvelle que si la requête portait un Bearer | accord |
| `operationId` | ceux du contrat (`sante`, `connexion`, `renouvellement`, `deconnexion`, `inscrire`, `verifierEmail`, `renvoyerVerification`, `demanderReinitialisation`, `reinitialiserMotDePasse`, `monCompte`, `mesConsentements`, `modifierConsentements`, `exporterMesDonnees`, `demanderSuppression`, `annulerSuppression`, `listerMonuments`, `lireMonument`), figés, et repris par springdoc (`backend.md`, r0-socle-4) | accord |
| Dates | `date` pour `dateNaissance` ; `date-time` pour `suppressionDefinitiveLe` (le front affiche la date seule, en Europe/Paris) | accord |
| Valeurs inconnues | `null` explicite. **Demande** : `MonumentResume.image` doit passer en `required` (nullable). Il est aujourd'hui facultatif, et le modèle généré donne `image?: Image \| null`, soit deux façons de dire « pas d'image » | demande |
| En-têtes | `Retry-After` (secondes) sur `429 connexion-bloquee` ; `Content-Disposition` sur l'export | accord |
| Cache | `Cache-Control: no-store` sur l'API, sauf la liste du catalogue (voir 7.3) | accord |

### 7.2 Endpoints R0 utilisés par les écrans

| Opération | Écran | Ce que l'écran exploite | Erreurs gérées |
| --- | --- | --- | --- |
| `inscrire` | -6 | `202` sans corps | `400 validation`, `409 pseudo-deja-pris`, `409 version-texte-obsolete`, `422 age-minimum`, `422 consentement-obligatoire` |
| `verifierEmail` | -7 | `204` | `410 jeton-expire`, `409 jeton-deja-utilise`, `400 jeton-invalide` |
| `renvoyerVerification`, `demanderReinitialisation` | -7, -10 | `202` | `400 validation` |
| `connexion`, `annulerSuppression` | -8, -14 | `200 { jetonAcces, expireDans }` + cookie | `401 identifiants-invalides`, `429 connexion-bloquee`, `409 suppression-en-cours` avec `suppressionDefinitiveLe` (présent dans le contrat) |
| `renouvellement`, `deconnexion` | session | `200 { jetonAcces, expireDans }` / `204` | `401 session-expiree` |
| `reinitialiserMotDePasse` | -10 | `204` | `jeton-*`, `400 validation` |
| `monCompte` | -11 | `pseudo`, `emailVerifie` | `401` |
| `mesConsentements`, `modifierConsentements` | -11 | `{ classement, emails }` | `400`, `401` |
| `exporterMesDonnees` | -13 | zip + `Content-Disposition` | `401` |
| `demanderSuppression` | -14 | `202 { suppressionDefinitiveLe }` | `401` |
| `sante` | -4 | `status` | `503` |

**Demande restante sur R0 :** l'endpoint de **santé est déclaré en `/actuator/health`**, hors `/api`. Avec un proxy qui ne route que `/api/*` vers le back, le front ne le joint pas. Je propose `management.endpoints.web.base-path=/api` (soit `/api/health`) : une seule règle de proxy, une seule exclusion dans le service worker. L'alternative est une règle de proxy de plus pour `/actuator/health`, à décider avec `devops`.

### 7.3 Catalogue (pas d'écran en R0, besoins R1 à prendre en compte dès l'import)

- **Pas de pagination** : accord avec le contrat (~120 monuments, une seule liste, de l'ordre de 25 Ko compressés). On ne repaginera que si le catalogue dépasse ~1 000 monuments (release « Monde »). Le carnet « une page = une ville » (Q-17) est un regroupement côté client.
- `MonumentResume` contient déjà `position` et `rayonCaptureMetres` : **accord**. En R1, le front calcule localement les monuments à moins de 2 km et l'état du bouton Tamponner à chaque mise à jour du GPS, sans appel réseau ni envoi de la position. Le serveur reste seul juge à la capture (RG-025, RG-029).
- **Demande** : `ETag` + `Cache-Control: no-cache` sur `listerMonuments` (la liste ne change qu'à l'import, et le `304` est gratuit). Seule exception au `no-store` général.
- `histoire` est `null` tant que le monument n'est pas capturé (R1) : **accord**. C'est indispensable, parce qu'un verrou seulement visuel se contourne en lisant le réseau.
- **Image** : `url` doit pointer vers notre origine (copie dans S3 UE, ADR 0006), pas vers `upload.wikimedia.org`, à cause du RGPD (transfert d'adresse IP) et de la CSP `img-src 'self'`. À arbitrer avant R1, comme le back le signale.
- **Photo noir et blanc d'un monument non capturé (Q-4)** : le front applique `filter: grayscale(1)` sur la même image. C'est un verrou **visuel** : la version couleur reste téléchargeable. Enjeu faible. Si le client veut un vrai verrou, il faudra un dérivé noir et blanc produit à l'import.

## 8. Points ouverts

### 8.1 Décisions qui demandent l'avis du client
1. **Ordre de l'onboarding** (section 5) : pas de session à l'inscription (RG-004), donc une connexion après « vérifie ton e-mail », et l'écran de localisation après la première connexion plutôt que « à la fin de la création du carnet » (r0-socle-17). L'alternative, ouvrir la session à l'inscription, est plus fluide mais révèle l'existence d'une adresse, ce qui contredit RG-004.
2. **« Un écran tient sans défilement »** (§12, RG-045) : objectif de conception au zoom par défaut, pas une contrainte. Au zoom 200 % ou clavier ouvert, l'écran défile (WCAG 1.4.4, 1.4.10). Conséquence : l'inscription en deux étapes.
3. **Ocre `#B07A2A`** : 3,3:1 sur le papier, insuffisant pour écrire « Légendaire » en petit texte. Il faut une variante texte plus sombre (exemple : `#8A5E1E`, 5,0:1) ou un texte ≥ 24 px. À trancher avant R1.
4. **Dossier `core/`** en plus de `features/` et `shared/` (§9), pour la session, le client d'API et les versions légales (ADR 0012).
5. **Localisation en R0** : demander l'autorisation implique une lecture de position par le navigateur, aussitôt jetée (r0-socle-17). Formulation des engagements à confirmer par l'`amoa`.
6. **Traduction** : une langue autre que le français est-elle prévue avant le lancement public (R4) ? Si oui, on balise les textes dès R1 (ADR 0019).
7. **Photo noir et blanc** d'un monument non capturé : verrou visuel (CSS) suffisant, ou vrai dérivé côté serveur ?
8. **Une seule case** « CGU et politique de confidentialité » ou deux cases séparées (la story -6 évoque les deux) ? Recommandation : une case.

### 8.2 Points d'accord avec `tech-lead-back` (et `devops`)
1. Énumération fermée de `ErreurChamp.code` (7.1).
2. `MonumentResume.image` en `required` nullable (7.1).
3. Santé sous `/api` ou règle de proxy pour `/actuator/health` (7.2, avec `devops`).
4. `ETag` sur `listerMonuments` (7.3).
5. Images de référence servies depuis notre origine avant R1 (7.3, ADR 0006).
6. **`devops`** : même origine ; CSP et `Referrer-Policy: no-referrer` (ADR 0015) posés par le serveur du front ; boîte e-mail de test avec API HTTP (Mailpit) dans la pile E2E de la CI (ADR 0019).
7. Index `docs/ARCHITECTURE.md` (référencé par `CLAUDE.md`, inexistant) : à créer par `scribe`, avec un lien vers `backend.md` et `frontend.md` (même demande que le back).

Déjà alignés sans discussion : même origine, cookie `zonumental_session` sans rotation (ce qui rend inutile toute coordination entre onglets), `suppressionDefinitiveLe` dans le `409`, export toujours en zip, suppression sans mot de passe, liens `/verifier-email` et `/reinitialiser-mot-de-passe`, catalogue sans pagination avec positions, histoire `null` tant que le monument n'est pas capturé.
