-- Renvoi, anti-rafale et invalidation des jetons lisent par utilisateur.
CREATE INDEX jeton_utilisateur ON compte.jeton (utilisateur_id);
