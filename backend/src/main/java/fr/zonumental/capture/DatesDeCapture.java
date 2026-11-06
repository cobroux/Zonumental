package fr.zonumental.capture;

import fr.zonumental.catalogue.CapturesExplorateur;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Fournit au catalogue l'état capturé de l'explorateur courant (RG-037). */
@Component
class DatesDeCapture implements CapturesExplorateur {

  private final JdbcClient jdbc;

  DatesDeCapture(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public Map<Integer, OffsetDateTime> datesDeCapture(UUID utilisateurId) {
    Map<Integer, OffsetDateTime> dates = new HashMap<>();
    jdbc.sql("select numero_monument, capturee_le from capture.capture where utilisateur_id = ?")
        .param(utilisateurId)
        .query(
            r -> {
              dates.put(
                  r.getInt("numero_monument"),
                  r.getObject("capturee_le", OffsetDateTime.class)
                      .withOffsetSameInstant(ZoneOffset.UTC));
            });
    return dates;
  }
}
