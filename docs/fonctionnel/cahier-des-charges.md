# Cahier des charges — Zonumental

**Statut :** validé section par section le 2026-10-19 (relecture finale en attente)
**Stack :** Java + Spring Boot (backend) · Angular PWA (frontend)

## 1. Vision

Zonumental est un **Pokédex des monuments** : le joueur visite des monuments, les « capture » avec la caméra de son téléphone et complète sa collection. L'application doit être **fun**, avoir une **vraie identité visuelle** et être mise en ligne publiquement pour être connue.

- **Cible géographique :** la France d'abord, le monde plus tard.
- **Supports :** téléphone en priorité (caméra + GPS), utilisable aussi sur PC et tablette.
- **Stores :** pas de compte Apple au départ → PWA. Publication **Android et iOS obligatoire plus tard** via Capacitor (même code Angular).
- **Budget d'hébergement :** non défini. Tout est conteneurisé (Docker) pour rester indépendant de l'hébergeur.

## 2. Périmètre du catalogue

- **Lancement :** les **10 plus grandes villes de France**, **10 monuments maximum** par ville, **Paris avec un quota plus élevé** (~25-30). Total ~110-120 monuments.
- **Sélection :** les plus touristiques, classés par popularité (vues Wikipédia via Wikidata).
- **Facilement paramétrable :** villes et quotas dans un fichier `catalogue-quotas.yml`. Ajouter une ville ou augmenter un quota = modifier ce fichier et relancer l'import. Pas d'interface d'admin tant que le besoin n'existe pas.
- **Sources :** base Mérimée (ministère de la Culture, open data) + Wikidata/Wikipédia/Wikimedia Commons.

## 3. Fonctionnalités et découpage en releases

Chaque release est livrable et testable seule, et donne un epic dans `.stories/`.

| # | Release | Contenu | Résultat |
| --- | --- | --- | --- |
| R0 | Socle | Comptes (inscription, connexion, vérification email, mot de passe oublié), RGPD (consentements, export, suppression), import du catalogue, **identité visuelle + design system**, CI/CD et déploiement | Une app en ligne, avec son style, où l'on crée un compte |
| R1 | Capturer | Pokédex numéroté avec silhouettes, fiche monument (type, stats), capture photo + GPS, section histoire débloquée | Premier jeu jouable, test terrain |
| R2 | Collectionner | Rareté (Commun / Rare / Légendaire), succès, collections thématiques | Objectifs long terme |
| R3 | Explorer | Carte de France à dévoiler (brouillard levé autour des captures) | Progression visible |
| R4 | Partager | Carte de capture partageable (Instagram, TikTok…) au design soigné | **Lancement public (bêta)** |
| R5 | Progresser | XP, niveaux du joueur, quiz après capture (sur la section histoire) | Rejouabilité |
| R6 | Compétition | Classement des joueurs (opt-in), défis et événements (ex. Journées du patrimoine), signalement de triche | Compétition |
| R7 | Magie | Reconnaissance d'image par IA, cartes « brillantes » en bonus | Effet wow + preuve anti-triche |
| Plus tard | Monde | Ouverture hors de France | — |

### Éléments « fun » validés
- Fiche **numérotée** façon Pokédex, avec un **type** (Château, Religieux, Pont, Phare…) et des **stats** (année, style, hauteur).
- **Silhouettes** des monuments non découverts.
- **Rareté**, **succès**, **collections thématiques** (ex. « Châteaux de la Loire », « Tout Paris »).
- **Carte de France à dévoiler**, **XP et niveaux**, **classement**, **quiz**, **défis et événements**.
- **Section histoire** débloquée à la capture.
- **Carte partageable** : levier principal de viralité.

## 4. Architecture

