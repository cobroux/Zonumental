package fr.zonumental.progression;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.web.servlet.ResultActions;

/** r2-collectionner-4 : lecture des succès du joueur connecté (RG-R2-01, RG-R2-02). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SuccesApiTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired CatalogueSucces catalogue;

  UUID marco = UUID.randomUUID();
  UUID autre = UUID.randomUUID();

  @BeforeEach
  void donnees() {
    jdbc.update("delete from capture.capture");
    jdbc.update("delete from progression.succes_obtenu");
    jdbc.update("delete from catalogue.monument where numero between 9201 and 9202");
    jdbc.update("delete from catalogue.ville where code_insee = '99003'");
    jdbc.update("insert into catalogue.ville values ('99003', 'Api', 3)");
    for (int n = 9201; n <= 9202; n++) {
      jdbc.update(
          "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
              + " latitude, longitude, rarete, popularite) values (?, ?, 'M', 'TOUR', '99003', 1, 1,"
              + " 'COMMUN', 1)",
          n,
          "Q" + n);
    }
  }

  ResultActions lire(UUID u) throws Exception {
    return mvc.perform(
        get("/api/progression/succes").with(jwt().jwt(j -> j.subject(u.toString()))));
  }

  @Test
  void sansJeton401() throws Exception {
    mvc.perform(get("/api/progression/succes")).andExpect(status().isUnauthorized());
  }

  @Test
  void aucunSuccesToutEnCoursAZero() throws Exception {
    int total = catalogue.succes().size();
    lire(marco)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.obtenus.length()").value(0))
        .andExpect(jsonPath("$.enCours.length()").value(total))
        .andExpect(jsonPath("$.enCours[?(@.valeur != 0)]").isEmpty());
  }

  @Test
  void obtenusEtEnCoursPlafonnes() throws Exception {
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id)"
            + " values (?, 9201, 1, ?), (?, 9202, 1, ?)",
        marco,
        UUID.randomUUID(),
        autre,
        UUID.randomUUID());
    jdbc.update(
        "insert into progression.succes_obtenu (utilisateur_id, code) values (?, 'PREMIER_TAMPON')",
        marco);
    jdbc.update(
        "insert into progression.succes_obtenu (utilisateur_id, code) values (?, 'LEGENDE')",
        autre);
    int total = catalogue.succes().size();
    lire(marco)
        .andExpect(jsonPath("$.obtenus.length()").value(1))
        .andExpect(jsonPath("$.obtenus[0].code").value("PREMIER_TAMPON"))
        .andExpect(jsonPath("$.obtenus[0].libelle").value("Premier tampon"))
        .andExpect(jsonPath("$.obtenus[0].obtenuLe").exists())
        .andExpect(jsonPath("$.enCours.length()").value(total - 1))
        .andExpect(jsonPath("$.enCours[?(@.code == 'EXPLORATEUR_10')].valeur").value(1))
        .andExpect(jsonPath("$.enCours[?(@.code == 'EXPLORATEUR_10')].seuil").value(10))
        .andExpect(jsonPath("$.enCours[?(@.code == 'LEGENDE')]").isNotEmpty());
  }

  @Test
  void valeurPlafonneeAuSeuilSiSuccesNonEnregistre() throws Exception {
    // 2 captures, succès non encore enregistré : en cours à 1/1 serait incohérent, il est obtenu
    // seulement à l'enregistrement ; la valeur affichée ne dépasse jamais le seuil.
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id)"
            + " values (?, 9201, 1, ?), (?, 9202, 1, ?)",
        marco,
        UUID.randomUUID(),
        marco,
        UUID.randomUUID());
    lire(marco)
        .andExpect(jsonPath("$.enCours[?(@.code == 'PREMIER_TAMPON')].valeur").value(1))
        .andExpect(jsonPath("$.enCours[?(@.valeur > @.seuil)]").isEmpty());
  }
}
