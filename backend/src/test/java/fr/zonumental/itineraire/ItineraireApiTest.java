package fr.zonumental.itineraire;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.ThrowableProxyUtil;
import ch.qos.logback.core.read.ListAppender;
import com.sun.net.httpserver.HttpServer;
import fr.zonumental.TestcontainersConfiguration;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** itineraire-1 : proxy Valhalla (ADR 0025), avec un faux Valhalla local ; RG-036. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "zonumental.itineraire.quota-max=4")
class ItineraireApiTest {

  // Tour Eiffel (monument 9701, ville 99009)
  static final String DEPART_OK = "{\"latitude\":48.85612345,\"longitude\":2.29876543}";

  static final HttpServer VALHALLA = demarrer();
  static volatile int statutAmont = 200;
  static volatile String corpsAmont;
  static final List<String> RECUES = new CopyOnWriteArrayList<>();

  static HttpServer demarrer() {
    try {
      HttpServer s = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
      s.createContext(
          "/",
          ex -> {
            RECUES.add(
                ex.getRequestMethod()
                    + " "
                    + ex.getRequestURI()
                    + "\n"
                    + new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] corps = corpsAmont.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(statutAmont, corps.length);
            ex.getResponseBody().write(corps);
            ex.close();
          });
      s.start();
      return s;
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  @DynamicPropertySource
  static void url(DynamicPropertyRegistry r) {
    r.add("zonumental.itineraire.url", () -> "http://127.0.0.1:" + VALHALLA.getAddress().getPort());
  }

  /** Polyline à 6 décimales (algorithme Google), comme Valhalla. */
  static String encoder(double[][] latLng) {
    StringBuilder sb = new StringBuilder();
    long plat = 0;
    long plng = 0;
    for (double[] p : latLng) {
      long lat = Math.round(p[0] * 1e6);
      long lng = Math.round(p[1] * 1e6);
      for (long v : new long[] {lat - plat, lng - plng}) {
        long n = v < 0 ? ~(v << 1) : v << 1;
        while (n >= 0x20) {
          sb.append((char) ((0x20 | (n & 0x1f)) + 63));
          n >>= 5;
        }
        sb.append((char) (n + 63));
      }
      plat = lat;
      plng = lng;
    }
    return sb.toString();
  }

  static String reponseValhalla() {
    String shape =
        encoder(new double[][] {{48.8561, 2.2988}, {48.8570, 2.2960}, {48.8584, 2.2945}});
    return "{\"trip\":{\"summary\":{\"length\":1.84,\"time\":1380},\"legs\":[{\"shape\":\""
        + shape.replace("\\", "\\\\")
        + "\",\"maneuvers\":[{\"instruction\":\"Marchez vers le nord-ouest.\",\"length\":0.22},"
        + "{\"instruction\":\"Vous êtes arrivé.\",\"length\":0.0}]}]}}";
  }

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  final UUID moi = UUID.randomUUID();
  ListAppender<ILoggingEvent> journal;
  // Niveau le plus bavard sur ce qui voit passer la requête (TRACE sur la racine est trop lent).
  static final String[] NIVEAUX = {
    "fr.zonumental",
    "org.springframework.web",
    "org.springframework.http",
    "org.springframework.security",
    "org.springframework.test.web"
  };

  @BeforeEach
  void donnees() {
    nettoyer();
    jdbc.update("insert into catalogue.ville values ('99009', 'Itineraireville', 9)");
    jdbc.update(
        "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
            + " latitude, longitude, rarete, popularite) values (9701, 'Q9701', 'Tour test',"
            + " 'TOUR', '99009', 48.8584, 2.2945, 'COMMUN', 1)");
    statutAmont = 200;
    corpsAmont = reponseValhalla();
    RECUES.clear();
    Logger racine = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
    for (String nom : NIVEAUX) {
      ((Logger) LoggerFactory.getLogger(nom)).setLevel(Level.TRACE);
    }
    journal = new ListAppender<>();
    journal.start();
    racine.addAppender(journal);
  }

  @AfterEach
  void nettoyer() {
    jdbc.update("delete from catalogue.monument where numero = 9701");
    jdbc.update("delete from catalogue.ville where code_insee = '99009'");
    if (journal != null) {
      Logger racine = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
      racine.detachAppender(journal);
      for (String nom : NIVEAUX) {
        ((Logger) LoggerFactory.getLogger(nom)).setLevel(null);
      }
    }
  }

  ResultActions appeler(String depart, Object numero) throws Exception {
    return mvc.perform(
        post("/api/itineraire")
            .with(jwt().jwt(j -> j.subject(moi.toString())))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"depart\":" + depart + ",\"numero\":" + numero + "}"));
  }

  @Test
  void sansJeton401() throws Exception {
    mvc.perform(
            post("/api/itineraire")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"depart\":" + DEPART_OK + ",\"numero\":9701}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void itineraireTraduitLaReponseDuMoteur() throws Exception {
    appeler(DEPART_OK, 9701)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.distanceMetres").value(1840))
        .andExpect(jsonPath("$.dureeSecondes").value(1380))
        .andExpect(jsonPath("$.trace.type").value("LineString"))
        .andExpect(jsonPath("$.trace.coordinates.length()").value(3))
        .andExpect(jsonPath("$.trace.coordinates[0][0]").value(2.2988))
        .andExpect(jsonPath("$.trace.coordinates[0][1]").value(48.8561))
        .andExpect(jsonPath("$.trace.coordinates[2][0]").value(2.2945))
        .andExpect(jsonPath("$.etapes[0].instruction").value("Marchez vers le nord-ouest."))
        .andExpect(jsonPath("$.etapes[0].distanceMetres").value(220))
        .andExpect(jsonPath("$.etapes[1].distanceMetres").value(0));
  }

  @Test
  void requeteAmontEnPostPietonFrancaisDepartArrondiDestinationDuServeur() throws Exception {
    appeler(DEPART_OK, 9701).andExpect(status().isOk());
    assertThat(RECUES).hasSize(1);
    String recue = RECUES.getFirst();
    assertThat(recue).startsWith("POST /route\n"); // aucune position dans l'URL
    assertThat(recue)
        .contains("\"pedestrian\"", "fr-FR", "48.8561", "2.2988", "48.8584", "2.2945")
        .doesNotContain("48.85612345", "2.29876543");
  }

  @Test
  void monumentInconnu404() throws Exception {
    appeler(DEPART_OK, 9799)
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("introuvable"));
    assertThat(RECUES).isEmpty();
  }

  @Test
  void departInvalide400SansAppelAuMoteur() throws Exception {
    String lyon = "{\"latitude\":45.76,\"longitude\":4.83}";
    String tropLoin = "{\"latitude\":48.40,\"longitude\":2.70}"; // Fontainebleau : en IDF, > 10 km
    String hors = "{\"latitude\":95,\"longitude\":2.3}";
    for (String depart : List.of(lyon, tropLoin, hors, "{\"latitude\":48.85}", "null")) {
      appeler(depart, 9701)
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.code").value("validation"));
    }
    appeler(DEPART_OK, "null").andExpect(status().isBadRequest());
    assertThat(RECUES).isEmpty();
  }

  @Test
  void moteurEnPanne503() throws Exception {
    statutAmont = 500;
    corpsAmont = "{\"error\":\"boom\"}";
    appeler(DEPART_OK, 9701)
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().exists("Retry-After"))
        .andExpect(jsonPath("$.code").value("indisponible"))
        .andExpect(jsonPath("$.detail").doesNotExist());
  }

