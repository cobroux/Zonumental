package fr.zonumental.capture;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** RG-049, Q-27 : le journal des refus ne dépasse pas 30 jours. */
@Component
class PurgeRefus {

  private final JdbcClient jdbc;
  private final Duration retention;

  PurgeRefus(JdbcClient jdbc, @Value("${zonumental.capture.refus-retention}") Duration retention) {
    this.jdbc = jdbc;
    this.retention = retention;
  }

  @Scheduled(cron = "${zonumental.purge.cron}", zone = "${zonumental.purge.fuseau}")
  void purger() {
    jdbc.sql("delete from capture.refus where refuse_le < now() - make_interval(secs => ?)")
        .param(retention.toSeconds())
        .update();
  }
}
