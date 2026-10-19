# ADR 0015 — Front : jeton d'accès en mémoire, renouvellement par cookie httpOnly, sécurité côté client

- **Statut :** proposé (aligné sur l'ADR 0004 du back ; points d'accord marqués **[back]** / **[devops]**)
- **Date :** 2026-10-19

## Contexte

Le cahier (§4) fixe un JWT d'accès de 15 min et un jeton de renouvellement en cookie `httpOnly`, `Secure`, `SameSite`. La session dure 30 jours d'inactivité (RG-010). Côté back (ADR 0004) : cookie `zonumental_session`, `HttpOnly; Secure; SameSite=Strict; Path=/api/auth`, expiration glissante, **pas de rotation** à chaque renouvellement. Les données sont personnelles (§7), et l'application deviendra une app Capacitor (ADR 0011).

## Décision

**Stockage**
- Le jeton d'accès vit **uniquement en mémoire**, dans un champ privé de `core/session/session.ts`. Jamais dans `localStorage`, `sessionStorage`, IndexedDB, un cookie lisible ou une URL.
- Aucune donnée personnelle dans le stockage du navigateur. Seule exception : l'indicateur non personnel `zn.localisation` = `traitee`, qui évite de remontrer l'écran de localisation (r0-socle-17). Il est strictement nécessaire au service, donc exempté de consentement.

**Même origine [back + devops]**
- Le front et l'API sont sur la **même origine**, l'API sous `/api` derrière le reverse proxy (c'est aussi la position du back). Conséquences : pas de CORS à ouvrir pour l'application, et un cookie `SameSite=Strict` qui fonctionne. En développement, `proxy.conf.json` envoie `/api` vers `localhost:8080`.

**Flux**
1. Démarrage : `provideAppInitializer` appelle `POST /api/auth/renouvellement`. Une réponse 200 met en mémoire `jetonAcces` ; une réponse 401 ou une erreur réseau donne une session anonyme (ADR 0013).
2. Connexion (`POST /api/auth/connexion`) ou annulation de suppression (`POST /api/compte/suppression/annulation`) : la réponse `200 { jetonAcces, expireDans }` est mise en mémoire, et le cookie est posé par le back.
3. L'intercepteur (`core/session/jeton.interceptor.ts`) ajoute `Authorization: Bearer` **uniquement** aux requêtes d'URL relative `/api/` hors `/api/auth/`. Le jeton ne part jamais vers une autre origine.
4. **Règle de renouvellement** : on renouvelle sur un 401 **seulement si la requête portait un Bearer**. Les 401 des routes publiques (`identifiants-invalides` à la connexion ou à l'annulation) remontent donc tels quels à l'écran, sans boucle. Le renouvellement se fait **une seule fois en vol** (promesse partagée entre les requêtes concurrentes), puis on refait la requête une fois. S'il échoue : session vidée, puis navigation vers `/connexion?retour=<url courante>`.
5. Plusieurs onglets : pas de coordination nécessaire, puisque le back ne fait pas tourner le jeton de renouvellement. **[back]** Si la rotation est introduite un jour (alternative écartée dans l'ADR 0004), il faudra sérialiser les renouvellements entre onglets (`navigator.locks`), et donc modifier cet ADR.
6. Déconnexion : `POST /api/auth/deconnexion`, puis `location.assign('/bienvenue')` pour vider toute la mémoire. Même chose après une demande de suppression.

**XSS et en-têtes**
- Aucun `bypassSecurityTrust*`, interdit par la règle ESLint `no-restricted-properties`. Aucun `[innerHTML]` : les textes légaux sont des templates Angular et les données d'API passent par l'interpolation.
- **CSP demandée à `devops`** (posée par le serveur qui sert le front, story r0-socle-5) :
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; require-trusted-types-for 'script'; trusted-types angular angular#bundler`.
  - `style-src 'unsafe-inline'` est nécessaire parce qu'Angular injecte les styles des composants dans des balises `<style>`. Un nonce exigerait de produire `index.html` côté serveur à chaque requête : risque faible, coût élevé.
  - `optimization.styles.inlineCritical: false` dans `angular.json`, parce que l'inlining du CSS critique ajoute un gestionnaire `onload` inline que `script-src 'self'` bloque.
  - `img-src` reste sans domaine externe : les images de référence du catalogue doivent être servies depuis notre origine (point déjà signalé par le back, ADR 0006). Des URL présignées vers un domaine S3 obligeraient à ajouter ce domaine.
- `Referrer-Policy: no-referrer` sur tout le front (comme le propose l'ADR 0004 ; nous n'avons aucun lien sortant qui ait besoin du référent). Les jetons des liens d'e-mail (`?jeton=`) sont retirés de l'URL dès leur lecture (`router.navigate([], { replaceUrl: true })`), pour ne pas rester dans l'historique.

## Alternatives écartées

- **Jeton d'accès dans `localStorage`** : une seule faille XSS suffit à le lire.
- **Tout en cookie de session, sans Bearer** : contraire au §4. Il faudrait en plus une protection CSRF sur toutes les routes.
- **Renouvellement proactif par minuterie** : inutile, le renouvellement à la demande sur 401 suffit et marche aussi après une mise en veille du téléphone.

## Conséquences

- Recharger la page coûte un appel de renouvellement : c'est acceptable.
- En natif (Capacitor), le transport du jeton de renouvellement changera (ADR 0011). Seul `core/session/` sera touché.