  @Test
  void moteurInjoignable503() throws Exception {
    HttpServer ferme = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    int port = ferme.getAddress().getPort();
    ferme.stop(0);
    // client dédié au port fermé
    ClientValhalla client =
        new ClientValhalla(
            org.springframework.web.client.RestClient.builder()
                .baseUrl("http://127.0.0.1:" + port)
                .build());
    org.assertj.core.api.Assertions.assertThatThrownBy(() -> client.route(48.85, 2.29, 48.86, 2.3))
        .isInstanceOf(fr.zonumental.commun.ErreurMetier.class)
        .extracting(e -> ((fr.zonumental.commun.ErreurMetier) e).statut().value())
        .isEqualTo(503);
  }

  @Test
  void reponseMoteurIllisible502() throws Exception {
    corpsAmont = "{\"trip\":{}}";
    appeler(DEPART_OK, 9701)
        .andExpect(status().isBadGateway())
        .andExpect(jsonPath("$.code").value("indisponible"));
    statutAmont = 400; // « aucun chemin » (442) : refus amont
    corpsAmont = "{\"error_code\":442,\"error\":\"No path could be found 48.8561,2.2988\"}";
    appeler(DEPART_OK, 9701)
        .andExpect(status().isBadGateway())
        .andExpect(jsonPath("$.code").value("indisponible"));
  }

