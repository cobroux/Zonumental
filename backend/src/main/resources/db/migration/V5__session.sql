-- Session de renouvellement : seule l'empreinte SHA-256 du cookie est stockée (ADR 0004).
CREATE TABLE compte.session (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    utilisateur_id uuid NOT NULL REFERENCES compte.utilisateur (id) ON DELETE CASCADE,
    empreinte bytea NOT NULL UNIQUE,
    cree_le timestamptz NOT NULL,
    expire_le timestamptz NOT NULL
);
CREATE INDEX session_utilisateur ON compte.session (utilisateur_id);
