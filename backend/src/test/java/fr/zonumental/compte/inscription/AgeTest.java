package fr.zonumental.compte.inscription;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class AgeTest {

  @Test
  void ne29FevrierAQuinzeAnsLe28Fevrier() {
    LocalDate naissance = LocalDate.of(2012, 2, 29);
    assertThat(Inscription.ageAtteint(naissance, LocalDate.of(2027, 2, 27))).isFalse();
    assertThat(Inscription.ageAtteint(naissance, LocalDate.of(2027, 2, 28))).isTrue();
  }
}
