package fr.zonumental.progression;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/** r2-collectionner-3 : chargement et validation de collections.yml (RG-R2-05, RG-R2-05b). */
class CatalogueCollectionsTest {

  private static final String REGIONS =
      "regions:\n  Pays de la Loire: ['44', '49']\n  Corse: ['2A']\n";

  private static CatalogueCollections lire(String yaml) {
    return CatalogueCollections.charger(
        new ByteArrayInputStream(yaml.getBytes(StandardCharsets.UTF_8)));
  }

  @Test
  void fichier_livre_est_valide_sans_loire() throws IOException {
    try (InputStream in = new ClassPathResource("collections.yml").getInputStream()) {
      var c = CatalogueCollections.charger(in);
      assertThat(c.collections())
          .extracting(CatalogueCollections.Collection::code)
          .containsExactly(
              "TYPE-CHATEAU",
              "TYPE-RELIGIEUX",
              "TYPE-PONT",
              "TYPE-MUSEE",
              "TYPE-PALAIS-TOUR",
              "VILLE-75056");
    }
  }

  @Test
  void region_derivee_du_code_insee() {
    var c =
        lire(
            REGIONS
                + "collections:\n  - { code: R, nom: R, types: [CHATEAU], region: Pays de la"
                + " Loire }\n");
    var r = c.collections().getFirst();
    assertThat(c.accepte(r, "CHATEAU", "44109")).isTrue();
    assertThat(c.accepte(r, "CHATEAU", "49007")).isTrue();
    assertThat(c.accepte(r, "CHATEAU", "75056")).isFalse();
    assertThat(c.accepte(r, "PONT", "44109")).isFalse();
  }

  @Test
  void departement_hors_table_ou_outre_mer_sur_trois_caracteres() {
    var c =
        lire(
            "regions:\n  Guyane: ['973']\ncollections:\n  - { code: G, nom: G, region: Guyane }\n");
    var g = c.collections().getFirst();
    assertThat(c.accepte(g, "PONT", "97302")).isTrue();
    assertThat(c.accepte(g, "PONT", "97101")).isFalse();
  }

  @Test
  void code_duplique_echoue() {
    assertThatThrownBy(
            () ->
                lire(
                    "collections:\n  - { code: A, nom: A, types: [PONT] }\n"
                        + "  - { code: A, nom: B, types: [MUSEE] }\n"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("A");
  }

  @Test
  void criteres_invalides_echouent() {
    assertThatThrownBy(() -> lire("collections:\n  - { code: A, nom: A, lune: 1 }\n"))
        .hasMessageContaining("lune");
    assertThatThrownBy(() -> lire("collections:\n  - { code: A, nom: A, types: [LUNE] }\n"))
        .hasMessageContaining("LUNE");
    assertThatThrownBy(() -> lire(REGIONS + "collections:\n  - { code: A, nom: A, region: X }\n"))
        .hasMessageContaining("X");
    assertThatThrownBy(() -> lire("collections:\n  - { code: A, nom: A }\n"))
        .hasMessageContaining("A");
    assertThatThrownBy(() -> lire("autre: 1\n")).isInstanceOf(IllegalArgumentException.class);
  }
}
