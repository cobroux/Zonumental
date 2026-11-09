package fr.zonumental.progression;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/** r2-collectionner-1 : chargement et validation de succes.yml (CDC §5, RG-R2-01). */
class CatalogueSuccesTest {

  private static CatalogueSucces lire(String yaml) {
    return CatalogueSucces.charger(new ByteArrayInputStream(yaml.getBytes(StandardCharsets.UTF_8)));
  }

  @Test
  void fichier_livre_est_valide() throws IOException {
    try (InputStream in = new ClassPathResource("succes.yml").getInputStream()) {
      CatalogueSucces c = CatalogueSucces.charger(in);
      assertThat(c.succes()).isNotEmpty();
      assertThat(c.succes().getFirst().code()).isEqualTo("PREMIER_TAMPON");
    }
  }

  @Test
  void succes_valide_est_charge() {
    var c = lire("succes:\n  - { code: A, critere: CAPTURES, seuil: 1 }\n");
    assertThat(c.succes()).containsExactly(new CatalogueSucces.Succes("A", "CAPTURES", null, 1));
  }

  @Test
  void code_duplique_echoue() {
    assertThatThrownBy(
            () ->
                lire(
                    "succes:\n  - { code: A, critere: CAPTURES, seuil: 1 }\n"
                        + "  - { code: A, critere: VILLES, seuil: 2 }\n"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("A");
  }

  @Test
  void critere_inconnu_echoue() {
    assertThatThrownBy(() -> lire("succes:\n  - { code: A, critere: LUNE, seuil: 1 }\n"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("LUNE");
  }

  @Test
  void seuil_invalide_ou_liste_absente_echoue() {
    assertThatThrownBy(() -> lire("succes:\n  - { code: A, critere: CAPTURES, seuil: 0 }\n"))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> lire("autre: 1\n")).isInstanceOf(IllegalArgumentException.class);
  }
}
