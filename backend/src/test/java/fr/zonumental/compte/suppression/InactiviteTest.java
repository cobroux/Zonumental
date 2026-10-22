package fr.zonumental.compte.suppression;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
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
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** r0-socle-15 : avertissement puis suppression des comptes inactifs (RG-015). */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, InactiviteTest.HorlogeFixe.class})
class InactiviteTest {

  static final Instant MAINTENANT = Instant.parse("2026-10-20T10:00:00Z");
  static final String MDP = "chat-bleu-47-lune";

  @TestConfiguration
  static class HorlogeFixe {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      return Clock.fixed(MAINTENANT, ZoneId.of("Europe/Paris"));
    }
  }

  @Autowired JdbcTemplate jdbc;
  @Autowired PurgeComptes purge;
  @Autowired MockMvc mvc;
  @Autowired PasswordEncoder encodeur;
  @MockitoBean JavaMailSender mail;

  @BeforeEach
  void vide() {
    Mockito.reset(mail);
    jdbc.update("delete from compte.utilisateur");
  }

  /** jours d'inactivité, jours depuis l'avertissement (-1 = jamais averti), e-mail vérifié. */
  void compte(String pseudo, int inactifJours, int avertiJours, boolean verifie) {
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le, email_verifie_le, avertissement_inactivite_le)"
            + " values (?, ?, ?, ?, '2000-01-01', '2020-01-01T00:00:00Z', ?, ?, ?)",
        UUID.randomUUID(),
        pseudo + "@exemple.fr",
        pseudo,
        encodeur.encode(MDP),
        depuis(inactifJours),
        verifie ? depuis(inactifJours) : null,
        avertiJours < 0 ? null : depuis(avertiJours));
  }

  static Timestamp depuis(int jours) {
    return Timestamp.from(MAINTENANT.minusSeconds(jours * 86400L));
  }

  List<String> pseudos() {
    return jdbc.queryForList("select pseudo from compte.utilisateur order by pseudo", String.class);
  }

  Instant avertissement(String pseudo) {
    return jdbc.queryForObject(
        "select avertissement_inactivite_le from compte.utilisateur where pseudo = ?",
        Instant.class,
        pseudo);
  }

  @Test
  void avertitUnCompteVerifieInactifDepuisTroisAnsSansLeSupprimer() {
    compte("ancien", 1096, -1, true);
    compte("recent", 1000, -1, true);

    purge.purger();

    ArgumentCaptor<SimpleMailMessage> m = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail, times(1)).send(m.capture());
    assertThat(m.getValue().getTo()).containsExactly("ancien@exemple.fr");
    assertThat(m.getValue().getText()).contains("19 novembre 2026");
    assertThat(pseudos()).containsExactly("ancien", "recent");
    assertThat(avertissement("ancien")).isEqualTo(MAINTENANT);
    assertThat(avertissement("recent")).isNull();
  }

  @Test
  void unSeulAvertissementMemeSiLaPurgeRepasse() {
    compte("ancien", 1096, -1, true);

    purge.purger();
    purge.purger();

    verify(mail, times(1)).send(any(SimpleMailMessage.class));
  }

  @Test
  void echecDEnvoiNeMarquePasEtNeSupprimePasPuisRejoue() {
    compte("ancien", 1096, -1, true);
    doThrow(new MailSendException("smtp en panne")).when(mail).send(any(SimpleMailMessage.class));

    purge.purger();

    assertThat(pseudos()).containsExactly("ancien");
    assertThat(avertissement("ancien")).isNull();

    Mockito.reset(mail);
    purge.purger();

    verify(mail, times(1)).send(any(SimpleMailMessage.class));
    assertThat(avertissement("ancien")).isEqualTo(MAINTENANT);
  }

  @Test
  void supprimeApresLePreavisSansRetourEtGardeLesAutres() {
    compte("expire", 1200, 31, true);
    compte("preavisEnCours", 1200, 29, true);

    purge.purger();

    assertThat(pseudos()).containsExactly("preavisEnCours");
    verify(mail, never()).send(any(SimpleMailMessage.class));
  }

  @Test
  void emailNonVerifieSupprimeSansAvertissement() {
    compte("fantome", 1096, -1, false);
    compte("fantomeRecent", 100, -1, false);

    purge.purger();

    assertThat(pseudos()).containsExactly("fantomeRecent");
    verify(mail, never()).send(any(SimpleMailMessage.class));
  }

  @Test
  void compteDejaEnSuppressionNEstPasAverti() {
    compte("parti", 1096, -1, true);
    jdbc.update("update compte.utilisateur set suppression_demandee_le = ?", depuis(1));

    purge.purger();

    verify(mail, never()).send(any(SimpleMailMessage.class));
    assertThat(avertissement("parti")).isNull();
  }

  @Test
  void pannePourUnCompteNeBloquePasLesAutresNiLaPurge() {
    compte("panne", 1096, -1, true);
    compte("bien", 1096, -1, true);
    compte("expire", 1200, 31, true);
    doThrow(new MailSendException("smtp"))
        .when(mail)
        .send(Mockito.argThat((SimpleMailMessage m) -> m.getTo()[0].startsWith("panne@")));

    purge.purger();

    assertThat(pseudos()).containsExactly("bien", "panne");
    assertThat(avertissement("panne")).isNull();
    assertThat(avertissement("bien")).isEqualTo(MAINTENANT);
  }

  @Test
  void reconnexionPendantLePreavisAbandonneLaSuppression() throws Exception {
    compte("revenu", 1200, 10, true);

    mvc.perform(
            post("/api/auth/connexion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"revenu@exemple.fr\",\"motDePasse\":\"" + MDP + "\"}"))
        .andExpect(status().isOk());

    assertThat(avertissement("revenu")).isNull();
    assertThat(
            jdbc.queryForObject(
                "select derniere_activite_le from compte.utilisateur", Instant.class))
        .isEqualTo(MAINTENANT);
  }

  @Test
  void reconnexionPendantLePreavisExpireAvantLaPurgeNeSupprimePas() throws Exception {
    compte("revenu", 1200, 40, true);

    mvc.perform(
            post("/api/auth/connexion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"revenu@exemple.fr\",\"motDePasse\":\"" + MDP + "\"}"))
        .andExpect(status().isOk());
    purge.purger();

    assertThat(pseudos()).containsExactly("revenu");
  }
}
