# Plan technique — reglages-1 : « Mode facile » (préférence de compte)

Contrat : `docs/api/profil-preferences.md`. Contexte : ADR 0025 (itinéraire), RG-013 (export), RG-014 (effacement), RG-036 (position).

## Décisions

1. **Stockage : une colonne** `compte.utilisateur.mode_facile boolean not null default false`. Pas de table de préférences (un seul réglage, YAGNI ; à revoir à partir de plusieurs réglages hétérogènes).
2. **Lecture via `monCompte`** (+ `modeFacile`), écriture via `PUT /api/compte/preferences` (même forme que consentements).
3. **Pas de refus serveur de `POST /api/itineraire`** : simple masquage UI. Le mode facile est une préférence d'affichage, pas un droit ; un client qui l'appelle quand même n'obtient rien qu'il ne pourrait obtenir en cochant l'interrupteur. Un 403 coûterait une lecture en base par calcul et couplerait `itineraire` à `compte` pour une défense sans actif à protéger. RG-036 n'est pas en jeu (lire un booléen ne stocke pas la position). Quota de 30/h et 401 restent les seuls garde-fous.
4. **Pas d'ADR** : choix réversible, local au module `compte`.

## Backend (`dev-backend`)

| Fichier | Changement |
| --- | --- |
| `db/migration/V13__preference_mode_facile.sql` | `alter table compte.utilisateur add column mode_facile boolean not null default false;` (ajout avec défaut constant : pas de réécriture de table en Postgres 11+). |
| `compte/profil/ProfilController.java` | `Profil` + `boolean modeFacile` ; `select … mode_facile`. |
| `compte/profil/PreferencesController.java` | `PUT /api/compte/preferences`, record `Preferences(@NotNull Boolean modeFacile)` + `@Valid` ; `update compte.utilisateur set mode_facile = ? where id = ? and suppression_demandee_le is null` ; 0 ligne → 401 `non-authentifie`. Vérifier que la coercition Jackson (`"true"`, `1`) est refusée (sinon `MapperFeature`/`@JsonFormat` local, pas global). |
| `compte/export/Export.java` | `Compte` + `boolean modeFacile`, ajouté au `select`. |
| `docs/api/openapi.yaml` | Déjà mis à jour dans cette story (contrat). Vérifier le test de conformité OpenAPI s'il existe. |

Tests (TDD, écrits d'abord) :
- `compte/profil/ProfilTest` : `monCompte` renvoie `modeFacile=false` pour un compte neuf ; `true` après PUT.
- `compte/profil/PreferencesTest` : PUT true puis false → 200 et état persistant ; corps vide, champ absent, `null`, `"true"` → 400 `validation` ; sans jeton → 401 ; compte en suppression → 401.
- `compte/export/ExportTest` : `donnees.json` contient `compte.modeFacile`.
- Migration : couverte par le démarrage Testcontainers/Flyway existant.

## Frontend (`dev-frontend`)

| Fichier | Changement |
| --- | --- |
| `core/api/` | Régénération du client OpenAPI (`modifierPreferences`, `Profil.modeFacile`). |
| `features/compte/profil/profil.ts/.html` | Section « Préférences » : interrupteur `role="switch"` « Mode facile » (libellé + aide : « Propose l'itinéraire à pied vers un monument »), état initial depuis `monCompte`, PUT au changement, retour à l'état précédent et message en cas d'erreur. Même schéma que les consentements. |
| `features/carte/carte.ts` | Lire `modeFacile` (`monCompte`, une fois à l'ouverture) ; bouton itinéraire, mention et bloc d'écart rendus seulement si `true`. Anonyme ou erreur → `false` (masqué). |

Tests :
- `profil.spec.ts` : interrupteur reflète `modeFacile` ; bascule → `PUT {modeFacile:true}` ; échec → état rétabli + message ; accessible (nom, `aria-checked`).
- `carte.spec.ts` : `modeFacile=false` → aucun bouton itinéraire ni requête ; `true` → comportement itineraire-3/4 inchangé (adapter les specs existantes pour fournir `modeFacile=true`).
- e2e `itineraire.spec.ts` : activer le mode facile dans le Profil avant le parcours ; un cas « désactivé = pas de bouton ».

## Découpage

1. Back (migration, PUT, profil, export) — mergeable seul (champ additionnel, non cassant).
2. Front (profil puis carte), après régénération du client.

## Risques

- Specs et e2e itinéraire existants cassent dès que la carte masque par défaut : les mettre à jour dans le même lot front.
- Changement de préférence dans un autre onglet/appareil non propagé à une carte déjà ouverte (lu à l'ouverture) : acceptable.
- Ordre de livraison : déployer le back avant le front (le front lit un champ absent comme `false`, donc pas de rupture inverse non plus).
