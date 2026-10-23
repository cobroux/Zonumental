package fr.zonumental.compte;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** Ce que les autres modules ont le droit de savoir d'un compte. */
@Service
public class Comptes {

  private final JdbcClient jdbc;

  Comptes(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Faux aussi si le compte n'existe plus. */
  public boolean emailVerifie(UUID utilisateur) {
    return jdbc.sql("select email_verifie_le is not null from compte.utilisateur where id = ?")
        .param(utilisateur)
        .query(Boolean.class)
        .optional()
        .orElse(false);
  }
}
