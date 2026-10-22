package fr.zonumental.compte.consentement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import jakarta.servlet.http.Cookie;
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

/** r0-socle-11 : consentements facultatifs modifiables (RG-003, RG-012). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ConsentementsTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder encodeur;
  @Autowired Consentements consentements;

  UUID id;
  String bearer;

  @BeforeEach
  void connecte() throws Exception {
    jdbc.update("delete from compte.utilisateur");
    id = UUID.randomUUID();
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le) values (?, 'marco@exemple.fr', 'Marco', ?,"
            + " '2000-01-01', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
        id,
        encodeur.encode("chat-bleu-47-lune"));
    // Inscription : facultatifs décochés par défaut (RG-003).
    for (String type : new String[] {"CLASSEMENT", "EMAILS"}) {
      jdbc.update(
          "insert into compte.consentement (utilisateur_id, type, accorde, version_texte,"
              + " horodatage) values (?, ?, false, 'v0', '2026-01-01T00:00:00Z')",
          id,
          type);
    }
    String corps =
        mvc.perform(
                post("/api/auth/connexion")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"email\":\"marco@exemple.fr\",\"motDePasse\":\"chat-bleu-47-lune\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    bearer = "Bearer " + corps.replaceAll(".*\"jetonAcces\"\\s*:\\s*\"([^\"]+)\".*", "$1");
  }

  ResultActions modifier(String json) throws Exception {
    return mvc.perform(
        put("/api/compte/consentements")
            .header("Authorization", bearer)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json));
  }

  @Test
  void etatInitialDecoche() throws Exception {
    mvc.perform(get("/api/compte/consentements").header("Authorization", bearer))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.classement").value(false))
        .andExpect(jsonPath("$.emails").value(false));
  }

  @Test
  void activerPuisDesactiverEmailsEstEnregistreEtDate() throws Exception {
    modifier("{\"classement\":false,\"emails\":true}")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.emails").value(true))
        .andExpect(jsonPath("$.classement").value(false));
    assertThat(consentements.emailsAccordes(id)).isTrue();

    modifier("{\"classement\":false,\"emails\":false}")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.emails").value(false));
    assertThat(consentements.emailsAccordes(id)).isFalse();

    // Journal en ajout seul : 1 ligne initiale + activation + retrait, datées et versionnées.
    assertThat(
            jdbc.queryForObject(
                "select count(*) from compte.consentement where type = 'EMAILS'", Integer.class))
        .isEqualTo(3);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from compte.consentement where type = 'CLASSEMENT'",
                Integer.class))
        .isEqualTo(1);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from compte.consentement where horodatage is null"
                    + " or version_texte is null",
                Integer.class))
        .isZero();
  }

  @Test
  void corpsIncompletRefuse() throws Exception {
    modifier("{\"emails\":true}").andExpect(status().isBadRequest());
  }

  @Test
  void authentificationRequise() throws Exception {
    mvc.perform(
            put("/api/compte/consentements")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"classement\":true,\"emails\":true}"))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/compte/consentements").cookie(new Cookie("x", "y")))
        .andExpect(status().isUnauthorized());
  }
}
