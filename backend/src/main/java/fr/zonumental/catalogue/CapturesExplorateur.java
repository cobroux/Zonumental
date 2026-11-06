package fr.zonumental.catalogue;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/** Port : défini ici, implémenté par le module {@code capture} (évite un cycle de modules). */
public interface CapturesExplorateur {

  /** Numéro de monument -> date de capture, pour cet explorateur seulement (RG-037). */
  Map<Integer, OffsetDateTime> datesDeCapture(UUID utilisateurId);
}
