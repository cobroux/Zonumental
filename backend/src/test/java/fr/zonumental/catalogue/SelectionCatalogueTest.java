package fr.zonumental.catalogue;

import static org.assertj.core.api.Assertions.assertThat;

import fr.zonumental.catalogue.SelectionCatalogue.Existant;
import fr.zonumental.catalogue.SelectionCatalogue.Numerote;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class SelectionCatalogueTest {

  static Candidat c(String id, String nom, long popularite) {
    return new Candidat(
        id,
        "PA" + id,
        nom,
        TypeMonument.AUTRE,
        "69123",
        45.0,
        4.0,
        popularite,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null);
  }

  @Test
  void garde_au_plus_le_quota_les_plus_populaires() {
    var candidats = List.of(c("Q1", "A", 10), c("Q2", "B", 30), c("Q3", "C", 20));
    var choisis = SelectionCatalogue.choisir(2, 0, Set.of(), candidats);
    assertThat(choisis).extracting(Candidat::wikidataId).containsExactly("Q2", "Q3");
  }

  @Test
  void egalite_departagee_par_ordre_alphabetique_puis_identifiant() {
    var candidats = List.of(c("Q9", "Zèbre", 5), c("Q8", "Abbaye", 5), c("Q7", "Abbaye", 5));
    var choisis = SelectionCatalogue.choisir(2, 0, Set.of(), candidats);
    assertThat(choisis).extracting(Candidat::wikidataId).containsExactly("Q7", "Q8");
  }

  @Test
  void ville_sous_dotee_importe_ceux_qui_existent() {
    var choisis = SelectionCatalogue.choisir(10, 0, Set.of(), List.of(c("Q1", "A", 1)));
    assertThat(choisis).hasSize(1);
  }

  @Test
  void quota_passe_de_10_a_12_ajoute_au_plus_deux() {
    var candidats = IntStream.range(0, 20).mapToObj(i -> c("Q" + i, "M" + i, 100 - i)).toList();
    Set<String> deja = Set.of("Q0", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9");
    var choisis = SelectionCatalogue.choisir(12, 10, deja, candidats);
    assertThat(choisis).extracting(Candidat::wikidataId).containsExactly("Q10", "Q11");
  }

  @Test
  void quota_diminue_n_ajoute_rien() {
    var choisis = SelectionCatalogue.choisir(5, 10, Set.of(), List.of(c("Q1", "A", 1)));
    assertThat(choisis).isEmpty();
  }

  @Test
  void numeros_a_partir_du_max_et_rarete_120_monuments_6_24_90() {
    var nouveaux =
        IntStream.rangeClosed(1, 120).mapToObj(i -> c("Q" + i, "M" + i, 1000 - i)).toList();
    List<Numerote> res = SelectionCatalogue.attribuer(0, List.of(), nouveaux);
    assertThat(res.getFirst().numero()).isEqualTo(1);
    assertThat(res.getLast().numero()).isEqualTo(120);
    assertThat(res.stream().filter(n -> n.rarete() == Rarete.LEGENDAIRE)).hasSize(6);
    assertThat(res.stream().filter(n -> n.rarete() == Rarete.RARE)).hasSize(24);
    assertThat(res.stream().filter(n -> n.rarete() == Rarete.COMMUN)).hasSize(90);
  }

  @Test
  void rarete_arrondie_au_plus_proche_118_monuments_6_24_88() {
    var nouveaux =
        IntStream.rangeClosed(1, 118).mapToObj(i -> c("Q" + i, "M" + i, 1000 - i)).toList();
    var res = SelectionCatalogue.attribuer(0, List.of(), nouveaux);
    assertThat(res.stream().filter(n -> n.rarete() == Rarete.LEGENDAIRE)).hasSize(6); // 5,9
    assertThat(res.stream().filter(n -> n.rarete() == Rarete.RARE)).hasSize(24); // 23,6
    assertThat(res.stream().filter(n -> n.rarete() == Rarete.COMMUN)).hasSize(88);
  }

  @Test
  void numeros_suivent_le_max_meme_avec_des_trous() {
    var res =
        SelectionCatalogue.attribuer(118, List.of(), List.of(c("Q1", "A", 1), c("Q2", "B", 0)));
    assertThat(res).extracting(Numerote::numero).containsExactly(119, 120);
  }

  @Test
  void rang_calcule_sur_tout_le_catalogue_mais_seuls_les_nouveaux_sont_retournes() {
    var existants =
        IntStream.rangeClosed(1, 19)
            .mapToObj(i -> new Existant("E" + i, "E" + i, 500 + i))
            .toList();
    var res = SelectionCatalogue.attribuer(19, existants, List.of(c("Q1", "Top", 10_000)));
    assertThat(res).hasSize(1);
    assertThat(res.getFirst().rarete()).isEqualTo(Rarete.LEGENDAIRE);
    var res2 = SelectionCatalogue.attribuer(19, existants, List.of(c("Q2", "Bas", 1)));
    assertThat(res2.getFirst().rarete()).isEqualTo(Rarete.COMMUN);
  }
}
