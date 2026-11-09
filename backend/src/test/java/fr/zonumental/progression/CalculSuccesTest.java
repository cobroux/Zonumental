package fr.zonumental.progression;

import static org.assertj.core.api.Assertions.assertThat;

import fr.zonumental.TestcontainersConfiguration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/** r2-collectionner-2 : calcul sur l'ensemble des captures (RG-R2-01, RG-R2-03). */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class CalculSuccesTest {

  @Autowired CalculSucces calcul;
  @Autowired JdbcTemplate jdbc;

  UUID u = UUID.randomUUID();

  @BeforeEach
  void donnees() {
    jdbc.update("delete from capture.capture");
    jdbc.update("delete from catalogue.monument where numero between 9101 and 9103");
    jdbc.update("delete from catalogue.ville where code_insee = '99002'");
    jdbc.update("insert into catalogue.ville values ('99002', 'Calcul', 3)");
    monument(9101, "COMMUN");
    monument(9102, "LEGENDAIRE");
  }

  void monument(int n, String rarete) {
    jdbc.update(
        "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
            + " latitude, longitude, rarete, popularite) values (?, ?, 'M', 'TOUR', '99002', 1, 1,"
            + " ?, 1)",
        n,
        "Q" + n,
        rarete);
  }

  void capturer(int n) {
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id)"
            + " values (?, ?, 1, ?)",
        u,
        n,
        UUID.randomUUID());
  }

  List<String> codes(List<CalculSucces.Gagne> g) {
    return g.stream().map(CalculSucces.Gagne::code).toList();
  }

  @Test
  void une_capture_franchissant_plusieurs_seuils_les_debloque_tous() {
    capturer(9102);
    var gagnes = calcul.calculer(u);
    assertThat(codes(gagnes)).containsExactlyInAnyOrder("PREMIER_TAMPON", "LEGENDE");
    assertThat(gagnes).allSatisfy(g -> assertThat(g.libelle()).isNotBlank());
  }

  @Test
  void rejeu_ne_cree_pas_de_doublon_ni_ne_renvoie_deux_fois() {
    capturer(9101);
    assertThat(codes(calcul.calculer(u))).containsExactly("PREMIER_TAMPON");
    assertThat(calcul.calculer(u)).isEmpty();
    assertThat(
            jdbc.queryForObject(
                "select count(*) from progression.succes_obtenu where utilisateur_id = ?",
                Integer.class,
                u))
        .isEqualTo(1);
  }

  @Test
  void sous_le_seuil_rien() {
    assertThat(calcul.calculer(u)).isEmpty();
  }
}
