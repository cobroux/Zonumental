# ADR 0010 — Front : Angular 22, Node 24 LTS, TypeScript 6.0

- **Statut :** accepté
- **Date :** 2026-10-19
- **Décideur :** tech-lead-front

## Contexte

Le cahier (§4) impose Angular en PWA. Il faut figer les versions avant le scaffolding de r0-socle-2. Ce qui suit a été vérifié le 2026-10-19 sur les registres, pas de mémoire :

| Élément | Version | Source vérifiée |
| --- | --- | --- |
| `@angular/core`, `@angular/cli`, `@angular/service-worker`, `@angular/pwa` | **22.2.3** | `https://registry.npmjs.org/@angular/core/latest` (et cli, service-worker, pwa) |
| Moteurs Node exigés par Angular 22.2.3 | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` | champ `engines` de `@angular/core@22.2.3` |
| TypeScript exigé par Angular 22.2.3 | `>=6.0 <6.1` | `peerDependencies` de `@angular/compiler-cli@22.2.3` |
| TypeScript retenu | **6.0.3** (le tag `latest` npm est la 7.0.2, **incompatible**) | `https://registry.npmjs.org/typescript` |
| Node LTS actif | **24.22.0** « Krypton » (2026-10-14) | `https://nodejs.org/dist/index.json` |
| Calendrier Node | 24 : maintenance au 2026-10-20, fin le 2028-04-30 ; 26 : LTS le 2026-10-28 | `https://raw.githubusercontent.com/nodejs/Release/main/schedule.json` |

## Décision

- **Angular 22.2.x**, dernière mineure stable, avec les choix par défaut du CLI 22 : application **zoneless** (`zoneless: true` par défaut dans le schéma `@schematics/angular`), composants standalone, builder `@angular/build` (esbuild), **Vitest** comme lanceur de tests unitaires (`testRunner: vitest` par défaut, voir ADR 0019).
- **TypeScript 6.0.x**, épinglé en `~6.0.3`. Dependabot ne doit pas proposer la 7 tant qu'Angular ne la supporte pas.
- **Node 24 LTS** (`.nvmrc` = `24`, `engines.node` = `^24.15.0`), soit la LTS active au jour de la décision. On passe à Node 26 quand il sera LTS (2026-10-28) et que l'image de CI existera. Le changement tient en deux lignes (`.nvmrc` et image CI) et ne demande pas de nouvel ADR.
- Gestionnaire de paquets : **npm** (fourni avec Node), `package-lock.json` versionné, `npm ci` en CI.

## Alternatives écartées

- **Node 26 dès maintenant** : il n'est pas LTS avant le 2026-10-28. On ne démarre pas un projet sur une version « Current ».
- **TypeScript 7** : hors de la plage supportée par le compilateur Angular 22.
- **Zone.js / Karma** : ce sont des modes historiques que le CLI 22 ne génère plus par défaut. Ils ajouteraient du poids sans aucun bénéfice ici.
- **pnpm / yarn** : un outil de plus pour un seul projet front. Aucun gain.

## Conséquences

- Tout le code part du principe zoneless : l'état passe par les signals (ADR 0013) et on n'utilise jamais `setTimeout` pour « forcer » une détection de changement.
- Le passage annuel à la majeure suivante d'Angular (`ng update`) est une story de maintenance, pas une décision d'architecture.
