package fr.zonumental.compte;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.atLeastOnce;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** r0-socle-7 : vérification de l'e-mail par lien et renvoi (RG-007). */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, VerificationTest.HorlogeFixe.class})
class VerificationTest {

  @TestConfiguration
  static class HorlogeFixe {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      return Clock.fixed(Instant.parse("2026-10-20T10:00:00Z"), ZoneId.of("Europe/Paris"));
    }
  }

  private static final String EMAIL = "marco@exemple.fr";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @MockitoBean JavaMailSender mail;

  @BeforeEach
  void inscrire() throws Exception {
    jdbc.update("delete from compte.utilisateur");
    Mockito.clearInvocations(mail);
    mvc.perform(
            post("/api/compte/inscription")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"pseudo":"Marco","email":"%s","motDePasse":"chat-bleu-47-lune",
                     "dateNaissance":"2000-01-01","consentements":{"cgu":true,
                     "confidentialite":true,"versionCgu":"0.1-provisoire",
                     "versionConfidentialite":"0.1-provisoire","classement":false,
                     "emails":false}}
                    """
                        .formatted(EMAIL)))
        .andExpect(status().isAccepted());
  }

  /** Jeton du dernier e-mail reçu, après avoir attendu qu'il y en ait {@code n}. */
  private String dernierJeton(int n) {
    ArgumentCaptor<SimpleMailMessage> m = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail, timeout(3000).times(n)).send(m.capture());
    List<SimpleMailMessage> tous = m.getAllValues();
    String texte = tous.get(tous.size() - 1).getText();
    int debut = texte.indexOf("jeton=") + "jeton=".length();
    return texte.substring(debut).lines().findFirst().orElseThrow().strip();
  }

  private ResultActions verifier(String jeton) throws Exception {
    return mvc.perform(
        post("/api/compte/email/verification")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"jeton\":\"" + jeton + "\"}"));
  }

  private ResultActions renvoyer(String email) throws Exception {
    return mvc.perform(
        post("/api/compte/email/verification/renvoi")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\"}"));
  }

  private boolean verifie() {
    return jdbc.queryForObject(
        "select email_verifie_le is not null from compte.utilisateur", Boolean.class);
  }

  /** Recule la création des jetons pour sortir de la fenêtre anti-rafale. */
  private void vieillirLesJetons() {
    jdbc.update("update compte.jeton set cree_le = cree_le - interval '2 minutes'");
  }

  @Test
  void lienValideConfirmeLEmailPuisSecondClicDejaUtilise() throws Exception {
    String jeton = dernierJeton(1);
    verifier(jeton).andExpect(status().isNoContent());
    assertThat(verifie()).isTrue();
    verifier(jeton)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("jeton-deja-utilise"));
  }

  @Test
  void lienDePlusDe24hExpireEtLeCompteResteNonVerifie() throws Exception {
    String jeton = dernierJeton(1);
    jdbc.update("update compte.jeton set expire_le = '2026-10-20T11:59:00+02:00'");
    verifier(jeton)
        .andExpect(status().isGone())
        .andExpect(jsonPath("$.code").value("jeton-expire"));
    assertThat(verifie()).isFalse();
  }

  @Test
  void jetonInconnuOuVideEstInvalide() throws Exception {
    verifier("n-importe-quoi")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("jeton-invalide"));
    verifier("").andExpect(jsonPath("$.code").value("jeton-invalide"));
    verifier("x".repeat(101)).andExpect(jsonPath("$.code").value("jeton-invalide"));
    assertThat(verifie()).isFalse();
  }

  @Test
  void renvoyerEnvoieUnNouveauLienEtInvalideLAncien() throws Exception {
    String ancien = dernierJeton(1);
    vieillirLesJetons();
    renvoyer(EMAIL).andExpect(status().isAccepted());
    String nouveau = dernierJeton(2);
    assertThat(nouveau).isNotEqualTo(ancien);

    verifier(ancien)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("jeton-invalide"));
    verifier(nouveau).andExpect(status().isNoContent());
    assertThat(verifie()).isTrue();
  }

  @Test
  void renvoiNormaliseLAdresse() throws Exception {
    dernierJeton(1);
    vieillirLesJetons();
    renvoyer(" Marco@EXEMPLE.fr ").andExpect(status().isAccepted());
    dernierJeton(2);
  }

  @Test
  void deuxRenvoisAMoinsDeSoixanteSecondesNEnvoientQuUnMail() throws Exception {
    dernierJeton(1);
    vieillirLesJetons();
    renvoyer(EMAIL).andExpect(status().isAccepted());
    String nouveau = dernierJeton(2);
    renvoyer(EMAIL).andExpect(status().isAccepted());
    verify(mail, after(300).times(2)).send(any(SimpleMailMessage.class));
    // Le lien du premier renvoi reste valable : la seconde demande n'a rien remplacé.
    verifier(nouveau).andExpect(status().isNoContent());
  }

  @Test
  void adresseInconnueOuDejaVerifieeMemeReponseSansEnvoi() throws Exception {
    String inconnue =
        renvoyer("personne@exemple.fr")
            .andExpect(status().isAccepted())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String jeton = dernierJeton(1);
    verifier(jeton).andExpect(status().isNoContent());
    vieillirLesJetons();
    String connue =
        renvoyer(EMAIL)
            .andExpect(status().isAccepted())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(connue).isEqualTo(inconnue);
    verify(mail, after(300).times(1)).send(any(SimpleMailMessage.class));
  }

  @Test
  void renvoiAvecAdresseInvalideEstUneErreurDeValidation() throws Exception {
    renvoyer("pas-un-email")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("validation"));
  }

  @Test
  void lesJetonsNeSontStockesQueHaches() throws Exception {
    String jeton = dernierJeton(1);
    verify(mail, atLeastOnce()).send(any(SimpleMailMessage.class));
    byte[] empreinte = jdbc.queryForObject("select empreinte from compte.jeton", byte[].class);
    assertThat(new String(empreinte)).doesNotContain(jeton);
    assertThat(empreinte).hasSize(32);
  }
}