```
 Angular (PWA installable) — caméra, GPS
            │ HTTPS · API REST JSON · contrat OpenAPI (docs/api/)
 Spring Boot — un seul service découpé en modules
   ├─ compte       (inscription, connexion, RGPD)
   ├─ catalogue    (villes, monuments, quotas, import)
   ├─ capture      (photo + validation GPS)
   └─ progression  (rareté, succès, collections, puis XP, classement)
        │                      │
 PostgreSQL + PostGIS   Stockage objet S3 compatible (UE) pour les photos
```

- **Un seul backend découpé en modules** : un module ne lit jamais les tables d'un autre. Les modules communiquent par appels de service publics ou par événements internes Spring. Vérifié par **Spring Modulith**.
- **Code rangé par fonctionnalité** (pas par couche technique), voir §9.
- **Authentification** : email + mot de passe gérés par Spring Security, jeton d'accès JWT de 15 min, jeton de renouvellement dans un cookie `httpOnly`, `Secure`, `SameSite`. Pas de connexion Google/Apple en V1.
- **Import du catalogue** : tâche qui lit Wikidata + Mérimée, applique `catalogue-quotas.yml` et met à jour la base. Relançable sans effet de bord.
- **Contrat d'API** : publié par springdoc (OpenAPI). Le client Angular est **généré** depuis ce contrat.

## 5. Modèle de données

| Module | Entité | Champs clés |
| --- | --- | --- |
| catalogue | Ville | nom, code INSEE, quota |
| catalogue | Monument | **numéro Pokédex fixe**, nom, type, ville, position GPS (PostGIS), rayon de capture (150 m par défaut, ajustable), rareté, popularité, stats (année, style, hauteur), texte histoire, image de référence, **source et licence** du texte et de l'image, identifiants Wikidata et Mérimée |
| compte | Utilisateur | email, mot de passe chiffré (Argon2id), pseudo, date de naissance déclarée (≥ 15 ans), consentements datés, apparaître au classement (désactivé par défaut) |
| capture | Capture | utilisateur, monument, date, clé de la photo, distance mesurée. **Une seule capture par monument et par joueur** |
| progression | SuccèsObtenu | utilisateur, code du succès, date |

**Règles :**
- **Numéros Pokédex fixes** : attribués une fois, jamais réutilisés. Un nouveau monument prend le numéro suivant.
- **Rareté calculée à l'import, selon la popularité** : les 5 % les plus populaires sont Légendaires, les 20 % suivants Rares, le reste Communs.
- **Succès et collections** : définis dans la config (critères sur le type, la ville ou la région), pas en base. Seul le fait qu'un joueur a obtenu un succès est enregistré.
- XP, niveaux et classements seront modélisés en R5/R6, pas avant.
- **Licences** : les textes Wikipédia sont sous CC BY-SA (citer la source, republier sous la même licence). Chaque image de Wikimedia Commons a sa propre licence. La source et la licence sont affichées sur la fiche du monument.

## 6. Parcours de capture

1. « Capturer » affiche les monuments à moins de 2 km.
2. Photo **prise en direct avec la caméra de l'appli** (pas d'import depuis la galerie).
3. Lecture du GPS au même moment, avec sa précision.
4. La photo est réduite sur le téléphone (~1600 px) puis envoyée avec l'id du monument, la position et la précision.
5. Le serveur vérifie dans l'ordre : connexion → format et taille de l'image → limite de fréquence → précision GPS ≤ 100 m → distance ≤ rayon de capture → vitesse de déplacement plausible depuis la capture précédente.
6. L'image est réencodée (métadonnées supprimées), stockée, et la capture est enregistrée.
7. Un événement `CaptureValidée` est publié → le module progression calcule les succès.
8. Réponse : animation de déblocage, fiche avec section histoire, succès gagnés.

