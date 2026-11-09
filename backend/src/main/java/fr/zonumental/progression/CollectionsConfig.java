package fr.zonumental.progression;

import java.io.IOException;
import java.io.InputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

/** Charge collections.yml au démarrage : config invalide = échec du démarrage. */
@Configuration
class CollectionsConfig {

  @Bean
  CatalogueCollections catalogueCollections(
      @Value("${zonumental.progression.collections:classpath:collections.yml}") Resource r)
      throws IOException {
    try (InputStream in = r.getInputStream()) {
      return CatalogueCollections.charger(in);
    }
  }
}
