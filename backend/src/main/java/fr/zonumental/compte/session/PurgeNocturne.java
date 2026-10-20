package fr.zonumental.compte.session;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** r0-socle-9 : purge des compteurs d'échecs anciens et des sessions expirées. */
@Component
class PurgeNocturne {

  private final JdbcClient jdbc;
  private final Clock horloge;
  private final Duration retention;

  PurgeNocturne(
      JdbcClient jdbc,
      Clock horloge,
      @Value("${zonumental.compte.connexion-retention}") Duration retention) {
    this.jdbc = jdbc;
    this.horloge = horloge;
    this.retention = retention;
  }

  @Scheduled(cron = "${zonumental.purge.cron}", zone = "${zonumental.purge.fuseau}")
  void purger() {
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    jdbc.sql("delete from compte.tentative_connexion where derniere_tentative_le < ?")
        .param(maintenant.minus(retention))
        .update();
    jdbc.sql("delete from compte.session where expire_le < ?").param(maintenant).update();
  }
}
