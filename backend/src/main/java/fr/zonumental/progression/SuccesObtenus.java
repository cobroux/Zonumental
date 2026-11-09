package fr.zonumental.progression;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Succès obtenus (RG-R2-01) : une fois par couple (utilisateur, code), jamais retirés. */
@Component
class SuccesObtenus {

  private final JdbcClient jdbc;

  SuccesObtenus(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Vrai si le succès vient d'être obtenu, faux s'il l'était déjà. */
  boolean enregistrer(UUID utilisateurId, String code) {
    return jdbc.sql(
                "insert into progression.succes_obtenu (utilisateur_id, code) values (?, ?)"
                    + " on conflict do nothing")
            .params(utilisateurId, code)
            .update()
        == 1;
  }
}
