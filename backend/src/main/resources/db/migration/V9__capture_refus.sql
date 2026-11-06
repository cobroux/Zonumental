-- RG-049, Q-27 : journal des refus de capture. Type, date et compte seulement, jamais de position.
-- Purgé après 30 jours (PurgeRefus).
CREATE TABLE capture.refus (
    utilisateur_id uuid NOT NULL,
    type text NOT NULL,
    refuse_le timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refus_refuse_le_idx ON capture.refus (refuse_le);
CREATE INDEX refus_utilisateur_idx ON capture.refus (utilisateur_id);
