package fr.zonumental.catalogue;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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

/** r1-capturer-5 : état capturé propre à chaque explorateur dans le catalogue (RG-037). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class EtatCaptureCatalogueTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  UUID marco = UUID.randomUUID();
  UUID lea = UUID.randomUUID();

  @BeforeEach
  void preparer() {
    jdbc.update("delete from capture.capture");
    jdbc.update("delete from catalogue.monument");
    jdbc.update("delete from catalogue.ville");
    jdbc.update("insert into catalogue.ville values ('69123', 'Lyon', 10)");
    monument(1);
    monument(2);
    capture(marco, 1, "2026-03-01T10:00:00Z");
  }

  void monument(int numero) {
    jdbc.update(
        "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
            + " latitude, longitude, rarete, popularite) values (?, ?, 'M', 'TOUR', '69123',"
            + " 45.76, 4.83, 'COMMUN', 1)",
        numero,
        "Q" + numero);
  }

  void capture(UUID explorateur, int numero, String le) {
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, capturee_le, distance_m,"
            + " photo_id) values (?, ?, ?::timestamptz, 10, ?)",
        explorateur,
        numero,
        le,
        UUID.randomUUID());
  }

  @Test
  void listeIndiqueLaDateDeCapturePourLExplorateurCourantSeulement() throws Exception {
    mvc.perform(get("/api/catalogue/monuments").with(jwt().jwt(j -> j.subject(marco.toString()))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].captureeLe").value("2026-03-01T10:00:00Z"))
        .andExpect(jsonPath("$[1].captureeLe").value((Object) null));
  }

  @Test
  void unAutreExplorateurNeVoitPasLaCapture() throws Exception {
    mvc.perform(get("/api/catalogue/monuments").with(jwt().jwt(j -> j.subject(lea.toString()))))
        .andExpect(jsonPath("$[0].captureeLe").value((Object) null))
        .andExpect(jsonPath("$[1].captureeLe").value((Object) null));
  }

  @Test
  void monumentImporteApresLaCapturePasseParNullSansAutreEffet() throws Exception {
    monument(3);
    mvc.perform(get("/api/catalogue/monuments").with(jwt().jwt(j -> j.subject(marco.toString()))))
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(jsonPath("$[0].captureeLe").value("2026-03-01T10:00:00Z"))
        .andExpect(jsonPath("$[2].captureeLe").value((Object) null));
  }

  @Test
  void ficheExposeAussiLaDateDeCapture() throws Exception {
    mvc.perform(get("/api/catalogue/monuments/1").with(jwt().jwt(j -> j.subject(marco.toString()))))
        .andExpect(jsonPath("$.captureeLe").value("2026-03-01T10:00:00Z"));
    mvc.perform(get("/api/catalogue/monuments/1").with(jwt().jwt(j -> j.subject(lea.toString()))))
        .andExpect(jsonPath("$.captureeLe").value((Object) null));
  }

  @Test
  void captureeLeEstUneCleExplicitementNullePourUnMonumentNonCapture() throws Exception {
    var lea = jwt().jwt(j -> j.subject(this.lea.toString()));
    mvc.perform(get("/api/catalogue/monuments").with(lea))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("\"captureeLe\":null")));
    mvc.perform(get("/api/catalogue/monuments/1").with(lea))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("\"captureeLe\":null")));
  }
}
