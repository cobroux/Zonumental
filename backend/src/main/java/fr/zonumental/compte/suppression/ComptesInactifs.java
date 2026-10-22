package fr.zonumental.compte.suppression;

import fr.zonumental.compte.courriel.Courriels;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * r0-socle-15 : avertit par e-mail les comptes vérifiés inactifs depuis 3 ans (RG-015). Appelé par
 * le passage nocturne de {@link PurgeComptes}, qui efface ensuite ceux restés sans retour.
 */
@Component
class ComptesInactifs {

  private static final Logger LOG = LoggerFactory.getLogger(ComptesInactifs.class);

  private record Cible(UUID id, String email) {}

  private final JdbcClient jdbc;
  private final Courriels courriels;
  private final ZoneId fuseau;

  ComptesInactifs(
      JdbcClient jdbc, Courriels courriels, @Value("${zonumental.purge.fuseau}") ZoneId fuseau) {
    this.jdbc = jdbc;
    this.courriels = courriels;
    this.fuseau = fuseau;
  }

  /**
   * Marque l'avertissement seulement une fois l'e-mail parti : un échec d'envoi laisse le compte
   * intact et sera retenté au passage suivant.
   */
  void avertir(OffsetDateTime maintenant, Duration inactivite, Duration preavis) {
    OffsetDateTime inactifDepuis = maintenant.minus(inactivite);
    List<Cible> cibles =
        jdbc.sql(
                "select id, email from compte.utilisateur where derniere_activite_le <= ?"
                    + " and email_verifie_le is not null and avertissement_inactivite_le is null"
                    + " and suppression_demandee_le is null")
            .param(inactifDepuis)
            .query((r, i) -> new Cible(r.getObject("id", UUID.class), r.getString("email")))
            .list();
    for (Cible c : cibles) {
      try {
        courriels.inactivite(
            c.email(), maintenant.plus(preavis).atZoneSameInstant(fuseau).toLocalDate());
        // Le where écarte un compte reconnecté depuis la sélection.
        jdbc.sql(
                "update compte.utilisateur set avertissement_inactivite_le = ?"
                    + " where id = ? and derniere_activite_le <= ?")
            .params(maintenant, c.id(), inactifDepuis)
            .update();
      } catch (RuntimeException e) {
        // Pas de trace complète : le message d'une erreur SMTP peut contenir l'adresse.
        LOG.warn(
            "Avertissement d'inactivité du compte {} échoué ({}), repris au prochain passage",
            c.id(),
            e.getClass().getSimpleName());
      }
    }
  }
}
