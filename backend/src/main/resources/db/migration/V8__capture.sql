CREATE SCHEMA capture;

-- RG-049 : ce qui est conservé d'une capture, et rien d'autre (ni position, ni précision, ni appareil).
-- Pas de clé étrangère entre schémas (ADR 0008) : l'effacement passe par l'événement CompteSupprime.
CREATE TABLE capture.capture (
    utilisateur_id uuid NOT NULL,
    numero_monument int NOT NULL,
    capturee_le timestamptz NOT NULL DEFAULT now(),
    distance_m double precision NOT NULL,
    photo_id uuid NOT NULL UNIQUE,
    PRIMARY KEY (utilisateur_id, numero_monument)
);

-- Registre des publications Spring Modulith (spring-modulith-events-jdbc 2.1.1, schemas/v2/schema-postgresql.sql).
CREATE TABLE IF NOT EXISTS event_publication
(
  id                     UUID NOT NULL,
  listener_id            TEXT NOT NULL,
  event_type             TEXT NOT NULL,
  serialized_event       TEXT NOT NULL,
  publication_date       TIMESTAMP WITH TIME ZONE NOT NULL,
  completion_date        TIMESTAMP WITH TIME ZONE,
  status                 TEXT,
  completion_attempts    INT,
  last_resubmission_date TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS event_publication_serialized_event_hash_idx ON event_publication USING hash(serialized_event);
CREATE INDEX IF NOT EXISTS event_publication_by_completion_date_idx ON event_publication (completion_date);
