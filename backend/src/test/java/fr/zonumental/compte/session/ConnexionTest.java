package fr.zonumental.compte.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Map;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** r0-socle-8 : connexion et création de la session de renouvellement (RG-008, RG-010). */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, ConnexionTest.HorlogeFixe.class})
class ConnexionTest {

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
  // « é » en forme composée (NFC) en base ; le client peut l'envoyer décomposé (NFD).
  static final String MDP = "café-bleu-47-lune";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder encodeur;
  @MockitoSpyBean PasswordEncoder encodeurEspion;

  UUID id = UUID.randomUUID();

  @BeforeEach
  void utilisateur() {
    jdbc.update("delete from compte.utilisateur");
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le) values (?, ?, 'Marco', ?, '2000-01-01',"
            + " '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
        id,
        EMAIL,
        encodeur.encode(MDP));
  }

  ResultActions connexion(String email, String mdp) throws Exception {
    return mvc.perform(
        post("/api/auth/connexion")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                new tools.jackson.databind.ObjectMapper()
                    .writeValueAsString(Map.of("email", email, "motDePasse", mdp))));
  }

  Instant instant(String colonne) {
    return jdbc.queryForObject("select " + colonne + " from compte.session", Instant.class);
  }

  int sessions() {
    return jdbc.queryForObject("select count(*) from compte.session", Integer.class);
  }

  @Test
  void succesDonneJetonAccesEtCookieAuxBonsAttributs() throws Exception {
    String cookie =
        connexion(EMAIL, MDP)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.expireDans").value(900))
            .andExpect(jsonPath("$.jetonAcces").isNotEmpty())
            .andReturn()
            .getResponse()
            .getHeader("Set-Cookie");
    assertThat(cookie)
        .startsWith("zonumental_session=")
        .contains("HttpOnly", "Secure", "SameSite=Strict", "Path=/api/auth", "Max-Age=2592000");
    assertThat(sessions()).isEqualTo(1);
  }

  @Test
  void laSessionNeStockeQueLEmpreinteEtExpireDansTrenteJours() throws Exception {
    String cookie = connexion(EMAIL, MDP).andReturn().getResponse().getHeader("Set-Cookie");
    String valeur = cookie.substring("zonumental_session=".length(), cookie.indexOf(';'));
    Map<String, Object> s = jdbc.queryForMap("select * from compte.session");
    assertThat((byte[]) s.get("empreinte")).hasSize(32);
    assertThat(new String((byte[]) s.get("empreinte"))).doesNotContain(valeur);
    assertThat(instant("expire_le")).isEqualTo(MAINTENANT.plusSeconds(30L * 24 * 3600));
    assertThat(instant("cree_le")).isEqualTo(MAINTENANT);
    assertThat(s.get("utilisateur_id")).isEqualTo(id);
    OffsetDateTime activite =
        jdbc.queryForObject(
            "select derniere_activite_le from compte.utilisateur", OffsetDateTime.class);
    assertThat(activite.toInstant()).isEqualTo(MAINTENANT);
  }

  @Test
  void leJetonAccesDonneAccesAuProfilMemeSiLEmailNEstPasVerifie() throws Exception {
    String corps = connexion(EMAIL, MDP).andReturn().getResponse().getContentAsString();
    String jeton =
        new tools.jackson.databind.ObjectMapper().readTree(corps).get("jetonAcces").asString();
    mvc.perform(get("/api/compte/moi").header("Authorization", "Bearer " + jeton))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.emailVerifie").value(false));
  }

  @Test
  void emailNormaliseEtMotDePasseNfcAcceptes() throws Exception {
    connexion(
            "  MARCO@Exemple.FR ",
            java.text.Normalizer.normalize(MDP, java.text.Normalizer.Form.NFD))
        .andExpect(status().isOk());
  }

  @Test
  void mauvaisMotDePasseEtEmailInconnuDonnentLaMemeReponse401SansCookie() throws Exception {
    String mauvais =
        connexion(EMAIL, "mauvais-mot-de-passe")
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("identifiants-invalides"))
            .andExpect(header().doesNotExist("Set-Cookie"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    String inconnu =
        connexion("personne@exemple.fr", MDP)
            .andExpect(status().isUnauthorized())
            .andExpect(header().doesNotExist("Set-Cookie"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(inconnu).isEqualTo(mauvais);
    assertThat(sessions()).isZero();
  }

  @Test
  void emailInconnuCalculeQuandMemeUnHash() throws Exception {
    org.mockito.Mockito.clearInvocations(encodeurEspion);
    connexion("personne@exemple.fr", MDP).andExpect(status().isUnauthorized());
    verify(encodeurEspion, atLeastOnce()).matches(any(), any());
  }

  @Test
  void delaiDeSuppressionEcouleRepond401() throws Exception {
    jdbc.update("update compte.utilisateur set suppression_demandee_le = '2026-09-20T08:00:00Z'");
    connexion(EMAIL, MDP)
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("identifiants-invalides"));
  }

  @Test
  void compteEnSuppressionRepond409AvecLaDateDefinitiveSansSession() throws Exception {
    jdbc.update("update compte.utilisateur set suppression_demandee_le = '2026-10-10T08:00:00Z'");
    String corps =
        connexion(EMAIL, MDP)
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("suppression-en-cours"))
            .andExpect(header().doesNotExist("Set-Cookie"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    String date =
        new tools.jackson.databind.ObjectMapper()
            .readTree(corps)
            .get("suppressionDefinitiveLe")
            .asString();
    assertThat(OffsetDateTime.parse(date).toInstant())
        .isEqualTo(Instant.parse("2026-11-08T08:00:00Z"));
    assertThat(sessions()).isZero();
  }

  @Test
  void compteEnSuppressionAvecMauvaisMotDePasseResteUn401() throws Exception {
    jdbc.update("update compte.utilisateur set suppression_demandee_le = '2026-10-10T08:00:00Z'");
    connexion(EMAIL, "mauvais-mot-de-passe")
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("identifiants-invalides"));
  }

  @Test
  void corpsInvalideEstUneErreurDeValidation() throws Exception {
    mvc.perform(
            post("/api/auth/connexion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"pas-un-email\",\"motDePasse\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("validation"));
  }
}
