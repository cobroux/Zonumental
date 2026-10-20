package fr.zonumental.compte;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
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
import java.util.Map;
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

@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, InscriptionTest.HorlogeFixe.class})
class InscriptionTest {

  /** Aujourd'hui = 2026-10-20 (Europe/Paris). */
  @TestConfiguration
  static class HorlogeFixe {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      return Clock.fixed(Instant.parse("2026-10-20T10:00:00Z"), ZoneId.of("Europe/Paris"));
    }
  }

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @MockitoBean JavaMailSender mail;

  @BeforeEach
  void vider() {
    jdbc.update("delete from compte.utilisateur");
    Mockito.clearInvocations(mail);
  }

  private ResultActions inscrire(
      String pseudo, String email, String mdp, String naissance, Map<String, Object> consent)
      throws Exception {
    String json =
        """
        {"pseudo":"%s","email":"%s","motDePasse":"%s","dateNaissance":"%s","consentements":%s}
        """
            .formatted(
                pseudo,
                email,
                mdp,
                naissance,
                new tools.jackson.databind.ObjectMapper().writeValueAsString(consent));
    return mvc.perform(
        post("/api/compte/inscription").contentType(MediaType.APPLICATION_JSON).content(json));
  }

  private static Map<String, Object> consent(boolean cgu, boolean conf, String version) {
    return Map.of(
        "cgu", cgu,
        "confidentialite", conf,
        "versionCgu", version,
        "versionConfidentialite", version,
        "classement", false,
        "emails", false);
  }

  private ResultActions valide(String pseudo, String email, String mdp, String naissance)
      throws Exception {
    return inscrire(pseudo, email, mdp, naissance, consent(true, true, "0.1-provisoire"));
  }

  private int compte(String table) {
    return jdbc.queryForObject("select count(*) from compte." + table, Integer.class);
  }

  @Test
  void inscriptionValideCreeLeCompteLesConsentementsEtEnvoieLeMail() throws Exception {
    valide("Marco", " Marco@Exemple.FR ", "chat-bleu-47-lune", "2006-05-01")
        .andExpect(status().isAccepted());

    Map<String, Object> u = jdbc.queryForMap("select * from compte.utilisateur");
    assertThat(u.get("email")).isEqualTo("marco@exemple.fr");
    assertThat((String) u.get("mot_de_passe_hash")).startsWith("$argon2id$");
    assertThat(u.get("email_verifie_le")).isNull();
    List<Map<String, Object>> cs =
        jdbc.queryForList(
            "select type, accorde, version_texte from compte.consentement order by type");
    assertThat(cs)
        .extracting(c -> c.get("type") + ":" + c.get("accorde") + ":" + c.get("version_texte"))
        .containsExactlyInAnyOrder(
            "CGU:true:0.1-provisoire",
            "CONFIDENTIALITE:true:0.1-provisoire",
            "CLASSEMENT:false:0.1-provisoire",
            "EMAILS:false:0.1-provisoire");
    assertThat(compte("jeton")).isEqualTo(1);

    ArgumentCaptor<SimpleMailMessage> m = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail, timeout(3000)).send(m.capture());
    assertThat(m.getValue().getTo()).containsExactly("marco@exemple.fr");
    assertThat(m.getValue().getText()).contains("/verifier-email?jeton=");
  }

  @Test
  void quinzeAnsAujourdhuiAccepteQuinzeAnsDemainRefuse() throws Exception {
    valide("Pile", "pile@exemple.fr", "chat-bleu-47-lune", "2011-10-20")
        .andExpect(status().isAccepted());
    valide("Demain", "demain@exemple.fr", "chat-bleu-47-lune", "2011-10-21")
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("age-minimum"));
    assertThat(compte("utilisateur")).isEqualTo(1);
  }

  @Test
  void quatorzeAnsOuDateFutureRefusesSansRienConserver() throws Exception {
    valide("Jeune", "jeune@exemple.fr", "chat-bleu-47-lune", "2012-01-01")
        .andExpect(jsonPath("$.code").value("age-minimum"));
    valide("Futur", "futur@exemple.fr", "chat-bleu-47-lune", "2030-01-01")
        .andExpect(jsonPath("$.code").value("age-minimum"));
    assertThat(compte("utilisateur") + compte("consentement") + compte("jeton")).isZero();
    verify(mail, after(300).never()).send(any(SimpleMailMessage.class));
  }

  @Test
  void dateInvalideEstUneErreurDeValidation() throws Exception {
    valide("Date", "date@exemple.fr", "chat-bleu-47-lune", "2011-13-45")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("validation"))
        .andExpect(jsonPath("$.erreurs[0].champ").value("dateNaissance"))
        .andExpect(jsonPath("$.erreurs[0].code").value("date-invalide"));
  }

  @Test
  void cguOuConfidentialiteNonCocheesRefusees() throws Exception {
    inscrire(
            "Cgu",
            "cgu@exemple.fr",
            "chat-bleu-47-lune",
            "2000-01-01",
            consent(false, true, "0.1-provisoire"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("consentement-obligatoire"));
    inscrire(
            "Conf",
            "conf@exemple.fr",
            "chat-bleu-47-lune",
            "2000-01-01",
            consent(true, false, "0.1-provisoire"))
        .andExpect(jsonPath("$.code").value("consentement-obligatoire"));
    assertThat(compte("utilisateur")).isZero();
  }

  @Test
  void versionDeTexteObsoleteRefusee() throws Exception {
    inscrire(
            "Vieux",
            "vieux@exemple.fr",
            "chat-bleu-47-lune",
            "2000-01-01",
            consent(true, true, "2020-01-01"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("version-texte-obsolete"));
    assertThat(compte("utilisateur")).isZero();
  }

  @Test
  void motDePasseDeOnzeCaracteresRefuseDouzeAvecAccentsEtEspacesAccepte() throws Exception {
    valide("Court", "court@exemple.fr", "Abc123!xyzé", "2000-01-01")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.erreurs[0].champ").value("motDePasse"))
        .andExpect(jsonPath("$.erreurs[0].code").value("trop-court"));
    valide("Long", "long@exemple.fr", "été à la mer ", "2000-01-01")
        .andExpect(status().isAccepted());
    assertThat(compte("utilisateur")).isEqualTo(1);
  }

  @Test
  void pseudoDejaPrisSansTenirCompteDeLaCasseEtFormatDuPseudo() throws Exception {
    valide("Marco", "a@exemple.fr", "chat-bleu-47-lune", "2000-01-01")
        .andExpect(status().isAccepted());
    valide("marco", "b@exemple.fr", "chat-bleu-47-lune", "2000-01-01")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("pseudo-deja-pris"));
    valide("ab", "c@exemple.fr", "chat-bleu-47-lune", "2000-01-01")
        .andExpect(status().isBadRequest());
    valide("a b", "d@exemple.fr", "chat-bleu-47-lune", "2000-01-01")
        .andExpect(status().isBadRequest());
    assertThat(compte("utilisateur")).isEqualTo(1);
  }

  @Test
  void emailDejaUtiliseDonneLaMemeReponseSansNouveauCompte() throws Exception {
    String premiere =
        valide("Premier", "toto@exemple.fr", "chat-bleu-47-lune", "2000-01-01")
            .andReturn()
            .getResponse()
            .getContentAsString();
    verify(mail, timeout(3000)).send(any(SimpleMailMessage.class));
    Mockito.clearInvocations(mail);

    ResultActions r = valide("Second", " TOTO@Exemple.fr", "chat-bleu-47-lune", "2000-01-01");
    r.andExpect(status().isAccepted());
    assertThat(r.andReturn().getResponse().getContentAsString()).isEqualTo(premiere);
    assertThat(compte("utilisateur")).isEqualTo(1);
    assertThat(compte("jeton")).isEqualTo(1);

    ArgumentCaptor<SimpleMailMessage> m = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail, timeout(3000)).send(m.capture());
    assertThat(m.getValue().getText()).doesNotContain("jeton=").contains("déjà un carnet");
  }

  @Test
  void unEchecDEnvoiNeCasseNiLaReponseNiLeCompte() throws Exception {
    Mockito.doThrow(new org.springframework.mail.MailSendException("smtp"))
        .when(mail)
        .send(any(SimpleMailMessage.class));
    valide("Panne", "panne@exemple.fr", "chat-bleu-47-lune", "2000-01-01")
        .andExpect(status().isAccepted());
    verify(mail, timeout(3000)).send(any(SimpleMailMessage.class));
    assertThat(compte("utilisateur")).isEqualTo(1);
  }

  @Test
  void corpsIncompletEstUneErreurDeValidation() throws Exception {
    mvc.perform(
            post("/api/compte/inscription").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("validation"));
    verify(mail, never()).send(any(SimpleMailMessage.class));
  }
}
