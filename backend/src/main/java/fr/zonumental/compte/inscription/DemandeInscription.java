package fr.zonumental.compte.inscription;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Locale;

/**
 * Corps de `POST /api/compte/inscription` ; e-mail et mot de passe sont normalisés à la lecture.
 */
public record DemandeInscription(
    @NotNull @Pattern(regexp = "^[A-Za-z0-9_-]{3,20}$") String pseudo,
    @NotNull @Email @Size(max = 254) String email,
    @NotNull @Size(min = 12, max = 128) String motDePasse,
    @NotNull LocalDate dateNaissance,
    @NotNull @Valid Consentements consentements) {

  public DemandeInscription {
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
    return "DemandeInscription[]";
  }

  public record Consentements(
      @NotNull Boolean cgu,
      @NotNull Boolean confidentialite,
      @NotNull String versionCgu,
      @NotNull String versionConfidentialite,
      @NotNull Boolean classement,
      @NotNull Boolean emails) {}
}
