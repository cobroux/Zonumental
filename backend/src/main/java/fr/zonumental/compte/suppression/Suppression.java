package fr.zonumental.compte.suppression;

import fr.zonumental.compte.courriel.Courriels;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/** r0-socle-14 : demande de suppression, effet immédiat, effacement différé (RG-014, Q-9). */
@Service
class Suppression {

  private final JdbcClient jdbc;
  private final TransactionTemplate tx;
  private final Courriels courriels;
  private final Clock horloge;
  private final Duration delai;
  private final ZoneId fuseau;

  Suppression(
      JdbcClient jdbc,
      TransactionTemplate tx,
      Courriels courriels,
      Clock horloge,
      @Value("${zonumental.compte.suppression-delai}") Duration delai,
      @Value("${zonumental.purge.fuseau}") ZoneId fuseau) {
    this.jdbc = jdbc;
    this.tx = tx;
    this.courriels = courriels;
    this.horloge = horloge;
    this.delai = delai;
    this.fuseau = fuseau;
  }

  /** Idempotent : une demande déjà enregistrée garde sa date et n'envoie pas de second e-mail. */
  OffsetDateTime demander(UUID id) {
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    record Demande(String email, OffsetDateTime fin) {}
    Optional<Demande> nouvelle =
        tx.execute(
            s -> {
              Optional<String> email =
                  jdbc.sql(
                          "update compte.utilisateur set suppression_demandee_le = ?"
                              + " where id = ? and suppression_demandee_le is null returning email")
                      .params(maintenant, id)
                      .query(String.class)
                      .optional();
              email.ifPresent(
                  e ->
                      jdbc.sql("delete from compte.session where utilisateur_id = ?")
                          .param(id)
                          .update());
              return email.map(e -> new Demande(e, maintenant.plus(delai)));
            });
    // Après commit (ADR 0005).
    nouvelle.ifPresent(
        d -> courriels.suppression(d.email(), d.fin().atZoneSameInstant(fuseau).toLocalDate()));
    return nouvelle
        .map(Demande::fin)
        .orElseGet(
            () ->
                jdbc.sql("select suppression_demandee_le from compte.utilisateur where id = ?")
                    .param(id)
                    .query(OffsetDateTime.class)
                    .single()
                    .plus(delai));
  }
}
