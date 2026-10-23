package fr.zonumental.capture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** r1-capturer-1 : stockage privé et lecture de sa propre photo (RG-037). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PhotoCaptureTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired StockagePhotos stockage;
  @Autowired Photos photos;

  UUID moi = UUID.randomUUID();
  UUID autre = UUID.randomUUID();
  UUID photoId = UUID.randomUUID();
  byte[] jpeg;

  @BeforeEach
  void captureDeMoi() {
    jdbc.update("delete from capture.capture");
    jpeg = photos.reencoder(ImagesDeTest.encoder(ImagesDeTest.image(300, 200), "png"));
    stockage.deposer(moi, photoId, jpeg);
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id)"
            + " values (?, 12, 42.5, ?)",
        moi,
        photoId);
  }

  static RequestPostProcessor connecte(UUID id) {
    return jwt().jwt(j -> j.subject(id.toString()));
  }

  @Test
  void l_auteur_lit_sa_photo_en_flux_prive() throws Exception {
    byte[] recu =
        mvc.perform(get("/api/captures/12/photo").with(connecte(moi)))
            .andExpect(status().isOk())
            .andExpect(content().contentType("image/jpeg"))
            .andExpect(header().string("Cache-Control", "no-store, private"))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();
    assertThat(recu).isEqualTo(jpeg);
  }

  @Test
  void la_photo_d_un_autre_est_introuvable_et_pas_interdite() throws Exception {
    mvc.perform(get("/api/captures/12/photo").with(connecte(autre)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("introuvable"));
  }

  @Test
  void monument_non_capture_introuvable() throws Exception {
    mvc.perform(get("/api/captures/13/photo").with(connecte(moi)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("introuvable"));
  }

  @Test
  void ligne_sans_objet_stocke_introuvable() throws Exception {
    jdbc.update("update capture.capture set photo_id = ?", UUID.randomUUID());
    mvc.perform(get("/api/captures/12/photo").with(connecte(moi))).andExpect(status().isNotFound());
  }

  @Test
  void sans_jeton_401() throws Exception {
    mvc.perform(get("/api/captures/12/photo")).andExpect(status().isUnauthorized());
  }

  @Test
  void depot_puis_suppression_dans_le_bucket() {
    UUID p = UUID.randomUUID();
    stockage.deposer(moi, p, jpeg);
    assertThat(stockage.lire(moi, p)).contains(jpeg);
    stockage.supprimer(moi, p);
    assertThat(stockage.lire(moi, p)).isEmpty();
  }
}
