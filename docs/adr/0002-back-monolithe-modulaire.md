# ADR 0002 — Monolithe modulaire Spring Modulith, packages par fonctionnalité

- **Statut :** proposé (tech-lead-back, 2026-10-19)
- **Stories :** r0-socle-1 (et toutes les stories backend)

## Contexte

Cahier §4 et §9 : un seul service Spring Boot, découpé en modules `compte`, `catalogue`, `capture`, `progression` ; un module ne lit jamais les tables d'un autre ; communication par appels de service publics ou événements internes ; vérification par Spring Modulith ; code rangé par fonctionnalité, jamais par couche.

## Décision

1. **Un module = un sous-package direct de `fr.zonumental`** : `compte`, `catalogue`, `capture`, `progression`, plus un module partagé `commun`.
2. **API publique = types publics du package racine du module** (`fr.zonumental.compte`). Tout ce qui est dans un sous-package (`fr.zonumental.compte.session`…) est interne au module (règle par défaut de Modulith). Les sous-packages sont des **fonctionnalités** (`inscription`, `session`, `motdepasse`…), jamais des couches (`controller`, `service`, `repository` interdits).
3. **Dépendances autorisées** (déclarées dans chaque `package-info.java` via `@ApplicationModule(allowedDependencies = …)`) :

   | Module | Peut dépendre de |
   | --- | --- |
   | `commun` | rien |
   | `compte` | `commun` |
   | `catalogue` | `commun` |
   | `capture` (R1) | `compte`, `catalogue`, `commun` |
   | `progression` (R2) | `capture` (événements), `catalogue`, `commun` |

   `compte` et `catalogue` ne dépendent d'aucun module métier. Ce qui doit réagir à un compte (purge des captures) **écoute l'événement** `CompteSupprime` publié par `compte`.
4. **`commun`** est strictement limité : format d'erreur (`ErreurMetier`, `@RestControllerAdvice`), bean `Clock` (fuseau Europe/Paris). Toute autre classe dans `commun` doit être justifiée en revue.
5. **Données** : un schéma PostgreSQL par module (`compte`, `catalogue`, …), aucune clé étrangère entre schémas (ADR 0003).
6. **Vérification** : un test JUnit `ApplicationModules.of(ZonumentalApplication.class).verify()` fait échouer `mvnw verify` en cas de cycle ou d'accès à un type interne d'un autre module.
7. En R0, `capture` et `progression` n'existent que par leur `package-info.java` (critère de r0-socle-1) ; aucune classe.

## Alternatives écartées

- **Microservices** : contraire au cahier, coût d'exploitation sans bénéfice.
- **Packages par couche** (`controllers/`, `services/`) : interdit par §9.
- **Modules Maven séparés** : isolation plus forte mais build plus lourd ; Modulith suffit.
- **Mettre l'infrastructure partagée dans le package racine** : Modulith ne la range dans aucun module, les dépendances deviennent invisibles.

## Conséquences

- Les entités, repositories et contrôleurs sont **package-private** autant que possible.
- **Limite connue** : Modulith vérifie les dépendances Java, pas le SQL natif. Une requête native `catalogue.monument` écrite dans `capture` ne serait pas détectée ; la séparation par schéma la rend visible en revue (`tech-lead-back` relit toute requête native).
- **Écart signalé au cahier §9** (« chaque package contient son controller, son service… ») : on ajoute un module `commun`, équivalent backend de `shared/` côté front, borné au point 4.
