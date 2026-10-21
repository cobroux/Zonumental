package fr.zonumental.compte.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** r0-socle-14 : annulation de la suppression par reconnexion (Q-9, RG-009). */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, AnnulationSuppressionTest.HorlogeFixe.class})
class AnnulationSuppressionTest {

  static final Instant MAINTENANT = Instant.parse("2026-10-20T10:00:00Z");

  @TestConfiguration
  static class HorlogeFixe {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      return Clock.fixed(MAINTENANT, ZoneId.of("Europe/Paris"));
    }
  }

  static final String EMAIL = "marco@exemple.fr";
  static final String MDP = "chat-bleu-47-lune";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder encodeur;

  @BeforeEach
  void utilisateurEnSuppression() {
    jdbc.update("delete from compte.utilisateur");
    jdbc.update("delete from compte.tentative_connexion");
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le, suppression_demandee_le) values (?, ?, 'Marco', ?,"
            + " '2000-01-01', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', ?)",
        UUID.randomUUID(),
        EMAIL,
        encodeur.encode(MDP),
        java.sql.Timestamp.from(MAINTENANT.minusSeconds(10L * 86400)));
  }

  ResultActions appel(String chemin, String mdp) throws Exception {
    return mvc.perform(
        post(chemin)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + EMAIL + "\",\"motDePasse\":\"" + mdp + "\"}"));
  }

  @Test
  void bonsIdentifiantsAnnulentEtConnectent() throws Exception {
    appel("/api/compte/suppression/annulation", MDP)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.jetonAcces").isNotEmpty())
        .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly")));
    assertThat(
            jdbc.queryForObject(
                "select suppression_demandee_le from compte.utilisateur", Instant.class))
        .isNull();
    assertThat(jdbc.queryForObject("select count(*) from compte.session", Integer.class))
        .isEqualTo(1);
    appel("/api/auth/connexion", MDP).andExpect(status().isOk());
  }

  @Test
  void mauvaisMotDePasseRefuseEtCompteInchange() throws Exception {
    appel("/api/compte/suppression/annulation", "faux-faux-faux-1")
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("identifiants-invalides"));
    assertThat(
            jdbc.queryForObject(
                "select suppression_demandee_le is not null from compte.utilisateur",
                Boolean.class))
        .isTrue();
  }

  @Test
  void memeCompteurQueLaConnexion() throws Exception {
    for (int i = 0; i < 4; i++) {
      appel("/api/compte/suppression/annulation", "faux-faux-faux-1")
          .andExpect(status().isUnauthorized());
    }
    appel("/api/auth/connexion", "faux-faux-faux-1").andExpect(status().isUnauthorized());
    appel("/api/compte/suppression/annulation", MDP)
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists("Retry-After"));
  }

  @Test
  void delaiEcouleNonAnnulable() throws Exception {
    jdbc.update(
        "update compte.utilisateur set suppression_demandee_le = ?",
        java.sql.Timestamp.from(MAINTENANT.minusSeconds(31L * 86400)));
    appel("/api/compte/suppression/annulation", MDP).andExpect(status().isUnauthorized());
  }

  @Test
  void compteNonEnSuppressionSimplementConnecte() throws Exception {
    jdbc.update("update compte.utilisateur set suppression_demandee_le = null");
    appel("/api/compte/suppression/annulation", MDP).andExpect(status().isOk());
  }
}
