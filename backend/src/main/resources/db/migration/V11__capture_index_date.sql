-- Défis (ADR 0024) : progression dérivée des captures par fenêtre de dates.
CREATE INDEX capture_capturee_le_idx ON capture.capture (capturee_le);
