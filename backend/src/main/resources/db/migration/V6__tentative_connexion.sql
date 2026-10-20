-- Échecs de connexion par e-mail (RG-009). Clé = HMAC-SHA256 de l'e-mail normalisé : aucune adresse en clair,
-- et pas de lien avec compte.utilisateur pour que les adresses inexistantes comptent aussi.
CREATE TABLE compte.tentative_connexion (
    empreinte_email bytea PRIMARY KEY,
    echecs int NOT NULL,
    bloque_jusqu_au timestamptz,
    derniere_tentative_le timestamptz NOT NULL
);
CREATE INDEX tentative_connexion_derniere ON compte.tentative_connexion (derniere_tentative_le);
-- Purge nocturne des sessions expirées.
CREATE INDEX session_expire_le ON compte.session (expire_le);
