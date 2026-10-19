package fr.zonumental.catalogue;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class QuotasTest {

  private static Quotas lire(String yaml) {
    return Quotas.charger(new ByteArrayInputStream(yaml.getBytes(StandardCharsets.UTF_8)));
  }

  @Test
  void fichier_livre_contient_les_10_villes_et_paris_25() throws IOException {
    try (InputStream in = new ClassPathResource("catalogue-quotas.yml").getInputStream()) {
      Quotas q = Quotas.charger(in);
      assertThat(q.villes()).hasSize(10);
      assertThat(q.villes().getFirst().nom()).isEqualTo("Paris");
      assertThat(q.villes().getFirst().quota()).isEqualTo(25);
      assertThat(q.villes().stream().skip(1)).allMatch(v -> v.quota() == 10);
    }
  }

  @Test
  void lit_villes_et_rayons() {
    Quotas q =
        lire("villes:\n  - { nom: Lyon, insee: \"69123\", quota: 10 }\nrayons:\n  Q243: 300\n");
    assertThat(q.villes()).containsExactly(new Quotas.Ville("Lyon", "69123", 10));
    assertThat(q.rayons()).containsEntry("Q243", 300);
  }

  @Test
  void rejette_quota_negatif() {
    assertThatThrownBy(() -> lire("villes:\n  - { nom: A, insee: \"1\", quota: -1 }\n"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejette_rayon_hors_bornes() {
    String v = "villes:\n  - { nom: A, insee: \"1\", quota: 1 }\n";
    assertThatThrownBy(() -> lire(v + "rayons:\n  Q1: 49\n"))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> lire(v + "rayons:\n  Q1: 501\n"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejette_insee_en_double() {
    assertThatThrownBy(
            () ->
                lire(
                    "villes:\n  - { nom: A, insee: \"1\", quota: 1 }\n"
                        + "  - { nom: B, insee: \"1\", quota: 1 }\n"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejette_fichier_vide() {
    assertThatThrownBy(() -> lire("")).isInstanceOf(IllegalArgumentException.class);
  }
}