| Erreur | Comportement |
| --- | --- |
| Trop loin | « Tu es à 420 m, rapproche-toi ! » + flèche de direction |
| GPS refusé | Explique pourquoi l'appli en a besoin et comment l'activer |
| GPS imprécis (> 100 m) | « Signal trop faible, réessaie à découvert » |
| Déjà capturé | Remplacement de la photo souvenir possible, sans récompense en plus |
| Pas de réseau | Message clair + réessayer. Pas de file d'attente hors-ligne en R1 |

**Anti-triche :** toutes les vérifications sont faites côté serveur. Seule la photo prise en direct est acceptée, les déplacements impossibles sont refusés (ex. 500 km en 10 min) et le nombre de captures par heure est limité. **Limite connue :** le GPS d'un navigateur peut être falsifié. La reconnaissance par IA (R7) apportera la vraie preuve. Un système de signalement est obligatoire au plus tard en R6.

## 7. RGPD et sécurité

| Donnée | Finalité | Base légale |
| --- | --- | --- |
| Email, mot de passe chiffré, pseudo, date de naissance | Compte | Contrat |
| Captures (monument, date, distance, photo) | Le jeu | Contrat |
| Position GPS | Valider la capture | Contrat. **Jamais stockée** : seule la distance est conservée, et le contrôle de vitesse utilise les positions des monuments |
| Apparaître au classement (R6) | Compétition | Consentement, désactivé par défaut |

- **Photos privées par défaut.** Le partage (R4) est déclenché par le joueur lui-même. Pas de galerie publique, donc pas de modération des photos.
- **Pas de cookies de suivi** : statistiques sans cookies (Plausible ou Umami), donc pas de bannière cookies.
- **Âge minimum de 15 ans** (majorité numérique en France).
- **Droits dans l'appli** : export (JSON + zip des photos), suppression définitive sous 30 jours (photos comprises), modification du profil.
- **Conservation** : compte inactif depuis 3 ans → email d'avertissement, puis suppression.
- **Documents à produire avant la mise en ligne** (`amoa`) : politique de confidentialité, CGU, mentions légales, registre des traitements dans `docs/rgpd/`. Hébergeurs et sous-traitants dans l'UE.

**Sécurité :** Argon2id, email vérifié, limite de tentatives de connexion, sessions comme au §4. Envoi des photos : vérification que le fichier est vraiment une image, 5 Mo maximum, réencodage côté serveur. HTTPS partout, appels autorisés uniquement depuis le site de l'appli (CORS), en-têtes de sécurité (CSP…), validation de toutes les entrées, OWASP. Dans la CI : Dependabot et gitleaks. Secrets uniquement en variables d'environnement.

## 8. Qualité et tests

Tests écrits avant le code (TDD).

| Niveau | Backend | Frontend |
| --- | --- | --- |
| Unitaires | JUnit 5 sur les règles métier (distance, rareté, succès) | Outil de test par défaut d'Angular |
| Intégration | Testcontainers (vraie base PostgreSQL + PostGIS) | Appels API simulés |
| Architecture | Vérification des modules par Spring Modulith | ESLint : une fonctionnalité n'importe pas le code d'une autre |
| Bout en bout | — | Playwright avec GPS simulé + contrôle d'accessibilité axe |
| Couverture | JaCoCo ≥ 80 % sur la logique métier | ≥ 80 % sur la logique métier |

Garde-fous du repo : voir `CLAUDE.md` (hooks git, CI).

## 9. Organisation du code (par fonctionnalité)

- **Backend** (`backend/`) : `fr.zonumental.<module>` (`compte`, `catalogue`, `capture`, `progression`). Chaque package contient son controller, son service, son repository et ses entités. Un module n'expose que son API publique.
- **Frontend** (`frontend/`) : `src/app/features/<fonctionnalité>` (`pokedex`, `capture`, `compte`, `carte`…). `src/app/shared/` ne contient que le design system et les utilitaires communs. Une fonctionnalité n'importe jamais une autre fonctionnalité.

## 10. Identité visuelle

À faire **en R0, avant tout écran** (`ux-designer` + `tech-lead-front`).

