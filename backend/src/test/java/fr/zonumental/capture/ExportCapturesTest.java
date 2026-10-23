package fr.zonumental.capture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** r1-capturer-7 : captures et photos dans l'export (R0-17, RG-013, RG-036, RG-037, RG-049). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ExportCapturesTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired StockagePhotos stockage;

  UUID marco = UUID.randomUUID();
  UUID autre = UUID.randomUUID();
  byte[] photo1 = {1, 2, 3, 4};
  byte[] photo2 = {9, 8, 7, 6, 5};

  @BeforeEach
  void donnees() {
    jdbc.update("delete from capture.capture");
    jdbc.update("delete from compte.utilisateur");
    jdbc.update("delete from catalogue.monument where numero in (9101, 9102, 9103)");
    jdbc.update("delete from catalogue.ville where code_insee = '99002'");
    jdbc.update("insert into catalogue.ville values ('99002', 'Exportville', 5)");
    monument(9101, "Tour A");
    monument(9102, "Tour B");
    monument(9103, "Tour C");
    utilisateur(marco, "marco@exemple.fr", "Marco");
    utilisateur(autre, "autre@exemple.fr", "Autre");
  }

  void monument(int numero, String nom) {
    jdbc.update(
        "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
            + " latitude, longitude, rarete, popularite) values (?, ?, ?, 'TOUR', '99002',"
            + " 48.0, 2.0, 'COMMUN', 1)",
        numero,
        "Q" + numero,
        nom);
  }

  void utilisateur(UUID id, String email, String pseudo) {
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " email_verifie_le, cree_le, derniere_activite_le) values (?, ?, ?, 'x',"
            + " '2000-01-01', now(), now(), now())",
        id,
        email,
        pseudo);
  }

  void capture(UUID utilisateur, int numero, double distance, byte[] jpeg, String le) {
    UUID photoId = UUID.randomUUID();
    stockage.deposer(utilisateur, photoId, jpeg);
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, capturee_le, distance_m,"
            + " photo_id) values (?, ?, ?::timestamptz, ?, ?)",
        utilisateur,
        numero,
        le,
        distance,
        photoId);
  }

  Map<String, byte[]> exporter(UUID qui) throws Exception {
    var debut =
        mvc.perform(get("/api/compte/export").with(jwt().jwt(j -> j.subject(qui.toString()))))
            .andExpect(request().asyncStarted())
            .andReturn();
    byte[] octets =
        mvc.perform(asyncDispatch(debut))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsByteArray();
    Map<String, byte[]> entrees = new LinkedHashMap<>();
    try (var zip = new ZipInputStream(new ByteArrayInputStream(octets))) {
      for (ZipEntry e = zip.getNextEntry(); e != null; e = zip.getNextEntry()) {
        entrees.put(e.getName(), zip.readAllBytes());
      }
    }
    return entrees;
  }

  @Test
  void deux_captures_avec_leurs_photos_identiques() throws Exception {
    capture(marco, 9101, 42.4, photo1, "2026-03-01T10:00:00Z");
    capture(marco, 9102, 120.0, photo2, "2026-03-02T11:00:00Z");
    capture(autre, 9103, 10, new byte[] {66}, "2026-03-03T11:00:00Z");

    Map<String, byte[]> zip = exporter(marco);

    assertThat(zip).containsOnlyKeys("donnees.json", "photos/9101.jpg", "photos/9102.jpg");
    assertThat(zip.get("photos/9101.jpg")).isEqualTo(photo1);
    assertThat(zip.get("photos/9102.jpg")).isEqualTo(photo2);
    String brut = new String(zip.get("donnees.json"), StandardCharsets.UTF_8);
    JsonNode captures = new ObjectMapper().readTree(brut).get("captures");
    assertThat(captures).hasSize(2);
    assertThat(captures.get(0).get("numero").asInt()).isEqualTo(9101);
    assertThat(captures.get(0).get("nom").asText()).isEqualTo("Tour A");
    assertThat(captures.get(0).get("captureeLe").asText()).startsWith("2026-03-01T10:00");
    assertThat(captures.get(0).get("distanceMetres").asInt()).isEqualTo(42);
    assertThat(captures.get(0).get("photo").asText()).isEqualTo("photos/9101.jpg");
    assertThat(captures.get(1).get("numero").asInt()).isEqualTo(9102);
    // Ni position, ni précision, ni clé de stockage, ni capture d'un autre (RG-036, RG-037).
    assertThat(brut.toLowerCase())
        .doesNotContain("latitude", "longitude", "precision", "captures/", "photo_id", "photoid")
        .doesNotContain(marco.toString(), autre.toString(), "9103");
  }

  @Test
  void sans_capture_pas_de_dossier_photos() throws Exception {
    Map<String, byte[]> zip = exporter(marco);

    assertThat(zip).containsOnlyKeys("donnees.json");
    assertThat(new ObjectMapper().readTree(zip.get("donnees.json")).get("captures")).isEmpty();
  }
}
