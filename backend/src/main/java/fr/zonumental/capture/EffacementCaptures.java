package fr.zonumental.capture;

import fr.zonumental.compte.CompteSupprime;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * Suppression du compte (RG-014) : efface les captures et le préfixe S3 de l'utilisateur.
 * Idempotent (rejouable) : si S3 échoue, la publication reste ouverte et est rejouée au redémarrage
 * (ADR 0008).
 */
@Component
class EffacementCaptures {

  private final JdbcClient jdbc;
  private final StockagePhotos stockage;

  EffacementCaptures(JdbcClient jdbc, StockagePhotos stockage) {
    this.jdbc = jdbc;
    this.stockage = stockage;
  }

  @ApplicationModuleListener
  void sur(CompteSupprime evenement) {
    jdbc.sql("delete from capture.capture where utilisateur_id = ?")
        .param(evenement.utilisateurId())
        .update();
    stockage.supprimerTout(evenement.utilisateurId());
  }
}
