package fr.zonumental.catalogue;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class ImportRunnerTest {

  ImportCatalogue importCatalogue = mock(ImportCatalogue.class);
  Path fichier = Path.of("relecture.json");

  ImportRunner runner(String mode) {
    return new ImportRunner(importCatalogue, null, mode, fichier);
  }

  @Test
  void relecture_prepare_sans_figer() {
    when(importCatalogue.preparer(fichier))
        .thenReturn(new Proposition(List.of(), List.of(), List.of()));
    assertThat(runner("relecture").executer()).isZero();
    verify(importCatalogue).preparer(fichier);
  }

  @Test
  void figer_relit_le_fichier_puis_ecrit() {
    Proposition p = new Proposition(List.of(), List.of(), List.of());
    when(importCatalogue.lire(fichier)).thenReturn(p);
    assertThat(runner("figer").executer()).isZero();
    verify(importCatalogue).figer(p);
  }

  @Test
  void mode_inconnu_ou_erreur_donne_le_code_1() {
    assertThat(runner("autre").executer()).isEqualTo(1);
    when(importCatalogue.preparer(any())).thenThrow(new IllegalStateException("source HS"));
    assertThat(runner("relecture").executer()).isEqualTo(1);
  }
}