- **3 directions artistiques** sous forme de maquettes visibles : palette, typographie, ébauche de logo, **fiche monument** et **carte partageable**.
- **Pistes :**
  1. Chromos de collection rétro (vignettes 1900, trait gravé, papier crème).
  2. Carnet d'explorateur (tampons de passeport, cartes anciennes ; la capture = un coup de tampon).
  3. Pixel art moderne (clin d'œil au Pokédex).
- **Interdits (anti « vibe codé »)** : Material Design tel quel, dégradés violets, emojis à la place d'icônes, écrans faits de cartes arrondies toutes identiques.
- La direction retenue devient le design system, obligatoire pour les devs.

## 11. Décisions ouvertes

- Hébergeur et budget (à décider avant le déploiement de R0).
- Direction artistique (choix du product owner parmi les 3 propositions).
- Liste exacte des 10 villes et quota de Paris (proposition de l'`amoa` dans `catalogue-quotas.yml`).

## 12. Décisions de design (2026-10-19)

Maquettes : canvas Design « Zonumental — Directions artistiques » (https://claude.ai/artifact/QTVhut8zxVu9uHTFXLQkph, privé).

- **Direction retenue : B « Carnet d'explorateur »**, version pro (v2+). La v1 (papier quadrillé, polices machine à écrire/manuscrite) est rejetée car trop générique.
- **Validé :** la story à partager (photo + tampon + ligne façon zone lisible des passeports `ZNM<…`) ; les tampons réalistes (encre irrégulière, une forme par type de monument, une encre par rareté), y compris le tampon « CAPTURÉ » posé sur la photo.
- **Système :** Gloock (titres) + Geist (interface) + Geist Mono (numéros, dates, tampons). Papier visa #F4F1EA, encre #1A1C20, marine #1F3A5F, bordeaux #8C2F39, sapin #2F5D4A, ocre #B07A2A (légendaire uniquement). Guilloches façon passeport.
- **Navigation :** Accueil · Carnet · [Tamponner] · Carte · Profil.
- **En revue :** Accueil et Carnet v3.
- **À faire :** trouver un nom pour la collection (« Pokédex » est une marque Nintendo) ; faire dessiner les silhouettes des tampons ; citer les auteurs des photos Wikimedia si elles sont publiées.

### Règles UX issues du conseil (llm-council, 2026-10-19)
- **Un écran = un job.** Accueil : « où je tamponne maintenant ? ». Carnet : « qu'ai-je collecté, que me manque-t-il ? ». Chaque écran tient en un seul écran de téléphone (pas de défilement).
- **Densité progressive** : jour 0 = guide en 3 étapes et cases vides ; les défis, collections et filtres n'apparaissent qu'au fil des tampons (filtres à partir d'environ 20 tampons).
- **Classement → Profil** (pas de sens au lancement avec peu de joueurs) ; « Ta France » → Carte ; « Derniers tampons » réduit à une seule ligne.
- **Accessibilité** : la rareté est écrite en toutes lettres dans le tampon, pas seulement indiquée par la couleur de l'encre.
- **Toujours concevoir les états jour 0 / jour 3 / jour 60.** Tester sur le terrain (dehors, au soleil) avec 5 à 8 personnes : test de 5 secondes et test de mémoire.
- **Navigation v4** : Accueil · Carnet · [Tamponner] · Carte · Défis, avec libellés, barre couleur papier. Le profil est accessible par l'avatar en haut de l'écran. Le bouton Tamponner reflète la position GPS : gris (aucun monument à moins de 2 km), bordeaux + distance (monument proche), halo vert (dans la zone, moins de 150 m).
- **Classement** : dans l'onglet Défis (portées Amis / Ville / France). Au lancement, le classement d'une ville s'ouvre à 50 explorateurs ; avant, on se mesure à ses amis. Le pseudo n'apparaît que s'il l'accepte (RGPD).
