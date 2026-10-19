CREATE TABLE catalogue.ville (
    code_insee text PRIMARY KEY,
    nom        text NOT NULL,
    quota      int  NOT NULL CHECK (quota >= 0)
);

CREATE TABLE catalogue.monument (
    numero            int PRIMARY KEY,
    wikidata_id       text NOT NULL UNIQUE,
    merimee_id        text,
    nom               text NOT NULL,
    type              text NOT NULL,
    ville_code_insee  text NOT NULL REFERENCES catalogue.ville (code_insee),
    latitude          double precision NOT NULL,
    longitude         double precision NOT NULL,
    position          geography(Point, 4326) GENERATED ALWAYS AS
                      (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
    rayon_capture_m   int NOT NULL DEFAULT 150 CHECK (rayon_capture_m BETWEEN 50 AND 500),
    rarete            text NOT NULL CHECK (rarete IN ('COMMUN', 'RARE', 'LEGENDAIRE')),
    popularite        bigint NOT NULL,
    annee             int,
    style             text,
    hauteur_m         numeric(6, 1),
    histoire_texte    text,
    histoire_source_url text,
    histoire_licence  text,
    image_url         text,
    image_source_url  text,
    image_licence     text,
    image_licence_url text,
    image_auteur      text,
    cree_le           timestamptz NOT NULL DEFAULT now(),
    mis_a_jour_le     timestamptz NOT NULL DEFAULT now(),
    CHECK (image_url IS NULL OR image_licence IS NOT NULL),
    CHECK (histoire_texte IS NULL OR histoire_licence IS NOT NULL)
);

CREATE INDEX monument_position_idx ON catalogue.monument USING gist (position);
CREATE INDEX monument_ville_idx ON catalogue.monument (ville_code_insee);
