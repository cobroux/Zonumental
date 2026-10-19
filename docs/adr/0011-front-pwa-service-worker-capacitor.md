# ADR 0011 — Front : PWA avec le service worker Angular, compatible Capacitor

- **Statut :** accepté
- **Date :** 2026-10-19

## Contexte

Le cahier (§1) prévoit une PWA installable au départ, puis une publication Android et iOS **obligatoire plus tard** via Capacitor, avec le même code Angular. La story r0-socle-2 exige que l'application soit installable (manifeste + service worker). Hors-ligne : pas de file d'attente en R1 (§6), et rien n'est demandé en R0.

## Décision

- **`@angular/service-worker`** (installé par `ng add @angular/pwa`). Aucune bibliothèque tierce.
- `ngsw-config.json` :
  - `assetGroups` : l'application (index, JS, CSS) en `prefetch` ; polices, icônes et images statiques en `lazy`.
  - **Pas de `dataGroups`** : l'API n'est **jamais** mise en cache par le service worker. Aucune réponse authentifiée, aucune donnée personnelle ne se retrouve dans le Cache Storage.
  - `navigationUrls` exclut `/api/**`, pour qu'une navigation vers une URL d'API ne reçoive jamais `index.html`.
- **Mise à jour** : sur `SwUpdate.versionUpdates` de type `VERSION_READY`, un bandeau discret propose « Nouvelle version disponible. Recharger ». Pas de rechargement forcé, qui ferait perdre un formulaire en cours. Sur `unrecoverable`, on recharge la page.
- **Manifeste** (`public/manifest.webmanifest`) : `name` « Zonumental », `lang` `fr`, `start_url` `/`, `display` `standalone`, `background_color` et `theme_color` à la couleur papier `#F4F1EA`, icônes 192, 512 et 512 `maskable`, plus une `apple-touch-icon` de 180 px dans `index.html`. Pas d'`orientation` imposée (PC et tablette sont aussi des supports, §1). Les icônes définitives viennent du logo de `ux-designer`. Une icône provisoire suffit pour livrer r0-socle-2.
- **Pas d'invitation d'installation personnalisée** en R0 (`beforeinstallprompt`) : rien ne la demande.
- **Compatibilité Capacitor, par hygiène et sans code ajouté :**
  - routage par chemin (`/profil`) : il fonctionne dans la WebView Capacitor, qui sert l'application depuis un serveur local ;
  - aucune dépendance au rendu serveur (pas de SSR, voir les alternatives) ;
  - caméra et GPS via les API web standard (`getUserMedia`, `navigator.geolocation`), qui fonctionnent dans la WebView une fois les permissions déclarées dans les manifestes natifs ;
  - toute la logique de session tient dans un seul fichier (`core/session/`, ADR 0015), parce que c'est **le** point qui changera en natif (voir les conséquences) ;
  - le service worker n'est pas utilisé en natif : l'application ne doit jamais en dépendre pour fonctionner.

## Alternatives écartées

- **Workbox / vite-plugin-pwa** : redondant avec le service worker officiel d'Angular, qui couvre le besoin.
- **SSR / prérendu** : une application de jeu dont tout l'accès demande un compte (RG-001) n'a pas de SEO à servir. Seules Bienvenue et les pages légales sont publiques, et cela ne justifie pas un serveur Node. Le SSR serait en plus incompatible avec Capacitor.
- **Ajouter Capacitor dès R0** : rien ne le demande en R0, et il n'existe pas encore de compte Apple. On l'ajoute à la release qui publie dans les stores.

## Conséquences

- Mode hors-ligne en R0 : l'interface se charge, mais tout appel d'API échoue avec le message « Pas de connexion. Réessayer » (même règle que RG-040).
- **Risque Capacitor identifié** : en natif, l'origine devient `capacitor://localhost` (iOS) ou `https://localhost` (Android). Le cookie de renouvellement `SameSite=Strict` (ADR 0015) ne sera plus envoyé à l'API, et WKWebView bloque les cookies tiers. Il faudra alors choisir entre `CapacitorHttp` (magasin de cookies natif) et un jeton de renouvellement en stockage sécurisé natif (Keychain / Keystore). Cette décision fera l'objet d'un ADR à la release « stores ». Elle ne touchera que `core/session/`.
- Tester l'installation sur Android Chrome et sur iOS Safari (« Sur l'écran d'accueil ») fait partie de la recette de r0-socle-2.
