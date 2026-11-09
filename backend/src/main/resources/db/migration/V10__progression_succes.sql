CREATE SCHEMA progression;

-- RG-R2-01 : seul « joueur X a obtenu le succès Y à la date D » est conservé, une fois, jamais retiré.
-- Pas de clé étrangère entre schémas (ADR 0008) : l'effacement passe par l'événement CompteSupprime.
CREATE TABLE progression.succes_obtenu (
    utilisateur_id uuid NOT NULL,
    code text NOT NULL,
    obtenu_le timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (utilisateur_id, code)
);
