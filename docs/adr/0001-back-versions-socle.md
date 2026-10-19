# ADR 0001 — Versions du socle backend

- **Statut :** proposé (tech-lead-back, 2026-10-19)
- **Stories :** r0-socle-1

## Contexte

Le cahier impose Java + Spring Boot + Maven Wrapper (`CLAUDE.md`). Il faut figer des versions stables, maintenues pendant toute la durée R0 → R7, et vérifiées à la source (pas de mémoire).

## Décision

| Composant | Version | Source vérifiée le 2026-10-19 |
| --- | --- | --- |
| Java (Eclipse Temurin) | **25 (LTS)** | `api.adoptium.net/v3/info/available_releases` : `most_recent_lts = 25` (27 = non-LTS) |
| Spring Boot | **4.1.1** | `start.spring.io/metadata/client` : `bootVersion.default = 4.1.1` (4.2.0 en M2) |
| Spring Framework / Security | 7.0.9 / 7.1.1 (gérés par Boot) | `spring-boot-dependencies-4.1.1.pom` |
| Spring Modulith | **2.1.1** | BOM proposé par start.spring.io pour Boot 4.1.1 (2.2.0 en M2) |
| springdoc-openapi | **3.1.1** | Maven Central (`release`), POM parent Boot 4.1.0 |
| Maven | **3.9.16** | Maven Central `maven-core` : dernière 3.9.x ; Maven 4 encore en `4.0.0-rc-7` |
| Maven Wrapper | **3.3.4** | Maven Central `maven-wrapper-plugin` |
| PostgreSQL + PostGIS (image) | **`postgis/postgis:18-3.6`** | Docker Hub ; endoflife.date : PG 18.6, fin de support 2030-11 (PG 19 en rc) |
| Flyway | 12.4.0 (géré par Boot) | `spring-boot-dependencies-4.1.1.pom` |
| Testcontainers | 2.0.5 (géré par Boot), artefact `testcontainers-postgresql` | idem + Maven Central |
| Hibernate ORM | 7.4.5.Final (géré par Boot) | idem |
| Bouncy Castle `bcprov-jdk18on` (requis par l'Argon2 de Spring Security) | **1.86** | Maven Central |
| Spotless Maven plugin | **3.10.4** (google-java-format) | Maven Central |
| Checkstyle plugin / moteur | **3.6.0 / 14.3.0** | Maven Central |
| JaCoCo | **0.8.15** (seuil 80 % sur la logique métier, cahier §8) | Maven Central |

Règle : on ne surcharge **aucune** version gérée par le BOM Spring Boot (Flyway 13.x existe sur Central mais n'est pas celle de Boot 4.1 : on garde 12.4.0). Mises à jour via Dependabot (cahier §7).

## Alternatives écartées

- **Java 21** : LTS plus ancienne, sans gain ; Boot 4.1 supporte 25.
- **Java 27** : non-LTS, support de 6 mois.
- **Spring Boot 4.0.x** : branche précédente ; 4.2 : milestone.
- **Maven 4** : release candidate, pas stable.
- **Gradle** : le cahier et `CLAUDE.md` imposent Maven Wrapper.

## Conséquences

- Image d'exécution : `eclipse-temurin:25-jre` (devops, r0-socle-5).
- Docker obligatoire en CI et en local pour les tests d'intégration (Testcontainers).
- Testcontainers 2.x a renommé ses artefacts (`testcontainers-<module>`) : ne pas copier d'exemples 1.x.
