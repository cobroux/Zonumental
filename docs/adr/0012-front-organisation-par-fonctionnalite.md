# ADR 0012 — Front : code rangé par fonctionnalité, frontières vérifiées par ESLint

- **Statut :** accepté. Le dossier `core/` est soumis au client, voir « Écart au cahier ».
- **Date :** 2026-10-19

## Contexte

Le cahier (§8, §9) fixe : `src/app/features/<fonctionnalité>` et `src/app/shared/` (design system et utilitaires communs uniquement). Une fonctionnalité n'importe jamais une autre fonctionnalité, ce qui est vérifié par ESLint.

Il reste trois éléments qui ne sont ni une fonctionnalité ni du design system, et que toutes les fonctionnalités utilisent : la session (jeton, intercepteur, gardes), le client d'API généré et la coque de l'application.

## Décision

```
frontend/src/app/
  app.ts, app.html, app.css   coque : lien d'évitement, <main>, bandeau de mise à jour
  app.config.ts, app.routes.ts
  core/                       singletons techniques transverses, sans écran
    api/                      client généré (ADR 0014), jamais édité, ignoré par git
    session/                  état de session, intercepteur, gardes, URL de retour
    legal/versions.ts         versions courantes des textes légaux (lues par legal et compte)
  shared/                     design system et utilitaires purs, sans état applicatif
    ui/                       composants (bouton, champ, interrupteur…)
    styles/                   tokens.css, typographie, reset
    icons/                    sprite SVG
  features/
    onboarding/               bienvenue, localisation
    compte/                   inscription, vérification, connexion, mot de passe, profil, suppression, export
    legal/                    CGU, confidentialité, mentions légales
    design-system/            page de démonstration, servie en dev uniquement
```

- Chaque fonctionnalité expose **un seul** point d'entrée public, `<feature>.routes.ts`, chargé en différé par `app.routes.ts` (`loadChildren`).
- Dans une fonctionnalité, on range par écran (`compte/connexion/connexion.ts|html|css|spec.ts`). Pas de sous-dossiers `components/`, `services/`, `models/`.
- On ne crée un service propre à la fonctionnalité que si **deux écrans** partagent un état. Sinon, l'écran appelle directement le client généré.
- Les écrans passent de l'un à l'autre **par URL** (`routerLink`, `navigateByUrl`), jamais par import.
- **Règles d'import**, appliquées par `eslint-plugin-boundaries` (7.2.0, compatible ESLint 10, vérifié sur npm) :

| De \ vers | même feature | autre feature | shared | core | app |
| --- | --- | --- | --- | --- | --- |
| feature | oui | **non** | oui | oui | non |
| shared | — | non | oui | **non** | non |
| core | — | non | oui | oui | non |
| app | — | `*.routes.ts` seulement, en import dynamique | oui | oui | oui |

  On vérifie les imports statiques **et** dynamiques. Les chemins relatifs sont résolus, donc un `../../compte/...` ne contourne pas la règle.
- Les alias TypeScript `@core/*`, `@shared/*` et `@features/*` sont utilisés pour la lisibilité. La règle ne dépend pas d'eux.
- Un test de la configuration ESLint (un fichier fixture qui importe une autre feature doit faire échouer le lint) prouve le critère « une fonctionnalité n'importe pas le code d'une autre » (§8).

## Écart au cahier, à faire valider

Le §9 ne cite que `features/` et `shared/`. **J'ajoute `core/`** pour la session et le client d'API. Les mettre dans `shared/` le déformerait : le cahier y limite le contenu au « design system et utilitaires communs », et la session est un état applicatif, pas un utilitaire. Les mettre dans `features/compte` obligerait toutes les autres fonctionnalités à importer `compte`, ce qui est interdit. Le principe du §9 (pas de rangement par couche, pas d'import entre fonctionnalités) est respecté : `core/` ne contient aucun dossier `services/` ni `components/`, seulement deux sous-domaines nommés.

## Alternatives écartées

- **`no-restricted-imports` natif d'ESLint** : il compare le texte de l'import, pas le fichier résolu. Un import relatif passe entre les mailles, la règle serait contournable.
- **Nx module boundaries** : il impose tout un outillage de monorepo pour une seule application.
- **Session dans `shared/`** : voir plus haut.

## Conséquences

- La revue de code refuse tout dossier global `components/`, `services/` ou `models/`, et tout nouveau dossier racine sous `src/app/` sans ADR.
- Toute donnée dont deux fonctionnalités ont besoin passe par l'API (relue par chacune) ou par `core/session` si c'est l'identité de l'explorateur. Exemple : les versions des textes légaux sont affichées par `legal` et envoyées à l'inscription par `compte` (ADR 0008 du back) ; elles vivent donc dans `core/legal/versions.ts`, une simple constante, et non dans l'une des deux fonctionnalités.
