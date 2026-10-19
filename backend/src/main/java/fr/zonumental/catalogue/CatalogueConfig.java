package fr.zonumental.catalogue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.client.RestClient;

/** Beans de l'import, créés seulement quand la tâche est demandée. */
@Configuration
@ConditionalOnProperty("zonumental.catalogue.importer")
class CatalogueConfig {

  @Bean
  Quotas quotas(@Value("${zonumental.catalogue.quotas:classpath:catalogue-quotas.yml}") Resource r)
      throws IOException {
    try (InputStream in = r.getInputStream()) {
      return Quotas.charger(in);
    }
  }

  @Bean
  SourceMonuments sourceMonuments(
      RestClient.Builder builder,
      @Value("${zonumental.contact:}") String contact,
      @Value("${zonumental.catalogue.delai-ms:200}") long delaiMs) {
    return new SourceWikimedia(builder, Clock.systemUTC(), contact, delaiMs);
  }

  @Bean
  ImportCatalogue importCatalogue(
      JdbcClient jdbc,
      PlatformTransactionManager tm,
      SourceMonuments source,
      Quotas quotas,
      @Value("${zonumental.catalogue.images-dir:images-catalogue}") Path images) {
    return new ImportCatalogue(jdbc, tm, source, quotas, images);
  }
}
