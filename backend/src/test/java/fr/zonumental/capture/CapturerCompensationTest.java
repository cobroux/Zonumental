package fr.zonumental.capture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.InvocationOnMock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * Concurrence et compensation S3, déterministes : le crochet s'exécute dans {@code deposer}, donc
 * après la pré-vérification {@code deja-capture} et avant l'INSERT.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CapturerCompensationTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired S3Client s3;
  @MockitoSpyBean StockagePhotos stockage;

  @Value("${zonumental.s3.bucket}")
  String bucket;

  UUID moi = UUID.randomUUID();
  byte[] png = ImagesDeTest.encoder(ImagesDeTest.image(300, 200), "png");

  @BeforeEach
  void donnees() {
    jdbc.update("delete from capture.capture");
    jdbc.update("delete from catalogue.monument where numero = 9101");
    jdbc.update("delete from catalogue.ville where code_insee = '99101'");
    jdbc.update("insert into catalogue.ville values ('99101', 'Testville', 1)");
    jdbc.execute(
        "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
            + " latitude, longitude, rarete, popularite) values"
            + " (9101, 'Q9101', 'Tour', 'TOUR', '99101', 45.76, 4.83, 'COMMUN', 1)");
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " email_verifie_le, cree_le, derniere_activite_le) values (?, ?, ?, 'x',"
            + " '2000-01-01', ?, now(), now())",
        moi,
        moi + "@exemple.fr",
        "cmp" + moi.toString().substring(0, 8),
        Timestamp.from(Instant.now()));
  }

  ResultActions envoyer() throws Exception {
    return mvc.perform(
        multipart("/api/captures")
            .file(new MockMultipartFile("photo", "p.jpg", "image/jpeg", png))
            .param("numero", "9101")
            .param("latitude", "45.76")
            .param("longitude", "4.83")
            .param("precisionMetres", "10")
            .with(jwt().jwt(j -> j.subject(moi.toString()))));
  }

  int objets() {
    return s3.listObjectsV2(b -> b.bucket(bucket).prefix("captures/" + moi + "/"))
        .contents()
        .size();
  }

  /** Exécute {@code avantInsert} juste après le dépôt S3, puis laisse le vrai dépôt s'achever. */
  void crochet(Runnable avantInsert) {
    doAnswer(
            (InvocationOnMock i) -> {
              Object r = i.callRealMethod();
              avantInsert.run();
              return r;
            })
        .when(stockage)
        .deposer(any(), any(), any());
  }

  @Test
  void unicite_heurtee_apres_la_preverification_409_et_photo_effacee() throws Exception {
    crochet(
        () ->
            jdbc.update(
                "insert into capture.capture (utilisateur_id, numero_monument, distance_m,"
                    + " photo_id) values (?, 9101, 1, ?)",
                moi,
                UUID.randomUUID()));
    envoyer().andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("deja-capture"));
    assertThat(jdbc.queryForObject("select count(*) from capture.capture", Integer.class))
        .isEqualTo(1);
    assertThat(objets()).isZero();
  }

  @Test
  void insert_en_echec_autre_qu_un_doublon_photo_effacee_et_erreur_propagee() throws Exception {
    crochet(() -> jdbc.execute("alter table capture.capture rename to capture_hs"));
    try {
      assertThatThrownBy(this::envoyer).hasRootCauseInstanceOf(java.sql.SQLException.class);
    } finally {
      jdbc.execute("alter table capture.capture_hs rename to capture");
    }
    assertThat(jdbc.queryForObject("select count(*) from capture.capture", Integer.class)).isZero();
    assertThat(objets()).isZero();
  }
}
