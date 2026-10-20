package fr.zonumental.compte.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import jakarta.servlet.http.Cookie;
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

/** r0-socle-8 : renouvellement glissant et déconnexion (RG-010). */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, SessionTest.HorlogeFixe.class})
class SessionTest {

  static final Instant MAINTENANT = Instant.parse("2026-10-20T10:00:00Z");
  static final long JOUR = 24 * 3600;

  @TestConfiguration
  static class HorlogeFixe {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      return Clock.fixed(MAINTENANT, ZoneId.of("Europe/Paris"));
    }
  }

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder encodeur;

  String cookie;

  @BeforeEach
  void connecte() throws Exception {
    jdbc.update("delete from compte.utilisateur");
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le) values (?, 'marco@exemple.fr', 'Marco', ?,"
            + " '2000-01-01', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
        UUID.randomUUID(),
        encodeur.encode("chat-bleu-47-lune"));
    String set =
        mvc.perform(
                post("/api/auth/connexion")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"email\":\"marco@exemple.fr\",\"motDePasse\":\"chat-bleu-47-lune\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getHeader("Set-Cookie");
    cookie = set.substring("zonumental_session=".length(), set.indexOf(';'));
  }

  ResultActions renouveler(String valeur) throws Exception {
    var r = post("/api/auth/renouvellement");
    return mvc.perform(valeur == null ? r : r.cookie(new Cookie("zonumental_session", valeur)));
  }

  ResultActions deconnecter(String valeur) throws Exception {
    var r = post("/api/auth/deconnexion");
    return mvc.perform(valeur == null ? r : r.cookie(new Cookie("zonumental_session", valeur)));
  }

  Instant instant(String sql) {
    return jdbc.queryForObject(sql, Instant.class);
  }

  /** Simule une session dont le dernier usage remonte à {@code jours} jours. */
  void vieillirLaSession(long jours) {
    jdbc.update(
        "update compte.session set expire_le = ?::timestamptz",
        MAINTENANT.plusSeconds(30 * JOUR - jours * JOUR).toString());
  }

  void assertCookieEfface(ResultActions r) throws Exception {
    String set = r.andReturn().getResponse().getHeader("Set-Cookie");
    assertThat(set).startsWith("zonumental_session=;").contains("Max-Age=0", "Path=/api/auth");
  }

  @Test
  void renouvellementRepousseLExpirationEtRenvoieLeMemeCookie() throws Exception {
    vieillirLaSession(5);
    String set =
        renouveler(cookie)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.jetonAcces").isNotEmpty())
            .andExpect(jsonPath("$.expireDans").value(900))
            .andReturn()
            .getResponse()
            .getHeader("Set-Cookie");
    assertThat(set)
        .startsWith("zonumental_session=" + cookie + ";")
        .contains("HttpOnly", "Secure", "SameSite=Strict", "Path=/api/auth", "Max-Age=2592000");
    assertThat(instant("select expire_le from compte.session"))
        .isEqualTo(MAINTENANT.plusSeconds(30 * JOUR));
  }

  @Test
  void sessionInactiveDepuis31JoursEstRefuseeEtLeCookieEfface() throws Exception {
    vieillirLaSession(31);
    ResultActions r =
        renouveler(cookie)
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("session-expiree"));
    assertCookieEfface(r);
  }

  @Test
  void cookieAbsentOuInconnuDonne401SessionExpireeEtCookieEfface() throws Exception {
    assertCookieEfface(
        renouveler(null)
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("session-expiree")));
    assertCookieEfface(renouveler("inconnu").andExpect(status().isUnauthorized()));
  }

  @Test
  void compteEnSuppressionNePeutPasRenouveler() throws Exception {
    jdbc.update("update compte.utilisateur set suppression_demandee_le = '2026-10-10T08:00:00Z'");
    assertCookieEfface(
        renouveler(cookie)
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("session-expiree")));
  }

  @Test
  void derniereActiviteMiseAJourAuPlusUneFoisParJour() throws Exception {
    jdbc.update(
        "update compte.utilisateur set derniere_activite_le = ?::timestamptz",
        MAINTENANT.minusSeconds(JOUR / 2).toString());
    renouveler(cookie).andExpect(status().isOk());
    assertThat(instant("select derniere_activite_le from compte.utilisateur"))
        .isEqualTo(MAINTENANT.minusSeconds(JOUR / 2));
    jdbc.update(
        "update compte.utilisateur set derniere_activite_le = ?::timestamptz",
        MAINTENANT.minusSeconds(2 * JOUR).toString());
    renouveler(cookie).andExpect(status().isOk());
    assertThat(instant("select derniere_activite_le from compte.utilisateur"))
        .isEqualTo(MAINTENANT);
  }

  @Test
  void jetonAccesExpireNeBloquePasLeRenouvellement() throws Exception {
    mvc.perform(
            post("/api/auth/renouvellement")
                .cookie(new Cookie("zonumental_session", cookie))
                .header("Authorization", "Bearer abc.def.ghi"))
        .andExpect(status().isOk());
  }

  @Test
  void deconnexionSupprimeLaSessionEffaceLeCookieEtEstIdempotente() throws Exception {
    assertCookieEfface(deconnecter(cookie).andExpect(status().isNoContent()));
    assertThat(jdbc.queryForObject("select count(*) from compte.session", Integer.class)).isZero();
    assertCookieEfface(deconnecter(cookie).andExpect(status().isNoContent()));
    assertCookieEfface(deconnecter(null).andExpect(status().isNoContent()));
    renouveler(cookie).andExpect(status().isUnauthorized());
  }

  @Test
  void origineCroiseeNonListeeEstRejeteeSurLesRoutesAuthSansEffet() throws Exception {
    mvc.perform(
            post("/api/auth/deconnexion")
                .cookie(new Cookie("zonumental_session", cookie))
                .header("Origin", "https://evil.example"))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/auth/renouvellement")
                .cookie(new Cookie("zonumental_session", cookie))
                .header("Origin", "https://evil.example"))
        .andExpect(status().isForbidden());
    assertThat(jdbc.queryForObject("select count(*) from compte.session", Integer.class))
        .isEqualTo(1);
    mvc.perform(
            post("/api/auth/renouvellement")
                .cookie(new Cookie("zonumental_session", cookie))
                .header("Origin", "http://localhost:4200"))
        .andExpect(status().isOk());
  }

  @Test
  void aucunJsessionidNiSessionHttp() throws Exception {
    for (ResultActions r : new ResultActions[] {renouveler(cookie), renouveler("x")}) {
      var rep = r.andReturn();
      assertThat(rep.getResponse().getHeaders("Set-Cookie"))
          .noneMatch(c -> c.contains("JSESSIONID"));
      assertThat(rep.getRequest().getSession(false)).isNull();
    }
  }
}
