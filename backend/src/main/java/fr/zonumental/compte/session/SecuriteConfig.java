package fr.zonumental.compte.session;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Chaîne unique (ADR 0004) : routes publiques listées, tout le reste exige un JWT. Stateless, CSRF
 * coupé ; le contrôle d'Origin est assuré par CORS (une origine croisée non listée reçoit 403).
 */
@Configuration
class SecuriteConfig {

  @Bean
  SecurityFilterChain chaine(
      HttpSecurity http, CorsConfigurationSource cors, NonAuthentifie nonAuthentifie)
      throws Exception {
    return http.csrf(csrf -> csrf.disable())
        .cors(c -> c.configurationSource(cors))
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers("/api/health/**", "/v3/api-docs", "/v3/api-docs.yaml")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.POST,
                        "/api/compte/inscription",
                        "/api/compte/email/verification",
                        "/api/compte/email/verification/renvoi",
                        "/api/auth/connexion",
                        "/api/auth/renouvellement",
                        "/api/auth/deconnexion")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(
            o ->
                o.jwt(j -> {})
                    .bearerTokenResolver(
                        // Un jeton périmé ne doit pas empêcher d'en demander un nouveau.
                        r ->
                            r.getRequestURI().startsWith("/api/auth/")
                                ? null
                                : new DefaultBearerTokenResolver().resolve(r))
                    .authenticationEntryPoint(nonAuthentifie))
        .exceptionHandling(e -> e.authenticationEntryPoint(nonAuthentifie))
        .build();
  }

  /** Secret en base64, 32 octets minimum : sinon l'appli ne démarre pas. */
  @Bean
  SecretKey cleJwt(@Value("${zonumental.jwt.secret}") String secret) {
    byte[] octets = Base64.getDecoder().decode(secret.strip());
    if (octets.length < 32) {
      throw new IllegalStateException("ZONUMENTAL_JWT_SECRET : 32 octets minimum");
    }
    return new SecretKeySpec(octets, "HmacSHA256");
  }

  @Bean
  JwtEncoder encodeurJwt(SecretKey cle) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(cle));
  }

  /** Aucune tolérance d'horloge (60 s par défaut dans Spring) : un jeton expiré est refusé. */
  @Bean
  JwtDecoder decodeurJwt(SecretKey cle, Clock horloge) {
    NimbusJwtDecoder d =
        NimbusJwtDecoder.withSecretKey(cle).macAlgorithm(MacAlgorithm.HS256).build();
    JwtTimestampValidator temps = new JwtTimestampValidator(Duration.ZERO);
    temps.setClock(horloge);
    d.setJwtValidator(new DelegatingOAuth2TokenValidator<>(temps));
    return d;
  }

  /** Le front et les origines de ZONUMENTAL_CORS_ORIGINES ; une requête sans Origin passe. */
  @Bean
  CorsConfigurationSource cors(
      @Value("${zonumental.front-url}") String front,
      @Value("${zonumental.cors-origines:}") List<String> autres) {
    CorsConfiguration c = new CorsConfiguration();
    c.addAllowedOrigin(front);
    autres.stream().filter(o -> !o.isBlank()).forEach(o -> c.addAllowedOrigin(o.strip()));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    c.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
    s.registerCorsConfiguration("/api/**", c);
    return s;
  }
}
