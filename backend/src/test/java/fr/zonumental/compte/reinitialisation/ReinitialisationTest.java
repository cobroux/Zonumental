package fr.zonumental.compte.reinitialisation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
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
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** r0-socle-10 : mot de passe oublié et réinitialisation (RG-011, RG-006, RG-010). */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, ReinitialisationTest.HorlogeFixe.class})
class ReinitialisationTest {

  @TestConfiguration
  static class HorlogeFixe {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      return Clock.fixed(Instant.parse("2026-10-20T10:00:00Z"), ZoneId.of("Europe/Paris"));
    }
  }

  private static final String EMAIL = "marco@exemple.fr";
  private static final String ANCIEN = "chat-bleu-47-lune";
  private static final String NOUVEAU = "nouveau-mdp-12345";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder encodeur;
  @MockitoBean JavaMailSender mail;

  @BeforeEach
  void creerCompte() throws Exception {
    jdbc.update("delete from compte.utilisateur");
    Mockito.clearInvocations(mail);
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le) values (?, ?, 'Marco', ?, '2000-01-01',"
            + " '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
        UUID.randomUUID(),
        EMAIL,
        encodeur.encode(ANCIEN));
    connecter(ANCIEN).andExpect(status().isOk());
  }

  private ResultActions connecter(String mdp) throws Exception {
    return mvc.perform(
        post("/api/auth/connexion")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + EMAIL + "\",\"motDePasse\":\"" + mdp + "\"}"));
  }

  private ResultActions oubli(String email) throws Exception {
    return mvc.perform(
        post("/api/compte/mot-de-passe/oubli")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\"}"));
  }

  private ResultActions reinitialiser(String jeton, String mdp) throws Exception {
    return mvc.perform(
        post("/api/compte/mot-de-passe/reinitialisation")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"jeton\":\"" + jeton + "\",\"nouveauMotDePasse\":\"" + mdp + "\"}"));
  }

  private String dernierJeton(int n) {
    ArgumentCaptor<SimpleMailMessage> m = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail, timeout(3000).times(n)).send(m.capture());
    List<SimpleMailMessage> tous = m.getAllValues();
    String texte = tous.get(tous.size() - 1).getText();
    int debut = texte.indexOf("jeton=") + "jeton=".length();
    return texte.substring(debut).lines().findFirst().orElseThrow().strip();
  }

  @Test
  void adresseConnueOuInconnueMemeReponseEtMailSeulementPourLaConnue() throws Exception {
    String inconnue =
        oubli("personne@exemple.fr")
            .andExpect(status().isAccepted())
            .andReturn()
            .getResponse()
            .getContentAsString();
    verify(mail, after(300).never()).send(any(SimpleMailMessage.class));
    String connue =
        oubli(" Marco@EXEMPLE.fr ")
            .andExpect(status().isAccepted())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(connue).isEqualTo(inconnue);
    dernierJeton(1);
  }

  @Test
  void adresseInvalideEstUneErreurDeValidation() throws Exception {
    oubli("pas-un-email")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("validation"));
  }

  @Test
  void lienValableUneHeureEtUsageUnique() throws Exception {
    oubli(EMAIL);
    String jeton = dernierJeton(1);
    Boolean uneHeure =
        jdbc.queryForObject(
            "select expire_le - cree_le = interval '1 hour' from compte.jeton", Boolean.class);
    assertThat(uneHeure).isTrue();

    reinitialiser(jeton, NOUVEAU).andExpect(status().isNoContent());
    reinitialiser(jeton, NOUVEAU)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("jeton-deja-utilise"));
    connecter(NOUVEAU).andExpect(status().isOk());
    connecter(ANCIEN).andExpect(status().isUnauthorized());
  }

  @Test
  void lienExpireEstRefuseEtLeMotDePasseNeChangePas() throws Exception {
    oubli(EMAIL);
    String jeton = dernierJeton(1);
    jdbc.update("update compte.jeton set expire_le = '2026-10-20T11:59:00+02:00'");
    reinitialiser(jeton, NOUVEAU)
        .andExpect(status().isGone())
        .andExpect(jsonPath("$.code").value("jeton-expire"));
    connecter(ANCIEN).andExpect(status().isOk());
  }

  @Test
  void seulLeDernierLienEstValide() throws Exception {
    oubli(EMAIL);
    String premier = dernierJeton(1);
    oubli(EMAIL);
    String second = dernierJeton(2);
    assertThat(second).isNotEqualTo(premier);
    reinitialiser(premier, NOUVEAU)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("jeton-invalide"));
    reinitialiser(second, NOUVEAU).andExpect(status().isNoContent());
  }

  @Test
  void jetonInconnuOuVideEstInvalide() throws Exception {
    reinitialiser("n-importe-quoi", NOUVEAU)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("jeton-invalide"));
    reinitialiser("", NOUVEAU).andExpect(jsonPath("$.code").value("jeton-invalide"));
    reinitialiser("x".repeat(101), NOUVEAU).andExpect(jsonPath("$.code").value("jeton-invalide"));
  }

  @Test
  void motDePasseDeOnzeCaracteresRefuseDouzeAccepte() throws Exception {
    oubli(EMAIL);
    String jeton = dernierJeton(1);
    reinitialiser(jeton, "Abc123!xyz-")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("validation"));
    // Le refus ne consomme pas le lien.
    reinitialiser(jeton, "Abc123!xyz-A").andExpect(status().isNoContent());
  }

  @Test
  void reinitialisationFermeToutesLesSessions() throws Exception {
    connecter(ANCIEN).andExpect(status().isOk());
    assertThat(jdbc.queryForObject("select count(*) from compte.session", Integer.class))
        .isEqualTo(2);
    oubli(EMAIL);
    reinitialiser(dernierJeton(1), NOUVEAU).andExpect(status().isNoContent());
    assertThat(jdbc.queryForObject("select count(*) from compte.session", Integer.class)).isZero();
  }
}
