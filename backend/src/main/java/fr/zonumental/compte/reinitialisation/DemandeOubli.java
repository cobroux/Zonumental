package fr.zonumental.compte.reinitialisation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Locale;

/** Corps de `POST /api/compte/mot-de-passe/oubli` ; l'e-mail est normalisé. */
record DemandeOubli(@NotNull @Email @Size(max = 254) String email) {

  DemandeOubli {
    if (email != null) {
      email = email.strip().toLowerCase(Locale.ROOT);
    }
  }
}
