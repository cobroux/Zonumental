# ADR 0003 — PostgreSQL + PostGIS, migrations Flyway, tests Testcontainers

- **Statut :** proposé (tech-lead-back, 2026-10-19)
- **Stories :** r0-socle-1, -6 à -14, -18 à -20

## Contexte

Cahier §4/§5 : PostgreSQL + PostGIS (position des monuments, recherche à 2 km en R1). Cahier §8 : tests d'intégration sur une vraie base via Testcontainers. Le schéma doit évoluer par migrations versionnées.

## Décision

- **PostgreSQL 18 + PostGIS 3.6** (`postgis/postgis:18-3.6`) partout : local, CI, prod.
- **Spring Data JPA** (Hibernate 7), `spring.jpa.hibernate.ddl-auto=validate`, `spring.jpa.open-in-view=false`.
- **Flyway** (starter Boot), migrations SQL dans `backend/src/main/resources/db/migration`, nommage `V<n>__<module>_<sujet>.sql` (ex. `V2__compte_utilisateur.sql`). Une migration publiée n'est jamais modifiée.
- **Un schéma par module** : `compte`, `catalogue` en R0 ; extension `postgis` dans `public`. Pas de clé étrangère entre schémas. Les entités déclarent `@Table(schema = "…")`.
- **Position des monuments sans Hibernate Spatial** : colonnes `latitude`, `longitude` (`double precision`) mappées par JPA, plus une colonne générée
  `position geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED`
  indexée en GiST. La requête « à moins de 2 km » de R1 sera une requête native `ST_DWithin` sur cette colonne.
- **Identifiants** : `utilisateur.id` = UUID généré en Java ; `monument.numero` (entier fixe, RG-019) **est** la clé primaire.
- **Tests** : un seul conteneur `postgis/postgis:18-3.6` (`asCompatibleSubstituteFor("postgres")`, `@ServiceConnection`) partagé par toute la suite ; Flyway joue les vraies migrations. Pas de H2.

## Alternatives écartées

- **Liquibase** : XML/YAML plus verbeux pour un gain nul ici ; SQL brut Flyway lisible par tous.
- **Hibernate Spatial + JTS** : dépendance et types en plus pour une seule colonne lue uniquement par une requête native.
- **H2 / base embarquée** : pas de PostGIS, interdit par §8.
- **Spring Data JDBC** : viable, mais l'équipe et les skills (`ecc:jpa-patterns`) sont alignés sur JPA.

## Conséquences

- Les migrations sont revues par `tech-lead-back` (règle de revue : données/migrations).
- Les modules ne partagent aucune table ; la cohérence entre modules passe par les événements (ADR 0008).
- Docker requis pour `mvnw verify`.
