package fr.zonumental.capture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
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
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import software.amazon.awssdk.services.s3.S3Client;

/** r1-capturer-2 : contrôles serveur dans l'ordre RG-053 et enregistrement (RG-048, RG-049). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CapturerTest {

  static final double LAT = 45.76;
  static final double LON = 4.83;

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired S3Client s3;

  @Value("${zonumental.s3.bucket}")
  String bucket;

  UUID moi = UUID.randomUUID();
  byte[] png = ImagesDeTest.encoder(ImagesDeTest.image(300, 200), "png");

  @BeforeEach
  void donnees() {
    jdbc.update("delete from capture.capture");
    jdbc.update("delete from catalogue.monument where numero in (9001, 9002)");
    jdbc.update("delete from catalogue.ville where code_insee = '99001'");
    jdbc.update("insert into catalogue.ville values ('99001', 'Testville', 1)");
    monument(9001, "'Une histoire.', 'https://fr.wikipedia.org/wiki/T', 'CC BY-SA 4.0'");
    monument(9002, "null, null, null");
    utilisateur(moi, true);
  }

  void monument(int numero, String histoire) {
    jdbc.execute(
        "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
            + " latitude, longitude, rarete, popularite, histoire_texte, histoire_source_url,"
            + " histoire_licence) values ("
            + numero
            + ", 'Q"
            + numero
            + "', 'Tour', 'TOUR', '99001', "
            + LAT
            + ", "
            + LON
            + ", 'COMMUN', 1, "
            + histoire
            + ")");
  }

  void utilisateur(UUID id, boolean verifie) {
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " email_verifie_le, cree_le, derniere_activite_le) values (?, ?, ?, 'x',"
            + " '2000-01-01', ?, now(), now())",
        id,
        id + "@exemple.fr",
        "cap" + id.toString().substring(0, 8),
        verifie ? Timestamp.from(Instant.now()) : null);
  }

  /** Latitude d'un point à {@code metres} mètres au nord du monument (calcul PostGIS). */
  double latitudeAuNord(double metres) {
    return jdbc.queryForObject(
        "select ST_Y(ST_Project(ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?, 0)::geometry)",
        Double.class,
        LON,
        LAT,
        metres);
  }

  ResultActions envoyer(UUID qui, int numero, double lat, double precision, byte[] photo)
      throws Exception {
    MockMultipartHttpServletRequestBuilder r =
        multipart("/api/captures")
            .file(new MockMultipartFile("photo", "p.jpg", "image/jpeg", photo))
            .param("numero", String.valueOf(numero))
            .param("latitude", String.valueOf(lat))
            .param("longitude", String.valueOf(LON))
            .param("precisionMetres", String.valueOf(precision));
    return mvc.perform(qui == null ? r : r.with(jwt().jwt(j -> j.subject(qui.toString()))));
  }

  int objets() {
    return s3.listObjectsV2(b -> b.bucket(bucket).prefix("captures/" + moi + "/"))
        .contents()
        .size();
  }

  int lignes() {
    return jdbc.queryForObject("select count(*) from capture.capture", Integer.class);
  }

  // ---------------------------------------------------------------- succès

  @Test
  void capture_reussie_201_histoire_debloquee_et_rien_d_autre_conserve() throws Exception {
    envoyer(moi, 9001, latitudeAuNord(42.4), 30, png)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.numero").value(9001))
        .andExpect(jsonPath("$.distanceMetres").value(42))
        .andExpect(jsonPath("$.photoUrl").value("/api/captures/9001/photo"))
        .andExpect(jsonPath("$.captureeLe").isNotEmpty())
        .andExpect(jsonPath("$.histoire.texte").value("Une histoire."))
        .andExpect(jsonPath("$.histoire.sourceUrl").value("https://fr.wikipedia.org/wiki/T"))
        .andExpect(jsonPath("$.histoire.licence").value("CC BY-SA 4.0"));
    assertThat(lignes()).isEqualTo(1);
    assertThat(objets()).isEqualTo(1);
    // RG-049 : ni position, ni précision, ni appareil dans la table.
    assertThat(
            jdbc.queryForList(
                "select column_name from information_schema.columns"
                    + " where table_schema = 'capture' and table_name = 'capture'",
                String.class))
        .containsExactlyInAnyOrder(
            "utilisateur_id", "numero_monument", "capturee_le", "distance_m", "photo_id");
    // RG-048 : date posée par le serveur.
    assertThat(
            jdbc.queryForObject(
                "select abs(extract(epoch from now() - capturee_le)) < 60 from capture.capture",
                Boolean.class))
        .isTrue();
  }

  @Test
  void monument_sans_histoire_renvoie_histoire_nulle() throws Exception {
    envoyer(moi, 9002, LAT, 10, png)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.histoire").value(nullValue()));
  }

  @Test
  void precision_de_100_m_exactement_est_acceptee() throws Exception {
    envoyer(moi, 9001, LAT, 100, png).andExpect(status().isCreated());
  }

  // ---------------------------------------------------------------- ordre RG-053
  // Chaque test viole l'étape visée ET toutes les suivantes : l'étape visée l'emporte.

  @Test
  void etape1_sans_jeton_401() throws Exception {
    envoyer(null, 9999, 0, 500, new byte[] {1}).andExpect(status().isUnauthorized());
  }

  @Test
  void etape2_email_non_verifie_403() throws Exception {
    UUID non = UUID.randomUUID();
    utilisateur(non, false);
    envoyer(non, 9999, 0, 500, new byte[] {1})
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("email-non-verifie"));
  }

  @Test
  void etape3_monument_inconnu_404() throws Exception {
    envoyer(moi, 9999, 0, 500, new byte[] {1})
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("introuvable"));
  }

  @Test
  void etape4_deja_capture_409() throws Exception {
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id)"
            + " values (?, 9001, 1, ?)",
        moi,
        UUID.randomUUID());
    envoyer(moi, 9001, 0, 500, new byte[] {1})
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("deja-capture"));
  }

  @Test
  void etape5_image_invalide_422() throws Exception {
    envoyer(moi, 9001, 0, 500, new byte[] {1})
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("image-invalide"));
    assertThat(objets()).isZero();
  }

  @Test
  void etape7_precision_insuffisante_422() throws Exception {
    envoyer(moi, 9001, 0, 100.5, png)
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("precision-insuffisante"));
    assertThat(lignes()).isZero();
    assertThat(objets()).isZero();
  }

  @Test
  void etape8_trop_loin_422_distance_arrondie_a_la_dizaine_superieure() throws Exception {
    envoyer(moi, 9001, latitudeAuNord(155.2), 10, png)
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("trop-loin"))
        .andExpect(jsonPath("$.distanceMetres").value(160));
    envoyer(moi, 9001, latitudeAuNord(161), 10, png)
        .andExpect(jsonPath("$.distanceMetres").value(170));
    assertThat(lignes()).isZero();
    assertThat(objets()).isZero();
  }

  // ---------------------------------------------------------------- rayon

  @Test
  void juste_dans_le_rayon_accepte_juste_au_dela_refuse() throws Exception {
    envoyer(moi, 9001, latitudeAuNord(149.9), 10, png).andExpect(status().isCreated());
    jdbc.update("delete from capture.capture");
    envoyer(moi, 9001, latitudeAuNord(150.1), 10, png)
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.distanceMetres").value(160));
  }

  @Test
  void rayon_ajuste_du_monument_est_utilise() throws Exception {
    jdbc.update("update catalogue.monument set rayon_capture_m = 300 where numero = 9001");
    envoyer(moi, 9001, latitudeAuNord(250), 10, png).andExpect(status().isCreated());
  }

  // ---------------------------------------------------------------- validation de forme

  @Test
  void forme_invalide_400_avant_le_controle_email_sans_renvoyer_les_valeurs() throws Exception {
    UUID non = UUID.randomUUID();
    utilisateur(non, false);
    envoyer(non, 9001, 123.456, 10, png)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("validation"))
        .andExpect(jsonPath("$.erreurs[0].champ").value("latitude"))
        .andExpect(content().string(not(containsString("123.456"))));
  }

  @Test
  void nan_et_texte_non_numerique_400() throws Exception {
    envoyer(moi, 9001, Double.NaN, 10, png).andExpect(status().isBadRequest());
    mvc.perform(
            multipart("/api/captures")
                .file(new MockMultipartFile("photo", "p.jpg", "image/jpeg", png))
                .param("numero", "abc")
                .param("latitude", "1")
                .param("longitude", "1")
                .param("precisionMetres", "1")
                .with(jwt().jwt(j -> j.subject(moi.toString()))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("validation"));
  }

  @Test
  void photo_absente_400() throws Exception {
    mvc.perform(
            multipart("/api/captures")
                .param("numero", "9001")
                .param("latitude", "1")
                .param("longitude", "1")
                .param("precisionMetres", "1")
                .with(jwt().jwt(j -> j.subject(moi.toString()))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("validation"));
  }

  // ---------------------------------------------------------------- concurrence

  @Test
  void envois_simultanes_une_seule_capture_une_seule_photo() throws Exception {
    int n = 4;
    var pool = Executors.newFixedThreadPool(n);
    var depart = new CountDownLatch(1);
    List<Future<Integer>> reponses = new ArrayList<>();
    for (int i = 0; i < n; i++) {
      Callable<Integer> envoi =
          () -> {
            depart.await();
            return envoyer(moi, 9001, LAT, 10, png).andReturn().getResponse().getStatus();
          };
      reponses.add(pool.submit(envoi));
    }
    depart.countDown();
    List<Integer> statuts = new ArrayList<>();
    for (Future<Integer> f : reponses) {
      statuts.add(f.get());
    }
    pool.shutdown();
    assertThat(statuts.stream().filter(s -> s == 201)).hasSize(1);
    assertThat(statuts.stream().filter(s -> s == 409)).hasSize(n - 1);
    assertThat(lignes()).isEqualTo(1);
    assertThat(objets()).isEqualTo(1);
  }
}
