package fr.zonumental.catalogue;

import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

/**
 * Tâche ponctuelle : {@code --zonumental.catalogue.importer=relecture|figer}, puis arrêt de
 * l'application (code 0 si succès, 1 sinon).
 */
@Component
@ConditionalOnProperty("zonumental.catalogue.importer")
class ImportRunner implements ApplicationRunner {

  private static final Logger LOG = LoggerFactory.getLogger(ImportRunner.class);

  private final ImportCatalogue importCatalogue;
  private final ApplicationContext contexte;
  private final String mode;
  private final Path fichier;

  ImportRunner(
      ImportCatalogue importCatalogue,
      ApplicationContext contexte,
      @Value("${zonumental.catalogue.importer}") String mode,
      @Value("${zonumental.catalogue.fichier:catalogue-relecture.json}") Path fichier) {
    this.importCatalogue = importCatalogue;
    this.contexte = contexte;
    this.mode = mode;
    this.fichier = fichier;
  }

  @Override
  public void run(ApplicationArguments args) {
    int code = executer();
    System.exit(SpringApplication.exit(contexte, () -> code));
  }

  int executer() {
    try {
      switch (mode) {
        case "relecture" -> {
          Proposition p = importCatalogue.preparer(fichier);
          LOG.info(
              "Relecture : {} nouveaux, {} existants, {} absents des sources. Fichier : {}",
              p.nouveaux().size(),
              p.existants().size(),
              p.absentsDesSources().size(),
              fichier);
        }
        case "figer" -> {
          importCatalogue.figer(importCatalogue.lire(fichier));
          LOG.info("Catalogue figé depuis {}", fichier);
        }
        default -> throw new IllegalArgumentException("mode inconnu : " + mode);
      }
      return 0;
    } catch (RuntimeException e) {
      LOG.error("Import interrompu, rien n'a été écrit en base", e);
      return 1;
    }
  }
}
