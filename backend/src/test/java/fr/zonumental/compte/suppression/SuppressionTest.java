package fr.zonumental.compte.suppression;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** r0-socle-14 : demande de suppression du compte (RG-014, RG-008, Q-9). */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, SuppressionTest.HorlogeFixe.class})
class SuppressionTest {

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
  @MockitoBean JavaMailSender mail;

  UUID id = UUID.randomUUID();
  String bearer;

  @BeforeEach
  void connecte() throws Exception {
    Mockito.clearInvocations(mail);
    jdbc.update("delete from compte.utilisateur");
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le) values (?, ?, 'Marco', ?, '2000-01-01',"
            + " '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
        id,
        EMAIL,
        encodeur.encode(MDP));
    String corps = connexion().andReturn().getResponse().getContentAsString();
    bearer = "Bearer " + corps.replaceAll(".*\"jetonAcces\"\\s*:\\s*\"([^\"]+)\".*", "$1");
  }

  org.springframework.test.web.servlet.ResultActions connexion() throws Exception {
    return mvc.perform(
        post("/api/auth/connexion")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + EMAIL + "\",\"motDePasse\":\"" + MDP + "\"}"));
  }

  @Test
  void sansJetonRefuse() throws Exception {
    mvc.perform(post("/api/compte/suppression")).andExpect(status().isUnauthorized());
  }

  @Test
  void demandeDesactiveLeCompteImmediatementEtFermeLesSessions() throws Exception {
    mvc.perform(post("/api/compte/suppression").header("Authorization", bearer))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.suppressionDefinitiveLe").value("2026-11-18T12:00:00+02:00"))
        .andExpect(
            header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));

    assertThat(
            jdbc.queryForObject(
                "select suppression_demandee_le from compte.utilisateur", Instant.class))
        .isEqualTo(MAINTENANT);
    assertThat(jdbc.queryForObject("select count(*) from compte.session", Integer.class)).isZero();
    connexion()
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("suppression-en-cours"));
  }

  @Test
  void renouvellementRefuseApresLaDemande() throws Exception {
    String set = connexion().andReturn().getResponse().getHeader("Set-Cookie");
    jakarta.servlet.http.Cookie cookie =
        new jakarta.servlet.http.Cookie(
            "zonumental_session", set.substring(set.indexOf('=') + 1, set.indexOf(';')));
    mvc.perform(post("/api/auth/renouvellement").cookie(cookie)).andExpect(status().isOk());
    mvc.perform(post("/api/compte/suppression").header("Authorization", bearer))
        .andExpect(status().isAccepted());
    mvc.perform(post("/api/auth/renouvellement").cookie(cookie))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void courrielDeConfirmationEnvoye() throws Exception {
    mvc.perform(post("/api/compte/suppression").header("Authorization", bearer))
        .andExpect(status().isAccepted());
    ArgumentCaptor<SimpleMailMessage> m = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail, timeout(3000)).send(m.capture());
    assertThat(m.getValue().getTo()).containsExactly(EMAIL);
    assertThat(m.getValue().getText()).contains("18 novembre 2026");
  }

  @Test
  void demandeRepeteeGardeLaDateEtNEnvoiePasDeSecondCourriel() throws Exception {
    jdbc.update("update compte.utilisateur set suppression_demandee_le = '2026-10-01T00:00:00Z'");
    mvc.perform(post("/api/compte/suppression").header("Authorization", bearer))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.suppressionDefinitiveLe").value("2026-10-30T00:00:00Z"));
    verify(mail, after(300).never()).send(any(SimpleMailMessage.class));
    assertThat(
            jdbc.queryForObject(
                "select suppression_demandee_le from compte.utilisateur", Instant.class))
        .isEqualTo(Instant.parse("2026-10-01T00:00:00Z"));
  }
}
