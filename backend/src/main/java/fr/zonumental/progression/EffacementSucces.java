package fr.zonumental.progression;

import fr.zonumental.compte.CompteSupprime;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Suppression du compte (RG-014) : efface les succès de l'utilisateur. Idempotent (ADR 0008). */
@Component
class EffacementSucces {

  private final JdbcClient jdbc;

  EffacementSucces(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  @ApplicationModuleListener
  void sur(CompteSupprime evenement) {
    jdbc.sql("delete from progression.succes_obtenu where utilisateur_id = ?")
        .param(evenement.utilisateurId())
        .update();
  }
}
