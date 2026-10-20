package fr.zonumental.compte.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

/** r0-socle-8 : chaîne stateless, jeton d'accès JWT, 401 problem+json, CORS. */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, SecuriteTest.HorlogeFixe.class})
class SecuriteTest {

  static final Instant MAINTENANT = Instant.parse("2026-10-20T10:00:00Z");

  @TestConfiguration
  static class HorlogeFixe {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      return Clock.fixed(MAINTENANT, ZoneId.of("Europe/Paris"));
    }
  }

  private static final String NON_AUTHENTIFIE =
      "{\"type\":\"https://zonumental.fr/erreurs/non-authentifie\",\"title\":\"non-authentifie\","
          + "\"status\":401,\"code\":\"non-authentifie\"}";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired JetonsAcces jetonsAcces;
  @Autowired JwtEncoder encodeur;

  UUID id = UUID.randomUUID();

  @BeforeEach
  void utilisateur() {
    jdbc.update("delete from compte.utilisateur");
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le) values (?, 'marco@exemple.fr', 'Marco', 'x',"
            + " '2000-01-01', now(), now())",
        id);
  }

  private String jeton(Instant expire) {
    JwtClaimsSet c =
        JwtClaimsSet.builder()
            .subject(id.toString())
            .issuedAt(MAINTENANT.minusSeconds(900))
            .expiresAt(expire)
            .build();
    return encodeur
        .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), c))
        .getTokenValue();
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder moi(
      String jeton) {
    return get("/api/compte/moi").header("Authorization", "Bearer " + jeton);
  }

  @Test
  void sansJetonRepond401ProblemJsonSansSessionHttp() throws Exception {
    mvc.perform(get("/api/compte/moi"))
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("Content-Type", "application/problem+json"))
        .andExpect(header().doesNotExist("Set-Cookie"))
        .andExpect(content().json(NON_AUTHENTIFIE, true));
  }

  @Test
  void jetonExpireRepond401ProblemJson() throws Exception {
    mvc.perform(moi(jeton(MAINTENANT.minusSeconds(1))))
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("Content-Type", "application/problem+json"))
        .andExpect(header().doesNotExist("Set-Cookie"))
        .andExpect(content().json(NON_AUTHENTIFIE, true));
  }

  /** Le validateur n'a aucune tolérance (Spring en accorde 60 s par défaut). */
  @Test
  void jetonExpireDepuis30SecondesEstRefuse() throws Exception {
    mvc.perform(moi(jeton(MAINTENANT.minusSeconds(30)))).andExpect(status().isUnauthorized());
  }

  @Test
  void jetonMalSigneRepond401() throws Exception {
    mvc.perform(moi("abc.def.ghi"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("non-authentifie"));
  }

  @Test
  void jetonValideDonneLeProfilSansEmailVerifie() throws Exception {
    mvc.perform(moi(jetonsAcces.emettre(id)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(id.toString()))
        .andExpect(jsonPath("$.pseudo").value("Marco"))
        .andExpect(jsonPath("$.email").value("marco@exemple.fr"))
        .andExpect(jsonPath("$.emailVerifie").value(false));
  }

  @Test
  void emailVerifieExposeQuandLaVerificationEstFaite() throws Exception {
    jdbc.update("update compte.utilisateur set email_verifie_le = now()");
    mvc.perform(moi(jetonsAcces.emettre(id))).andExpect(jsonPath("$.emailVerifie").value(true));
  }

  @Test
  void jetonAccesPorteSubIatExpDe15MinutesEtRienD_Autre() {
    NimbusJwtDecoder decodeur =
        NimbusJwtDecoder.withSecretKey(
                new SecretKeySpec(
                    Base64.getDecoder().decode(System.getProperty("ZONUMENTAL_JWT_SECRET")),
                    "HmacSHA256"))
            .macAlgorithm(MacAlgorithm.HS256)
            .build();
    decodeur.setJwtValidator(t -> OAuth2TokenValidatorResult.success());
    var jwt = decodeur.decode(jetonsAcces.emettre(id));
    assertThat(jwt.getSubject()).isEqualTo(id.toString());
    assertThat(jwt.getIssuedAt()).isEqualTo(MAINTENANT);
    assertThat(jwt.getExpiresAt()).isEqualTo(MAINTENANT.plusSeconds(900));
    assertThat(jwt.getClaims().keySet()).containsExactlyInAnyOrder("sub", "iat", "exp");
    assertThat(jwt.getHeaders()).containsEntry("alg", "HS256");
  }

  @Test
  void origineCroiseeNonListeeEstRejetee403() throws Exception {
    mvc.perform(get("/api/health").header("Origin", "https://evil.example"))
        .andExpect(status().isForbidden());
  }

  @Test
  void origineDuFrontEtRequeteSansOriginPassent() throws Exception {
    mvc.perform(get("/api/health").header("Origin", "http://localhost:4200"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"))
        .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    mvc.perform(get("/api/health")).andExpect(status().isOk());
  }
}
