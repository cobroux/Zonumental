package fr.zonumental.compte;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Captures d'un compte pour l'export (RG-013). Défini ici et implémenté par le module {@code
 * capture} (qui dépend déjà de {@code compte}) : évite un cycle entre modules.
 */
public interface CapturesExportables {

  record Capture(int numero, String nom, OffsetDateTime captureeLe, long distanceMetres) {}

  /** Triées par numéro de monument ; jamais de position ni de clé de stockage. */
  List<Capture> captures(UUID utilisateur);

  /** Une photo à la fois : l'export ne garde jamais toutes les photos en mémoire. */
  Optional<byte[]> photo(UUID utilisateur, int numero);
}
