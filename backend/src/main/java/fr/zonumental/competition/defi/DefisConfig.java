package fr.zonumental.competition.defi;

import java.io.IOException;
import java.io.InputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

/** Charge defis.yml au démarrage : config invalide = échec du démarrage. */
@Configuration
class DefisConfig {

  @Bean
  CatalogueDefis catalogueDefis(
      @Value("${zonumental.competition.defis:classpath:defis.yml}") Resource r) throws IOException {
    try (InputStream in = r.getInputStream()) {
      return CatalogueDefis.charger(in);
    }
  }
}
