package fr.zonumental.capture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import fr.zonumental.progression.CalculSucces;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** r2-collectionner-2 : succès dans la réponse de capture (RG-R2-03). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CapturerSuccesTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @MockitoSpyBean CalculSucces calcul;

  UUID moi = UUID.randomUUID();
  byte[] png = ImagesDeTest.encoder(ImagesDeTest.image(300, 200), "png");

  @BeforeEach
  void donnees() {
    jdbc.update("delete from capture.capture");
    jdbc.update("delete from catalogue.monument where numero in (9201, 9202)");
    jdbc.update("delete from catalogue.ville where code_insee = '99003'");
    jdbc.update("insert into catalogue.ville values ('99003', 'Succes', 2)");
    for (int n : new int[] {9201, 9202}) {
      jdbc.update(
          "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
              + " latitude, longitude, rarete, popularite) values (?, ?, 'T', 'TOUR', '99003',"
              + " 45.76, 4.83, 'COMMUN', 1)",
          n,
          "Q" + n);
    }
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " email_verifie_le, cree_le, derniere_activite_le) values (?, ?, ?, 'x',"
            + " '2000-01-01', ?, now(), now())",
        moi,
        moi + "@exemple.fr",
        "suc" + moi.toString().substring(0, 8),
        Timestamp.from(Instant.now()));
  }

  ResultActions envoyer(int numero, boolean remplacer) throws Exception {
    var r =
        multipart("/api/captures")
            .file(new MockMultipartFile("photo", "p.jpg", "image/jpeg", png))
            .param("numero", String.valueOf(numero))
            .param("latitude", "45.76")
            .param("longitude", "4.83")
            .param("precisionMetres", "10");
    if (remplacer) {
      r.param("remplacer", "true");
    }
    return mvc.perform(r.with(jwt().jwt(j -> j.subject(moi.toString()))));
  }

  @Test
  void premiere_capture_renvoie_le_succes_gagne_puis_plus_rien() throws Exception {
    envoyer(9201, false)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.succesGagnes.length()").value(1))
        .andExpect(jsonPath("$.succesGagnes[0].code").value("PREMIER_TAMPON"))
        .andExpect(jsonPath("$.succesGagnes[0].libelle").isNotEmpty());
    envoyer(9202, false)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.succesGagnes.length()").value(0));
  }

  @Test
  void echec_du_calcul_la_capture_reste_enregistree_et_le_succes_est_rattrape() throws Exception {
    when(calcul.calculer(any())).thenThrow(new IllegalStateException("panne"));
    envoyer(9201, false)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.succesGagnes.length()").value(0));
    assertThat(jdbc.queryForObject("select count(*) from capture.capture", Integer.class))
        .isEqualTo(1);

    org.mockito.Mockito.reset(calcul);
    envoyer(9202, false).andExpect(jsonPath("$.succesGagnes[0].code").value("PREMIER_TAMPON"));
  }

  @Test
  void remplacement_de_photo_ne_recalcule_pas() throws Exception {
    envoyer(9201, false).andExpect(status().isCreated());
    org.mockito.Mockito.clearInvocations(calcul);
    envoyer(9201, true)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.succesGagnes.length()").value(0));
    verify(calcul, never()).calculer(any());
  }
}
