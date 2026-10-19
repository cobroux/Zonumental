package fr.zonumental.catalogue;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fr.zonumental.TestcontainersConfiguration;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.PlatformTransactionManager;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ImportCatalogueTest {

  static final String LYON = "69123";

  @Autowired JdbcClient jdbc;
  @Autowired PlatformTransactionManager tm;
  @TempDir Path dossier;

  Map<String, List<Candidat>> donnees = new java.util.HashMap<>();
  SourceMonuments source =
      new SourceMonuments() {
        @Override
        public List<Candidat> candidats(Quotas.Ville v) {
          return donnees.getOrDefault(v.insee(), List.of());
        }

        @Override
        public byte[] telechargerImage(Candidat c) {
          return new byte[] {1, 2, 3};
        }
      };

  @BeforeEach
  void vider() {
    jdbc.sql("delete from catalogue.monument").update();
    jdbc.sql("delete from catalogue.ville").update();
  }

  static Candidat c(String id, String nom, long popularite, boolean image) {
    return new Candidat(
        id,
        "PA" + id,
        nom,
        TypeMonument.TOUR,
        LYON,
        45.76,
        4.83,
        popularite,
        1900,
        null,
        null,
        "Histoire " + nom,
        "https://fr.wikipedia.org/wiki/" + nom,
        "CC BY-SA 4.0",
        image ? nom + ".jpg" : null,
        image ? "https://commons.wikimedia.org/wiki/File:" + nom + ".jpg" : null,
        image ? "CC0" : null,
        null,
        null);
  }

  ImportCatalogue importeur(int quotaLyon, Map<String, Integer> rayons) {
    Quotas q = new Quotas(List.of(new Quotas.Ville("Lyon", LYON, quotaLyon)), rayons);
    return new ImportCatalogue(jdbc, tm, source, q, dossier.resolve("images"));
  }

  Proposition relire(ImportCatalogue imp) throws IOException {
    Path fichier = dossier.resolve("relecture.json");
    imp.preparer(fichier);
    assertThat(Files.readString(fichier)).contains("\n"); // JSON lisible
    return imp.lire(fichier);
  }

  long compte() {
    return jdbc.sql("select count(*) from catalogue.monument").query(Long.class).single();
  }

  @Test
  void relecture_n_ecrit_rien_en_base_et_propose_numeros_et_rarete() throws IOException {
    donnees.put(
        LYON, List.of(c("Q1", "A", 10, true), c("Q2", "B", 30, false), c("Q3", "C", 20, false)));
    Proposition p = relire(importeur(2, Map.of()));

    assertThat(compte()).isZero();
    assertThat(p.nouveaux()).hasSize(2);
    assertThat(p.nouveaux().getFirst().candidat().wikidataId()).isEqualTo("Q2");
    assertThat(p.nouveaux().getFirst().numeroPropose()).isEqualTo(1);
  }

  @Test
  void figer_ecrit_monuments_numeros_rayon_defaut_et_image_locale() throws IOException {
    donnees.put(LYON, List.of(c("Q1", "A", 10, true), c("Q2", "B", 30, false)));
    ImportCatalogue imp = importeur(10, Map.of());
    imp.figer(relire(imp));

    assertThat(compte()).isEqualTo(2);
    Map<String, Object> b =
        jdbc.sql("select * from catalogue.monument where wikidata_id = 'Q2'").query().singleRow();
    assertThat(b.get("numero")).isEqualTo(1);
    assertThat(b.get("rayon_capture_m")).isEqualTo(150);
    assertThat(b.get("rarete")).isEqualTo("COMMUN");
    Map<String, Object> a =
        jdbc.sql("select * from catalogue.monument where wikidata_id = 'Q1'").query().singleRow();
    assertThat(a.get("numero")).isEqualTo(2);
    assertThat(a.get("image_url")).isEqualTo("/api/catalogue/images/2.jpg");
    assertThat(Files.readAllBytes(dossier.resolve("images/2.jpg"))).containsExactly(1, 2, 3);
    assertThat(b.get("image_url")).isNull();
    assertThat(
            jdbc.sql("select quota from catalogue.ville where code_insee = ?")
                .param(LYON)
                .query(Integer.class)
                .single())
        .isEqualTo(10);
  }

  @Test
  void relance_sans_changement_ni_doublon_numeros_et_rayon_ajuste_conserves() throws IOException {
    List<Candidat> tous = new ArrayList<>();
    tous.add(c("Q1", "A", 1, false));
    for (int i = 2; i <= 20; i++) {
      tous.add(c("Q" + i, "M" + i, 1000 + i, false));
    }
    donnees.put(LYON, tous);
    ImportCatalogue imp = importeur(30, Map.of());
    imp.figer(relire(imp));
    jdbc.sql("update catalogue.monument set rayon_capture_m = 300 where wikidata_id = 'Q1'")
        .update();
    tous.set(0, c("Q1", "A", 99_999, false));

    Proposition p = relire(imp);
    assertThat(p.nouveaux()).isEmpty();
    imp.figer(p);

    assertThat(compte()).isEqualTo(20);
    var q1 =
        jdbc.sql(
                "select numero, rayon_capture_m, rarete, popularite from catalogue.monument"
                    + " where wikidata_id = 'Q1'")
            .query()
            .singleRow();
    assertThat(q1.get("numero")).isEqualTo(20);
    assertThat(q1.get("rayon_capture_m")).isEqualTo(300);
    assertThat(q1.get("rarete")).isEqualTo("COMMUN"); // inchangée malgré la popularité
    assertThat(q1.get("popularite")).isEqualTo(99_999L); // rafraîchie
  }

  @Test
  void rayon_surcharge_dans_le_yml_s_applique() throws IOException {
    donnees.put(LYON, List.of(c("Q1", "A", 10, false)));
    ImportCatalogue imp = importeur(10, Map.of("Q1", 400));
    imp.figer(relire(imp));
    assertThat(
            jdbc.sql("select rayon_capture_m from catalogue.monument")
                .query(Integer.class)
                .single())
        .isEqualTo(400);
  }

  @Test
  void quota_augmente_ajoute_les_nouveaux_avec_numeros_suivants() throws IOException {
    List<Candidat> tous = new ArrayList<>();
    for (int i = 1; i <= 15; i++) {
      tous.add(c("Q" + i, "M" + i, 1000 - i, false));
    }
    donnees.put(LYON, tous);
    importeur(10, Map.of()).figer(relire(importeur(10, Map.of())));
    ImportCatalogue plus = importeur(12, Map.of());
    plus.figer(relire(plus));

    assertThat(compte()).isEqualTo(12);
    assertThat(jdbc.sql("select max(numero) from catalogue.monument").query(Integer.class).single())
        .isEqualTo(12);
  }

  @Test
  void monument_disparu_des_sources_est_conserve_et_signale() throws IOException {
    donnees.put(LYON, List.of(c("Q1", "A", 10, false), c("Q2", "B", 30, false)));
    ImportCatalogue imp = importeur(10, Map.of());
    imp.figer(relire(imp));
    donnees.put(LYON, List.of(c("Q2", "B", 30, false)));

    Proposition p = relire(imp);
    assertThat(p.absentsDesSources()).containsExactly("Q1");
    imp.figer(p);
    assertThat(compte()).isEqualTo(2);
  }

  @Test
  void figer_refuse_un_fichier_qui_depasse_le_quota_et_n_ecrit_rien() throws IOException {
    donnees.put(LYON, List.of(c("Q1", "A", 10, false), c("Q2", "B", 30, false)));
    ImportCatalogue imp = importeur(1, Map.of());
    Proposition p = relire(imp); // 1 nouveau
    ImportCatalogue large = importeur(10, Map.of());
    Proposition trop = relire(large); // 2 nouveaux
    assertThatThrownBy(() -> imp.figer(trop)).isInstanceOf(IllegalArgumentException.class);
    assertThat(compte()).isZero();
    assertThat(p.nouveaux()).hasSize(1);
  }

  @Test
  void figer_refuse_une_ville_inconnue_du_yml() throws IOException {
    donnees.put(LYON, List.of(c("Q1", "A", 10, false)));
    Proposition p = relire(importeur(10, Map.of()));
    ImportCatalogue autre =
        new ImportCatalogue(
            jdbc,
            tm,
            source,
            new Quotas(List.of(new Quotas.Ville("Paris", "75056", 25)), Map.of()),
            dossier);
    assertThatThrownBy(() -> autre.figer(p)).isInstanceOf(IllegalArgumentException.class);
  }
}
