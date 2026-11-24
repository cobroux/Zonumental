package fr.zonumental.compte.profil;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** reglages-1 : préférence « Mode facile » portée par le compte. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PreferencesTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder encodeur;

  UUID id;
  String bearer;

  @BeforeEach
  void connecte() throws Exception {
    jdbc.update("delete from compte.utilisateur");
    id = UUID.randomUUID();
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le) values (?, 'lea-prefs@exemple.fr', 'LeaPrefs', ?,"
            + " '2000-01-01', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
        id,
        encodeur.encode("chat-bleu-47-lune"));
    String corps =
        mvc.perform(
                post("/api/auth/connexion")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"email\":\"lea-prefs@exemple.fr\",\"motDePasse\":\"chat-bleu-47-lune\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    bearer = "Bearer " + corps.replaceAll(".*\"jetonAcces\"\\s*:\\s*\"([^\"]+)\".*", "$1");
  }

  ResultActions modifier(String json) throws Exception {
    return mvc.perform(
        put("/api/compte/preferences")
            .header("Authorization", bearer)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json));
  }

  @Test
  void modeFacileFauxParDefaut() throws Exception {
    mvc.perform(get("/api/compte/moi").header("Authorization", bearer))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.modeFacile").value(false));
  }

  @Test
  void activeEtPersisteIdempotent() throws Exception {
    modifier("{\"modeFacile\":true}")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.modeFacile").value(true));
    modifier("{\"modeFacile\":true}")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.modeFacile").value(true));
    mvc.perform(get("/api/compte/moi").header("Authorization", bearer))
        .andExpect(jsonPath("$.modeFacile").value(true));
    modifier("{\"modeFacile\":false}").andExpect(jsonPath("$.modeFacile").value(false));
  }

  @Test
  void refuseCorpsInvalides() throws Exception {
    for (String corps :
        new String[] {
          "{}",
          "{\"modeFacile\":null}",
          "{\"modeFacile\":\"true\"}",
          "{\"modeFacile\":1}",
          "{\"modeFacile\":0}"
        }) {
      modifier(corps)
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.type").value(org.hamcrest.Matchers.endsWith("validation")));
    }
    mvc.perform(
            put("/api/compte/preferences")
                .header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/compte/moi").header("Authorization", bearer))
        .andExpect(jsonPath("$.modeFacile").value(false));
  }

  @Test
  void refuseSansJeton() throws Exception {
    mvc.perform(
            put("/api/compte/preferences")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"modeFacile\":true}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void refuseSiSuppressionDemandee() throws Exception {
    jdbc.update("update compte.utilisateur set suppression_demandee_le = now() where id = ?", id);
    modifier("{\"modeFacile\":true}").andExpect(status().isUnauthorized());
  }
}
