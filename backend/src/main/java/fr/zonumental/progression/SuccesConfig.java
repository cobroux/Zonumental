package fr.zonumental.progression;

import java.io.IOException;
import java.io.InputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

/** Charge succes.yml au démarrage : config invalide = échec du démarrage. */
@Configuration
class SuccesConfig {

  @Bean
  CatalogueSucces catalogueSucces(
      @Value("${zonumental.progression.succes:classpath:succes.yml}") Resource r)
      throws IOException {
    try (InputStream in = r.getInputStream()) {
      return CatalogueSucces.charger(in);
    }
  }
}
