package fr.zonumental.capture;

import fr.zonumental.compte.CapturesExportables;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Fournit à l'export du compte ses captures et ses photos (RG-013, RG-037). */
@Component
class ExportCaptures implements CapturesExportables {

  private final JdbcClient jdbc;
  private final StockagePhotos stockage;

  ExportCaptures(JdbcClient jdbc, StockagePhotos stockage) {
    this.jdbc = jdbc;
    this.stockage = stockage;
  }

  @Override
  public List<Capture> captures(UUID utilisateur) {
    return jdbc.sql(
            "select c.numero_monument, m.nom, c.capturee_le, c.distance_m"
                + " from capture.capture c join catalogue.monument m on m.numero = c.numero_monument"
                + " where c.utilisateur_id = ? order by c.numero_monument")
        .param(utilisateur)
        .query(
            (r, i) ->
                new Capture(
                    r.getInt("numero_monument"),
                    r.getString("nom"),
                    r.getObject("capturee_le", OffsetDateTime.class),
                    Math.round(r.getDouble("distance_m"))))
        .list();
  }

  @Override
  public boolean photoPresente(UUID utilisateur, int numero) {
    return photoId(utilisateur, numero).map(p -> stockage.existe(utilisateur, p)).orElse(false);
  }

  private Optional<UUID> photoId(UUID utilisateur, int numero) {
    return jdbc.sql(
            "select photo_id from capture.capture where utilisateur_id = ? and numero_monument = ?")
        .params(utilisateur, numero)
        .query(UUID.class)
        .optional();
  }

  @Override
  public Optional<byte[]> photo(UUID utilisateur, int numero) {
    return photoId(utilisateur, numero).flatMap(photo -> stockage.lire(utilisateur, photo));
  }
}
