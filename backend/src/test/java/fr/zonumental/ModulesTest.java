package fr.zonumental;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModulesTest {

  @Test
  void modulesRespectentLesDependancesAutorisees() {
    assertThatCode(() -> ApplicationModules.of(ZonumentalApplication.class).verify())
        .doesNotThrowAnyException();
  }

  // Preuve que la vérification échoue : le module faux.b lit un type interne de faux.a.
  @Test
  void accesAuTypeInterneDUnAutreModuleEstRejete() {
    assertThatThrownBy(() -> ApplicationModules.of("faux", location -> true).verify())
        .hasMessageContaining("faux.a.interne");
  }
}
