package fr.zonumental.compte;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@EnableAsync
class CompteConfig {

  @Bean
  Clock horloge() {
    return Clock.system(ZoneId.of("Europe/Paris"));
  }

  /** Argon2id, paramètres minimum OWASP (ADR 0004) : sel 16, hash 32, p=1, m=19 Mio, t=2. */
  @Bean
  PasswordEncoder motsDePasse() {
    return new Argon2PasswordEncoder(16, 32, 1, 19456, 2);
  }
}
