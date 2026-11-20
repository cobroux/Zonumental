package fr.zonumental.competition.defi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class CatalogueDefisTest {

  static final String CAP = "critere: CAPTURES, seuil: 3";

  static CatalogueDefis charger(String yml) {
    return CatalogueDefis.charger(new ByteArrayInputStream(yml.getBytes()));
  }

  static String defi(String code, String debut, String fin, String reste) {
    return "  - { code: "
        + code
        + ", nom: N, description: D, saison: S, semaine: 1, debut: "
        + debut
        + ", fin: "
        + fin
        + ", recompense: R, "
        + reste
        + " }\n";
  }

  @Test
  void accepteDatesNonQuotees() {
    var c = charger("defis:\n" + defi("A", "2026-10-05", "2026-10-12", CAP));
    assertThat(c.defis().get(0).debut()).isEqualTo(LocalDate.of(2026, 10, 5));
  }

  @Test
  void courantEstSurLaFenetreFinExclue() {
    var c = charger("defis:\n" + defi("A", "2026-10-05", "2026-10-12", CAP));
    assertThat(c.courant(LocalDate.of(2026, 10, 11))).isPresent();
    assertThat(c.courant(LocalDate.of(2026, 10, 12))).isEmpty();
  }

  @Test
  void rejetteConfigIncoherente() {
    String ok = defi("A", "2026-10-05", "2026-10-12", CAP);
    assertThatThrownBy(() -> charger("defis:\n" + ok + ok)).hasMessageContaining("double");
    assertThatThrownBy(() -> charger("defis:\n" + defi("A", "2026-10-12", "2026-10-12", CAP)))
        .hasMessageContaining("fin");
    assertThatThrownBy(() -> charger("defis:\n" + ok + defi("B", "2026-10-11", "2026-10-18", CAP)))
        .hasMessageContaining("chevauche");
    assertThatThrownBy(
            () -> charger("defis:\n" + defi("A", "2026-10-05", "2026-10-12", "critere: X")))
        .hasMessageContaining("critère");
    assertThatThrownBy(
            () -> charger("defis:\n" + defi("A", "2026-10-05", "2026-10-12", "critere: MONUMENTS")))
        .hasMessageContaining("monuments");
    assertThatThrownBy(
            () -> charger("defis:\n" + defi("A", "2026-10-05", "2026-10-12", "critere: CAPTURES")))
        .hasMessageContaining("seuil");
  }

  @Test
  void monumentsSeuilEgalTailleDeLaListe() {
    var c =
        charger(
            "defis:\n"
                + defi("A", "2026-10-05", "2026-10-12", "critere: MONUMENTS, monuments: [1, 2]"));
    assertThat(c.defis().get(0).seuil()).isEqualTo(2);
  }
}
