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

/** r2-collectionner-3 : collections et progression du joueur connecté (RG-R2-05 à 07). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CollectionsApiTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  UUID marco = UUID.randomUUID();
  UUID autre = UUID.randomUUID();

  void monument(int n, String type) {
    jdbc.update(
        "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
            + " latitude, longitude, rarete, popularite) values (?, ?, 'M"
            + n
            + "', ?, '75056', 1,"
            + " 1, 'COMMUN', 1)",
        n,
        "Q" + n,
        type);
  }

  void capturer(UUID u, int n) {
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id)"
            + " values (?, ?, 1, ?)",
        u,
        n,
        UUID.randomUUID());
  }

  @BeforeEach
  void donnees() {
    jdbc.update("delete from capture.capture");
    jdbc.update("delete from catalogue.monument");
    jdbc.update("delete from catalogue.ville where code_insee = '75056'");
    jdbc.update("insert into catalogue.ville values ('75056', 'Paris', 25)");
    // 3 musées (collection visible), 2 ponts (< 3 : jamais exposée)
    for (int n = 9301; n <= 9303; n++) {
      monument(n, "MUSEE");
    }
    monument(9304, "PONT");
    monument(9305, "PONT");
  }

  ResultActions lire(UUID u) throws Exception {
    return mvc.perform(
        get("/api/progression/collections").with(jwt().jwt(j -> j.subject(u.toString()))));
  }

  @Test
  void sansJeton401() throws Exception {
    mvc.perform(get("/api/progression/collections")).andExpect(status().isUnauthorized());
  }

  @Test
  void ensembleDeMoinsDeTroisMonumentsEstMasque() throws Exception {
    lire(marco)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.code == 'TYPE-PONT')]").isEmpty())
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')]").isNotEmpty())
        .andExpect(jsonPath("$[?(@.code == 'VILLE-75056')].total").value(5));
  }

  @Test
  void progressionDuJoueurSeulement() throws Exception {
    capturer(marco, 9301);
    capturer(autre, 9302);
    lire(marco)
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].nom").value("Musées"))
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].total").value(3))
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].captures").value(1))
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].complete").value(false))
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].monuments.length()").value(3))
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].monuments[0].numero").value(9301))
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].monuments[0].capture").value(true))
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].monuments[1].capture").value(false));
  }

  @Test
  void collectionCompleteEtNouveauMonumentSansMigration() throws Exception {
    capturer(marco, 9301);
    capturer(marco, 9302);
    capturer(marco, 9303);
    lire(marco).andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].complete").value(true));
    monument(9306, "MUSEE");
    lire(marco)
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].total").value(4))
        .andExpect(jsonPath("$[?(@.code == 'TYPE-MUSEE')].complete").value(false));
  }
}
