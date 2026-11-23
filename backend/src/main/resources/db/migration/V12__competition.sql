-- Classement (ADR 0024 §8) : une ville ayant atteint le seuil reste ouverte.
CREATE SCHEMA competition;
CREATE TABLE competition.ville_ouverte (
    ville_code_insee text PRIMARY KEY REFERENCES catalogue.ville (code_insee) ON DELETE CASCADE,
    ouverte_le       timestamptz NOT NULL
);
