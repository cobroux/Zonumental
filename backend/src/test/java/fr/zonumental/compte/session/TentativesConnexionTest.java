package fr.zonumental.compte.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
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

/** r0-socle-9 : limitation des tentatives de connexion et purge nocturne (RG-009). */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, TentativesConnexionTest.HorlogeReglable.class})
class TentativesConnexionTest {

  static final Instant DEBUT = Instant.parse("2026-10-20T10:00:00Z");

  /** Horloge que le test avance à la main. */
  static class Reglable extends Clock {
    volatile Instant maintenant = DEBUT;

    @Override
    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return maintenant;
    }
  }

  @TestConfiguration
  static class HorlogeReglable {
    @Bean
    @Primary
    Reglable horlogeReglable() {
      return new Reglable();
    }
  }

  static final String EMAIL = "marco@exemple.fr";
  static final String MDP = "café-bleu-47-lune";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder encodeur;
  @Autowired Reglable horloge;
  @Autowired PurgeNocturne purge;
  @MockitoSpyBean PasswordEncoder encodeurEspion;

  @BeforeEach
  void init() {
    horloge.maintenant = DEBUT;
    jdbc.update("delete from compte.tentative_connexion");
    jdbc.update("delete from compte.utilisateur");
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le) values (?, ?, 'Marco', ?, '2000-01-01',"
            + " '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
        UUID.randomUUID(),
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

  void echecs(String email, int n) throws Exception {
    for (int i = 0; i < n; i++) {
      connexion(email, "mauvais-mot-de-passe").andExpect(status().isUnauthorized());
    }
  }

  @Test
  void cinqEchecsBloquentMemeLeBonMotDePasseSansCalculArgon2PuisQuinzeMinutesApresCaPasse()
      throws Exception {
    echecs(EMAIL, 5);
    clearInvocations(encodeurEspion);
    connexion(EMAIL, MDP)
        .andExpect(status().isTooManyRequests())
        .andExpect(header().string("Content-Type", "application/problem+json"))
        .andExpect(jsonPath("$.code").value("connexion-bloquee"))
        .andExpect(header().string("Retry-After", "900"))
        .andExpect(header().doesNotExist("Set-Cookie"));
    verifyNoInteractions(encodeurEspion);

    horloge.maintenant = DEBUT.plus(Duration.ofMinutes(5));
    connexion(EMAIL, MDP)
        .andExpect(status().isTooManyRequests())
        .andExpect(header().string("Retry-After", "600"));

    horloge.maintenant = DEBUT.plus(Duration.ofMinutes(15));
    connexion(EMAIL, MDP).andExpect(status().isOk());
  }

  @Test
  void unSuccesAvantLeCinquiemeEchecRemetLeCompteurAZero() throws Exception {
    echecs(EMAIL, 4);
    connexion(EMAIL, MDP).andExpect(status().isOk());
    echecs(EMAIL, 4);
    connexion(EMAIL, MDP).andExpect(status().isOk());
  }

  @Test
  void apresLeBlocageLeCompteurRepartDeZero() throws Exception {
    echecs(EMAIL, 5);
    horloge.maintenant = DEBUT.plus(Duration.ofMinutes(16));
    echecs(EMAIL, 4);
    connexion(EMAIL, MDP).andExpect(status().isOk());
  }

  @Test
  void adresseInexistanteEstBloqueeAvecLaMemeReponse() throws Exception {
    echecs(EMAIL, 5);
    echecs("personne@exemple.fr", 5);
    String connu =
        connexion(EMAIL, MDP)
            .andExpect(status().isTooManyRequests())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String inconnu =
        connexion("personne@exemple.fr", MDP)
            .andExpect(status().isTooManyRequests())
            .andExpect(header().string("Retry-After", "900"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(inconnu).isEqualTo(connu);
  }

  @Test
  void lEmailEstNormalisePourLeCompteurEtJamaisStockeEnClair() throws Exception {
    echecs("  MARCO@Exemple.FR ", 5);
    connexion(EMAIL, MDP).andExpect(status().isTooManyRequests());
    byte[] cle =
        jdbc.queryForObject("select empreinte_email from compte.tentative_connexion", byte[].class);
    assertThat(cle).hasSize(32);
    assertThat(new String(cle)).doesNotContain("marco");
  }

  @Test
  void unSuccesSurUnCompteEnSuppressionRemetAussiLeCompteurAZero() throws Exception {
    jdbc.update("update compte.utilisateur set suppression_demandee_le = '2026-10-10T08:00:00Z'");
    echecs(EMAIL, 4);
    connexion(EMAIL, MDP).andExpect(status().isConflict());
    echecs(EMAIL, 4);
    connexion(EMAIL, MDP).andExpect(status().isConflict());
  }

  @Test
  void laPurgeSupprimeTentativesDePlusDe24hEtSessionsExpireesSeulement() throws Exception {
    echecs(EMAIL, 2); // récente, doit rester
    jdbc.update(
        "insert into compte.tentative_connexion values ('\\x01', 3, null, ?::timestamptz)",
        DEBUT.minus(Duration.ofHours(25)).toString());
    var uid = jdbc.queryForObject("select id from compte.utilisateur", UUID.class);
    jdbc.update(
        "insert into compte.session (utilisateur_id, empreinte, cree_le, expire_le) values"
            + " (?, '\\x01', ?::timestamptz, ?::timestamptz), (?, '\\x02', ?::timestamptz,"
            + " ?::timestamptz)",
        uid,
        DEBUT.minus(Duration.ofDays(31)).toString(),
        DEBUT.minusSeconds(1).toString(),
        uid,
        DEBUT.toString(),
        DEBUT.plus(Duration.ofDays(30)).toString());

    purge.purger();

    assertThat(
            jdbc.queryForObject("select count(*) from compte.tentative_connexion", Integer.class))
        .isEqualTo(1);
    assertThat(jdbc.queryForObject("select count(*) from compte.session", Integer.class))
        .isEqualTo(1);
    assertThat(jdbc.queryForObject("select empreinte from compte.session", byte[].class))
        .containsExactly(2);
  }
}
