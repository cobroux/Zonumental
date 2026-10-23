package fr.zonumental.catalogue;

import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** Ce que le module capture a le droit de lire d'un monument : rayon, distance, histoire. */
@Service
public class Cibles {

  public record Histoire(String texte, String sourceUrl, String licence) {}

  /** {@code distanceMetres} : géodésique exacte, non arrondie (RG-046). */
  public record Cible(int rayonMetres, double distanceMetres, Histoire histoire) {}

  private final JdbcClient jdbc;

  Cibles(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Vide si le monument n'existe pas (ou plus) au catalogue. */
  public Optional<Cible> pour(int numero, double latitude, double longitude) {
    return jdbc.sql(
            "select rayon_capture_m, histoire_texte, histoire_source_url, histoire_licence,"
                + " ST_Distance(position, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography)"
                + " as distance from catalogue.monument where numero = :numero")
        .param("lon", longitude)
        .param("lat", latitude)
        .param("numero", numero)
        .query(
            (r, i) ->
                new Cible(
                    r.getInt("rayon_capture_m"),
                    r.getDouble("distance"),
                    r.getString("histoire_texte") == null
                        ? null
                        : new Histoire(
                            r.getString("histoire_texte"),
                            r.getString("histoire_source_url"),
                            r.getString("histoire_licence"))))
        .optional();
  }
}
