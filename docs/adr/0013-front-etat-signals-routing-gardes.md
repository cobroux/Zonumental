# ADR 0013 — Front : état en signals, Signal Forms, routage paresseux et gardes

- **Statut :** accepté
- **Date :** 2026-10-19

## Contexte

R0 contient une douzaine d'écrans de formulaire et un seul état transverse : la session. En R1 s'ajoutent la position GPS et le carnet (~120 monuments). L'application est zoneless (ADR 0010).

## Décision

**État**
- **Signals Angular uniquement** : `signal`, `computed`, `linkedSignal`, `resource`/`httpResource` (API publique stable depuis la 22.0, vérifié dans `@angular/common@22.2.3`).
- État transverse : `core/session/session.ts`, un service `providedIn: 'root'` qui expose `connecte` (signal en lecture seule) et garde le jeton d'accès dans un champ privé (ADR 0015). Le profil (pseudo, e-mail vérifié) est lu par l'écran qui en a besoin via `GET /api/compte/moi`. On ne le duplique pas dans la session tant qu'un seul écran s'en sert.
- État d'un écran : dans le composant. État partagé entre deux écrans d'une fonctionnalité : un service fourni dans les `providers` des routes de cette fonctionnalité.
- RxJS seulement là où Angular l'impose (`HttpClient`, `SwUpdate`, `Router.events`), avec conversion par `toSignal` au plus tôt.
- Tous les composants sont en `ChangeDetectionStrategy.OnPush`, imposé par la règle angular-eslint `prefer-on-push-component-change-detection`.

**Formulaires**
- **Signal Forms** (`@angular/forms/signals`) : API publique stable en 22.0. Seul `provideExperimentalWebMcpForms` est expérimental, et on ne l'utilise pas (vérifié dans les `.d.ts` de `@angular/forms@22.2.3`).
- Les validations côté client reprennent les règles (RG-002, RG-005, RG-006) **pour le confort uniquement**. Le serveur reste l'autorité. Ses erreurs par champ (format d'erreur, voir `frontend.md`) sont reportées sur le champ concerné.

**Routage**
- `provideRouter(routes, withComponentInputBinding())` : les paramètres `?jeton=` et `?retour=` arrivent en `input()` du composant.
- Une fonctionnalité égale une route `loadChildren`. Chaque route a un `title` en français (critère WCAG 2.4.2).
- Après chaque `NavigationEnd`, la coque place le focus sur le `<h1>` de l'écran (`tabindex="-1"`). Sans cela, un lecteur d'écran ne sait pas qu'il a changé de page.
- Gardes fonctionnelles dans `core/session/` :
  - `connecteGuard` (`canMatch`) : sans session, renvoie l'`UrlTree` `/connexion?retour=<url demandée>` (RG-001, R0-15) ;
  - `inviteGuard` (`canMatch`) : un explorateur déjà connecté qui ouvre `/bienvenue`, `/connexion` ou `/inscription` est redirigé vers `/` ;
  - `retour` est accepté seulement s'il commence par `/` et pas par `//` (pas de redirection ouverte vers un autre site).
- Redirection de `/` par une fonction `redirectTo` : connecté → `/localisation` si l'écran n'a pas encore été traité sur cet appareil, sinon `/profil` (seule page protégée de R0, r0-socle-8) ; non connecté → `/bienvenue`. En R1, `/profil` sera remplacé par `/explorer`.
- **Restauration de session au démarrage** : `provideAppInitializer` appelle une fois `POST /api/auth/renouvellement` avant la première navigation. Les gardes connaissent donc l'état dès le départ et il n'y a pas de flash « connexion » puis « profil ». Un échec réseau ou une réponse 401 donne une session anonyme.

## Alternatives écartées

- **NgRx Store / NgRx SignalStore** : un seul état transverse, pas de besoin de journal d'actions ni d'outils de débogage. Ce serait du poids et une syntaxe en plus pour rien.
- **Reactive Forms** : Signal Forms est stable en 22, plus simple en zoneless, et ne mélange pas Observables et signals.
- **Garde `canActivate`** : `canMatch` évite même de télécharger le bundle d'une fonctionnalité protégée quand on n'est pas connecté.

## Conséquences

- Si un état transverse supplémentaire apparaît (position GPS en R1, lue par la NavBar et par l'écran Tamponner), il ira dans `core/` comme un signal en lecture seule, après un ADR court. Pas de store générique « au cas où ».
- La déconnexion et la demande de suppression de compte rechargent toute la page (`location.assign`), ce qui garantit qu'aucune donnée de l'explorateur précédent ne reste en mémoire. Cela évite tout code de remise à zéro.
