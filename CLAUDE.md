# Zonumental

> Stack : **Java + Spring Boot** (`backend/`, Maven Wrapper) et **Angular** (`frontend/`). Versions et détails : `docs/ARCHITECTURE.md` + ADR des tech leads.
> **Cahier des charges (source de vérité produit) : `docs/fonctionnel/cahier-des-charges.md` — à lire en début de session avant toute décision produit ou technique.**
> Produit : Pokédex des monuments (France d'abord), PWA mobile-first, releases R0→R7 (§3 du cahier).

## Équipe d'agents (`.claude/agents/`)

| Agent | Modèle | Rôle |
| --- | --- | --- |
| `chef-de-projet` | haiku | Suivi, statut sprint, prochaine story, risques |
| `scribe` | haiku | README, CHANGELOG, docs, commits |
| `product-owner` | sonnet | Epics, user stories, critères d'acceptation, priorisation |
| `amoa` | sonnet | Besoin métier, règles de gestion, recette fonctionnelle |
| `ux-designer` | sonnet | Parcours, wireframes, design system |
| `dev-backend` | sonnet | API, métier, BDD (TDD) |
| `dev-frontend` | sonnet | UI, composants, accessibilité (TDD) |
| `qa` | sonnet | Validation des critères, tests, revue standard |
| `devops` | sonnet | CI/CD, Docker, déploiement |
| `tech-lead-back` | opus | Archi serveur, données, sécurité, ADR back, revue à risque |
| `tech-lead-front` | opus | Archi front, état, perf, a11y, ADR front, revue à risque |

## Règles d'économie de tokens

- Toujours confier la tâche à l'agent **le moins cher** capable de la faire. Opus (`tech-lead-front` / `tech-lead-back`) uniquement pour l'architecture, les arbitrages et les revues à risque.
- Le `llm-council` (`anthropic-skills:llm-council`) : uniquement pour les décisions structurantes, jamais pour du code courant.
- Dès qu'il y a du code : lancer `/graphify` ; les agents interrogent `graphify-out/` au lieu de relire le repo.
- Mode `ponytail` actif : solution minimale, pas de code inutile.
- Donner aux agents un brief précis (ID de story, fichiers concernés) plutôt que tout le contexte.

## Cycle de vie d'une story

Gestion via le skill `ecc:story-lifecycle`, ledger dans `.stories/` (ne jamais éditer à la main).

1. `amoa` → besoin + règles de gestion (`docs/fonctionnel/`)
2. `product-owner` → `create-epic` puis `create-stories` (statut `todo`)
3. `chef-de-projet` → `plan-sprint <n>`
4. `tech-lead-back` / `tech-lead-front` → contrat d'API commun (`docs/api/`) + plan technique (si structurant)
5. `dev-backend` / `dev-frontend` → implémentation TDD (`in-progress`)
6. `qa` → validation des critères + tests (`review`)
7. Merge sur `main` → `done` ; `scribe` met à jour CHANGELOG

Statuts : `todo → in-progress → review → done`, uniquement vers l'avant.

## Conventions

- Commits : Conventional Commits avec l'ID de story (`feat(auth-flow-2): ...`).
- Une branche par story : `story/<story-id>`.
- **Code rangé par fonctionnalité** : backend `fr.zonumental.<module>` (compte, catalogue, capture, progression), frontend `src/app/features/<feature>` + `shared/`. Jamais de dossiers globaux `controllers/`, `services/`. Détail : §9 du cahier des charges.
- Décisions techniques : ADR dans `docs/adr/`.
- Aucun secret commité ; `.env.example` seulement.

## Garde-fous (non contournables)

Après un clone : `git config core.hooksPath .githooks` (une seule fois).

- `commit-msg` : refuse tout message hors Conventional Commits.
- `pre-commit` : bloque `.env` et clés privées ; lance `spotless:check checkstyle:check` (backend) et `lint` + `prettier --check` (frontend) sur les fichiers indexés.
- CI (`.github/workflows/ci.yml`) : `mvnw verify`, lint/tests/build Angular, scan gitleaks. Une PR rouge ne se merge pas.
- À la création des projets : `tech-lead-back` ajoute Spotless + Checkstyle + JaCoCo au `pom.xml` ; `tech-lead-front` configure ESLint + Prettier (`npm run lint`).
- Interdit : `git commit --no-verify`, push direct sur `main` une fois le remote créé (protection de branche).
