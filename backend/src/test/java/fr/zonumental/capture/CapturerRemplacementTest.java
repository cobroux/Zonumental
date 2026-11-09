package fr.zonumental.capture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import software.amazon.awssdk.services.s3.S3Client;

/** r1-capturer-4 : remplacement de la photo souvenir (R1-24 à R1-26, R1-65, R1-67 à R1-69). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CapturerRemplacementTest {

  static final double LAT = 45.76;
  static final double LON = 4.83;

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired S3Client s3;

  @Value("${zonumental.s3.bucket}")
  String bucket;

  UUID moi = UUID.randomUUID();
  byte[] png = ImagesDeTest.encoder(ImagesDeTest.image(300, 200), "png");
  UUID ancienne;

  @BeforeEach
  void donnees() {
    jdbc.update("delete from capture.capture");
    jdbc.update("delete from capture.refus");
    jdbc.update(
        "delete from catalogue.monument where numero in (9001, 9003) or numero between 9100 and 9109");
    jdbc.update("delete from catalogue.ville where code_insee = '99001'");
    jdbc.update("insert into catalogue.ville values ('99001', 'Testville', 1)");
    monument(9001, LAT);
    monument(9003, 51.2); // ~600 km au nord de 9001
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " email_verifie_le, cree_le, derniere_activite_le) values (?, ?, ?, 'x',"
            + " '2000-01-01', ?, now(), now())",
        moi,
        moi + "@exemple.fr",
        "rem" + moi.toString().substring(0, 8),
        Timestamp.from(Instant.now()));
    ancienne = captureIl(9001, 1440); // capturée hier
    s3.putObject(
        b -> b.bucket(bucket).key("captures/" + moi + "/" + ancienne + ".jpg"),
        software.amazon.awssdk.core.sync.RequestBody.fromBytes(new byte[] {1}));
  }

  void monument(int numero, double lat) {
    jdbc.execute(
        "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
            + " latitude, longitude, rarete, popularite, histoire_texte, histoire_source_url,"
            + " histoire_licence) values ("
            + numero
            + ", 'Q"
            + numero
            + "', 'Tour', 'TOUR', '99001', "
            + lat
            + ", "
            + LON
            + ", 'COMMUN', 1, 'Une histoire.', 'https://fr.wikipedia.org/wiki/T', 'CC BY-SA 4.0')");
  }

  UUID captureIl(int numero, int minutes) {
    UUID photo = UUID.randomUUID();
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id,"
            + " capturee_le) values (?, ?, 1, ?, now() - ? * interval '1 minute')",
        moi,
        numero,
        photo,
        minutes);
    return photo;
  }

  double latitudeAuNord(double metres) {
    return jdbc.queryForObject(
        "select ST_Y(ST_Project(ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?, 0)::geometry)",
        Double.class,
        LON,
        LAT,
        metres);
  }

  ResultActions envoyer(int numero, double lat, boolean remplacer, byte[] photo) throws Exception {
    var r =
        multipart("/api/captures")
            .file(new MockMultipartFile("photo", "p.jpg", "image/jpeg", photo))
            .param("numero", String.valueOf(numero))
            .param("latitude", String.valueOf(lat))
            .param("longitude", String.valueOf(LON))
            .param("precisionMetres", "10");
    if (remplacer) {
      r.param("remplacer", "true");
    }
    return mvc.perform(r.with(jwt().jwt(j -> j.subject(moi.toString()))));
  }

  List<String> cles() {
    return s3
        .listObjectsV2(b -> b.bucket(bucket).prefix("captures/" + moi + "/"))
        .contents()
        .stream()
        .map(o -> o.key())
        .toList();
  }

  @Test
  void sans_demande_de_remplacement_deja_capture_et_rien_ne_change() throws Exception {
    envoyer(9001, LAT, false, png)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("deja-capture"));
    assertThat(cles()).containsExactly("captures/" + moi + "/" + ancienne + ".jpg");
  }

  @Test
  void remplacement_a_50_m_nouvelle_photo_ancienne_effacee_date_et_compteur_inchanges()
      throws Exception {
    var avant = jdbc.queryForObject("select capturee_le from capture.capture", Timestamp.class);
    envoyer(9001, latitudeAuNord(50), true, png)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.numero").value(9001))
        .andExpect(jsonPath("$.photoUrl").value("/api/captures/9001/photo"))
        .andExpect(jsonPath("$.histoire.texte").value("Une histoire."));
    assertThat(jdbc.queryForObject("select count(*) from capture.capture", Integer.class))
        .isEqualTo(1);
    assertThat(jdbc.queryForObject("select capturee_le from capture.capture", Timestamp.class))
        .isEqualTo(avant);
    UUID nouvelle = jdbc.queryForObject("select photo_id from capture.capture", UUID.class);
    assertThat(nouvelle).isNotEqualTo(ancienne);
    assertThat(cles()).containsExactly("captures/" + moi + "/" + nouvelle + ".jpg");
  }

  @Test
  void remplacement_a_500_m_refuse_ancienne_conservee() throws Exception {
    envoyer(9001, latitudeAuNord(500), true, png)
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("trop-loin"));
    assertThat(jdbc.queryForObject("select photo_id from capture.capture", UUID.class))
        .isEqualTo(ancienne);
    assertThat(cles()).containsExactly("captures/" + moi + "/" + ancienne + ".jpg");
  }

  @Test
  void fichier_invalide_sans_remplacement_reste_deja_capture() throws Exception {
    envoyer(9001, LAT, false, new byte[] {1})
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("deja-capture"));
  }

  @Test
  void remplacement_avec_fichier_invalide_refuse_ancienne_conservee() throws Exception {
    envoyer(9001, LAT, true, new byte[] {1})
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("image-invalide"));
    assertThat(jdbc.queryForObject("select photo_id from capture.capture", UUID.class))
        .isEqualTo(ancienne);
  }

  @Test
  void vitesse_ne_s_applique_pas_au_remplacement() throws Exception {
    captureIl(9003, 10); // autre monument à 600 km, capturé il y a 10 min
    envoyer(9001, LAT, true, png).andExpect(status().isOk());
  }

  @Test
  void dix_captures_dans_l_heure_remplacement_refuse_avec_delai() throws Exception {
    for (int i = 0; i < 10; i++) {
      monument(9100 + i, LAT);
      captureIl(9100 + i, 5 + i);
    }
    envoyer(9001, LAT, true, png)
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.code").value("limite-frequence"))
        .andExpect(header().exists("Retry-After"));
    assertThat(
            jdbc.queryForObject(
                "select photo_id from capture.capture where numero_monument = 9001", UUID.class))
        .isEqualTo(ancienne);
  }

  @Test
  void remplacement_d_un_monument_non_capture_404() throws Exception {
    envoyer(9003, 51.2, true, png)
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("introuvable"));
  }
}
