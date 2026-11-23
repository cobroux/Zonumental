package fr.zonumental.itineraire;

import fr.zonumental.commun.ErreurMetier;
import fr.zonumental.itineraire.ClientValhalla.Etape;
import fr.zonumental.itineraire.ClientValhalla.Resultat;
import fr.zonumental.itineraire.ClientValhalla.Trace;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Itinéraire à pied jusqu'à un monument (ADR 0025). POST pour que la position n'entre jamais dans
 * une URL ; la destination vient du catalogue, pas du client ; rien n'est stocké ni journalisé
 * (RG-036) : les erreurs ne recopient aucune valeur du départ.
 */
@RestController
@Tag(name = "itineraire")
class ItineraireController {

  record Point(
      @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
      @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {
    // Spring journalise le corps lu en TRACE via toString : RG-036.
    @Override
    public String toString() {
      return "Point[masqué]";
    }
  }

  record Demande(@NotNull @Valid Point depart, @NotNull @Min(1) Integer numero) {}

  record Reponse(int distanceMetres, int dureeSecondes, Trace trace, List<Etape> etapes) {}

  // Boîte englobante de l'Île-de-France (approximation).
  private static final double LAT_MIN = 48.1;
  private static final double LAT_MAX = 49.25;
  private static final double LNG_MIN = 1.4;
  private static final double LNG_MAX = 3.6;

  private final JdbcClient jdbc;
  private final ClientValhalla valhalla;
  private final QuotaItineraire quota;
  private final double distanceMaxKm;

  ItineraireController(
      JdbcClient jdbc,
      ClientValhalla valhalla,
      QuotaItineraire quota,
      @Value("${zonumental.itineraire.distance-max-km:10}") double distanceMaxKm) {
    this.jdbc = jdbc;
    this.valhalla = valhalla;
    this.quota = quota;
    this.distanceMaxKm = distanceMaxKm;
  }

  record Destination(double latitude, double longitude) {}

  @PostMapping("/api/itineraire")
  @Operation(
      operationId = "calculerItineraire",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "400"),
        @ApiResponse(responseCode = "401"),
        @ApiResponse(responseCode = "404"),
        @ApiResponse(responseCode = "429"),
        @ApiResponse(responseCode = "502"),
        @ApiResponse(responseCode = "503")
      })
  Reponse calculer(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Demande demande) {
    Destination d =
        jdbc.sql("select latitude, longitude from catalogue.monument where numero = :n")
            .param("n", demande.numero())
            .query((rs, i) -> new Destination(rs.getDouble(1), rs.getDouble(2)))
            .optional()
            .orElseThrow(() -> new ErreurMetier(HttpStatus.NOT_FOUND, "introuvable"));
    // ~10 m (RG-036, minimisation) avant toute vérification et tout appel amont.
    double lat = arrondir(demande.depart().latitude());
    double lng = arrondir(demande.depart().longitude());
    if (lat < LAT_MIN
        || lat > LAT_MAX
        || lng < LNG_MIN
        || lng > LNG_MAX
        || kilometres(lat, lng, d.latitude(), d.longitude()) > distanceMaxKm) {
      throw new ErreurMetier(
          HttpStatus.BAD_REQUEST,
          "validation",
          Map.of("erreurs", List.of(Map.of("champ", "depart", "code", "format"))));
    }
    quota.consommer(UUID.fromString(jwt.getSubject()));
    Resultat r = valhalla.route(lat, lng, d.latitude(), d.longitude());
    return new Reponse(r.distanceMetres(), r.dureeSecondes(), r.trace(), r.etapes());
  }

  private static double arrondir(double v) {
    return Math.round(v * 1e4) / 1e4;
  }

  /** Haversine. */
  private static double kilometres(double lat1, double lng1, double lat2, double lng2) {
    double a =
        Math.pow(Math.sin(Math.toRadians(lat2 - lat1) / 2), 2)
            + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.pow(Math.sin(Math.toRadians(lng2 - lng1) / 2), 2);
    return 6371 * 2 * Math.asin(Math.sqrt(a));
  }
}
