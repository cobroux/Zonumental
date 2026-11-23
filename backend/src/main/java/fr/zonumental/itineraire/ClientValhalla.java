package fr.zonumental.itineraire;

import fr.zonumental.commun.ErreurMetier;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

/**
 * Appel Valhalla {@code POST /route} (profil piéton, fr-FR). RG-036 : la position ne figure ni dans
 * l'URL ni dans les journaux ; on ne consigne jamais le message d'une exception du client HTTP ou
 * du moteur (il peut recopier l'URL ou le corps).
 */
class ClientValhalla {

  private static final Logger LOG = LoggerFactory.getLogger(ClientValhalla.class);

  record Etape(String instruction, int distanceMetres) {}

  record Trace(String type, List<double[]> coordinates) {}

  record Resultat(int distanceMetres, int dureeSecondes, Trace trace, List<Etape> etapes) {}

  record Lieu(double lat, double lon) {}

  /** toString masqué : Spring journalise le corps écrit en TRACE (RG-036). */
  record Requete(List<Lieu> locations, String costing, Map<String, String> directions_options) {
    @Override
    public String toString() {
      return "Requete[masquée]";
    }
  }

  private final RestClient client;

  ClientValhalla(RestClient client) {
    this.client = client;
  }

  Resultat route(double departLat, double departLng, double arriveeLat, double arriveeLng) {
    Requete corps =
        new Requete(
            List.of(new Lieu(departLat, departLng), new Lieu(arriveeLat, arriveeLng)),
            "pedestrian",
            Map.of("language", "fr-FR", "units", "kilometers"));
    JsonNode racine;
    try {
      racine = client.post().uri("/route").body(corps).retrieve().body(JsonNode.class);
    } catch (org.springframework.web.client.HttpClientErrorException e) {
      LOG.warn("moteur d'itinéraire : refus {}", e.getStatusCode().value());
      throw panne(HttpStatus.BAD_GATEWAY);
    } catch (RuntimeException e) {
      LOG.warn("moteur d'itinéraire : indisponible ({})", e.getClass().getSimpleName());
      throw panne(HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      return lire(racine);
    } catch (RuntimeException e) {
      LOG.warn("moteur d'itinéraire : réponse illisible");
      throw panne(HttpStatus.BAD_GATEWAY);
    }
  }

  private static Resultat lire(JsonNode racine) {
    JsonNode trip = racine.required("trip");
    JsonNode leg = trip.required("legs").get(0);
    List<Etape> etapes = new ArrayList<>();
    for (JsonNode m : leg.required("maneuvers")) {
      etapes.add(
          new Etape(
              m.required("instruction").asString(),
              (int) Math.round(m.required("length").asDouble() * 1000)));
    }
    JsonNode resume = trip.required("summary");
    return new Resultat(
        (int) Math.round(resume.required("length").asDouble() * 1000),
        (int) Math.round(resume.required("time").asDouble()),
        new Trace("LineString", decoder(leg.required("shape").asString())),
        etapes);
  }

  /** Polyline à 6 décimales de Valhalla, rendue en [lng, lat] (GeoJSON). */
  static List<double[]> decoder(String encode) {
    List<double[]> points = new ArrayList<>();
    int i = 0;
    long lat = 0;
    long lng = 0;
    while (i < encode.length()) {
      long[] d = new long[2];
      for (int k = 0; k < 2; k++) {
        long resultat = 0;
        int decalage = 0;
        int b;
        do {
          b = encode.charAt(i++) - 63;
          resultat |= (long) (b & 0x1f) << decalage;
          decalage += 5;
        } while (b >= 0x20);
        d[k] = (resultat & 1) != 0 ? ~(resultat >> 1) : resultat >> 1;
      }
      lat += d[0];
      lng += d[1];
      points.add(new double[] {lng / 1e6, lat / 1e6});
    }
    return points;
  }

  private static ErreurMetier panne(HttpStatus statut) {
    return new ErreurMetier(statut, "indisponible", Map.of(), Map.of("Retry-After", "30"));
  }
}