  @Test
  void quotaParCompte429AvecRetryAfter() throws Exception {
    for (int i = 0; i < 4; i++) {
      appeler(DEPART_OK, 9701).andExpect(status().isOk());
    }
    appeler(DEPART_OK, 9701)
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists("Retry-After"))
        .andExpect(jsonPath("$.code").value("limite-frequence"));
    // un autre compte n'est pas touché
    mvc.perform(
            post("/api/itineraire")
                .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"depart\":" + DEPART_OK + ",\"numero\":9701}"))
        .andExpect(status().isOk());
  }

  /** RG-036 : ni journaux, ni messages d'erreur, ni base ne gardent la position. */
  @Test
  void aucunePositionDansLesJournauxLesErreursNiLaBase() throws Exception {
    long avant = lignes();
    String motifs = "48\\.8561|2\\.2987|2\\.2988|48\\.85612|2\\.29876";
    String[] erreursAmont = {
      "{\"error_code\":442,\"error\":\"No path 48.85612345,2.29876543\"}", "<html>2.29876543"
    };
    appeler(DEPART_OK, 9701).andExpect(status().isOk());
    for (int statut : new int[] {400, 500, 200}) {
      for (String corps : erreursAmont) {
        statutAmont = statut;
        corpsAmont = corps;
        String reponse = appeler(DEPART_OK, 9701).andReturn().getResponse().getContentAsString();
        assertThat(reponse).doesNotContainPattern(motifs);
      }
    }
    // départ invalide (valeur fournie ne doit pas être renvoyée non plus)
    String reponse =
        appeler("{\"latitude\":45.76123,\"longitude\":4.83123}", 9701)
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(reponse).doesNotContain("45.76123", "4.83123");
    // valeur rejetée par la validation : son message d'exception la recopierait en DEBUG
    appeler("{\"latitude\":95.12345,\"longitude\":2.3}", 9701).andExpect(status().isBadRequest());

    for (ILoggingEvent e : journal.list) {
      String texte =
          e.getFormattedMessage()
              + (e.getThrowableProxy() == null
                  ? ""
                  : ThrowableProxyUtil.asString(e.getThrowableProxy()))
              + e.getMDCPropertyMap();
      assertThat(texte).as(e.getLoggerName()).doesNotContainPattern(motifs);
      assertThat(texte).doesNotContain("45.76123", "4.83123", "95.12345");
    }
    assertThat(lignes()).isEqualTo(avant);
  }

  long lignes() {
    return jdbc.queryForObject(
        "select coalesce(sum((xpath('/row/c/text()', query_to_xml(format('select count(*) as c"
            + " from %I.%I', schemaname, tablename), false, true, '')))[1]::text::bigint), 0)"
            + " from pg_tables where schemaname not in ('pg_catalog', 'information_schema')",
        Long.class);
  }
}
