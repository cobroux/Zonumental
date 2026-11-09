package fr.zonumental.compte;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Succès d'un compte pour l'export (RG-013). Implémenté par le module {@code progression}. */
public interface SuccesExportables {

  record Succes(String code, OffsetDateTime obtenuLe) {}

  /** Triés par date d'obtention puis code. */
  List<Succes> succes(UUID utilisateur);
}
