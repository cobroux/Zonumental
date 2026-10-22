-- Dernier numéro attribué (RG-019) : survit à la suppression d'un monument, donc jamais réutilisé.
CREATE TABLE catalogue.numerotation (
    id      boolean PRIMARY KEY DEFAULT true CHECK (id),
    dernier int NOT NULL CHECK (dernier >= 0)
);
INSERT INTO catalogue.numerotation (dernier)
SELECT coalesce(max(numero), 0) FROM catalogue.monument;
