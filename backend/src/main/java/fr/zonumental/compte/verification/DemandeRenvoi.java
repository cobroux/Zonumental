package fr.zonumental.compte.verification;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Locale;

/** Corps de `POST /api/compte/email/verification/renvoi` ; l'e-mail est normalisé. */
record DemandeRenvoi(@NotNull @Email @Size(max = 254) String email) {

  DemandeRenvoi {
    if (email != null) {
      email = email.strip().toLowerCase(Locale.ROOT);
    }
  }
}
