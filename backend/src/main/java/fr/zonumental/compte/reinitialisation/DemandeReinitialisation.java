package fr.zonumental.compte.reinitialisation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.text.Normalizer;

/** Corps de `POST /api/compte/mot-de-passe/reinitialisation` (RG-006 : 12 caractères minimum). */
record DemandeReinitialisation(
    String jeton, @NotNull @Size(min = 12, max = 128) String nouveauMotDePasse) {

  DemandeReinitialisation {
    if (nouveauMotDePasse != null) {
      nouveauMotDePasse = Normalizer.normalize(nouveauMotDePasse, Normalizer.Form.NFC);
    }
  }

  /** Jamais de mot de passe dans les journaux. */
  @Override
  public String toString() {
    return "DemandeReinitialisation[]";
  }
}
