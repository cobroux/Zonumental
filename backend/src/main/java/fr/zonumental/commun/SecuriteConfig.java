package fr.zonumental.commun;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

/**
 * Chaîne minimale : seules la santé et la doc OpenAPI (coupée en prod) sont publiques. La chaîne
 * complète arrive avec r0-socle-8.
 */
@Configuration
class SecuriteConfig {

  @Bean
  SecurityFilterChain chaine(HttpSecurity http) throws Exception {
    return http.csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(
            a ->
                a.requestMatchers("/api/health/**", "/v3/api-docs", "/v3/api-docs.yaml")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/compte/inscription")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
        .build();
  }
}
