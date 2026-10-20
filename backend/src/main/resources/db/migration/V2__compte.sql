-- Sessions et tentatives de connexion arrivent avec r0-socle-8 et -9.
CREATE TABLE compte.utilisateur (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    pseudo text NOT NULL CHECK (pseudo ~ '^[A-Za-z0-9_-]{3,20}$'),
    mot_de_passe_hash text NOT NULL,
    date_naissance date NOT NULL,
    email_verifie_le timestamptz,
    cree_le timestamptz NOT NULL,
    derniere_activite_le timestamptz NOT NULL,
    suppression_demandee_le timestamptz,
    avertissement_inactivite_le timestamptz,
    CONSTRAINT utilisateur_email_unique UNIQUE (email)
);
CREATE UNIQUE INDEX utilisateur_pseudo_unique ON compte.utilisateur (lower(pseudo));

-- Journal en ajout seul : l'état courant est la dernière ligne par type (ADR 0008).
CREATE TABLE compte.consentement (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    utilisateur_id uuid NOT NULL REFERENCES compte.utilisateur (id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('CGU', 'CONFIDENTIALITE', 'CLASSEMENT', 'EMAILS')),
    accorde boolean NOT NULL,
    version_texte text NOT NULL,
    horodatage timestamptz NOT NULL
);
CREATE INDEX consentement_utilisateur_type ON compte.consentement (utilisateur_id, type, horodatage DESC);

CREATE TABLE compte.jeton (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    utilisateur_id uuid NOT NULL REFERENCES compte.utilisateur (id) ON DELETE CASCADE,
    usage text NOT NULL CHECK (usage IN ('VERIFICATION_EMAIL', 'REINITIALISATION_MDP')),
    empreinte bytea NOT NULL UNIQUE,
    cree_le timestamptz NOT NULL,
    expire_le timestamptz NOT NULL,
    utilise_le timestamptz
);
