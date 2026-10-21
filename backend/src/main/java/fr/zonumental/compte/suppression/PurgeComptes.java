package fr.zonumental.compte.suppression;

import fr.zonumental.compte.CompteSupprime;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * r0-socle-14 : efface définitivement les comptes dont le délai est écoulé (RG-014, RG-005). Une
 * transaction par compte ; un échec n'arrête pas les autres et le compte est repris à la purge
 * suivante.
 */
@Component
class PurgeComptes {

  private static final Logger LOG = LoggerFactory.getLogger(PurgeComptes.class);

  private final JdbcClient jdbc;
  private final TransactionTemplate tx;
  private final ApplicationEventPublisher evenements;
  private final Clock horloge;
  private final Duration delai;

  PurgeComptes(
      JdbcClient jdbc,
      TransactionTemplate tx,
      ApplicationEventPublisher evenements,
      Clock horloge,
      @Value("${zonumental.compte.suppression-delai}") Duration delai) {
    this.jdbc = jdbc;
    this.tx = tx;
    this.evenements = evenements;
    this.horloge = horloge;
    this.delai = delai;
  }

  @Scheduled(cron = "${zonumental.purge.cron}", zone = "${zonumental.purge.fuseau}")
  void purger() {
    OffsetDateTime limite = OffsetDateTime.now(horloge).minus(delai);
    List<UUID> dus =
        jdbc.sql("select id from compte.utilisateur where suppression_demandee_le <= ?")
            .param(limite)
            .query(UUID.class)
            .list();
    for (UUID id : dus) {
      try {
        purger(id, limite);
      } catch (RuntimeException e) {
        LOG.error("Purge du compte {} échouée, reprise à la prochaine purge", id, e);
      }
    }
  }

  private void purger(UUID id, OffsetDateTime limite) {
    tx.executeWithoutResult(
        s -> {
          // Verrou + nouvelle lecture : une annulation ou une purge concurrente l'emporte.
          boolean du =
              !jdbc.sql(
                      "select id from compte.utilisateur where id = ?"
                          + " and suppression_demandee_le <= ? for update")
                  .params(id, limite)
                  .query(UUID.class)
                  .list()
                  .isEmpty();
          if (du) {
            evenements.publishEvent(new CompteSupprime(id));
            // Consentements, jetons et sessions suivent par ON DELETE CASCADE.
            jdbc.sql("delete from compte.utilisateur where id = ?").param(id).update();
          }
        });
  }
}
