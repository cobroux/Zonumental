package fr.zonumental.compte.session;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.text.Normalizer;
import java.util.Locale;

/**
 * Corps de `POST /api/auth/connexion` ; e-mail et mot de passe normalisés comme à l'inscription.
 */
record DemandeConnexion(
    @NotNull @Email @Size(max = 254) String email,
    @NotNull @Size(min = 1, max = 128) String motDePasse) {

  DemandeConnexion {
    if (email != null) {
      email = email.strip().toLowerCase(Locale.ROOT);
    }
    if (motDePasse != null) {
      motDePasse = Normalizer.normalize(motDePasse, Normalizer.Form.NFC);
    }
  }

  /** Jamais de mot de passe dans les journaux. */
  @Override
  public String toString() {
    return "DemandeConnexion[]";
  }
}
