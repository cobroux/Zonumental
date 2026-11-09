package fr.zonumental.progression;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import fr.zonumental.TestcontainersConfiguration;
import fr.zonumental.compte.CompteSupprime;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/** r2-collectionner-1 : enregistrement unique des succès et effacement RGPD. */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SuccesObtenusTest {

  @Autowired SuccesObtenus obtenus;
  @Autowired JdbcTemplate jdbc;
  @Autowired ApplicationEventPublisher evenements;
  @Autowired TransactionTemplate tx;
  @Autowired CatalogueSucces catalogue;

  @Test
  void catalogue_charge_au_demarrage() {
    assertThat(catalogue.succes()).isNotEmpty();
  }

  @Test
  void enregistre_une_seule_fois_par_utilisateur_et_code() {
    UUID u = UUID.randomUUID();
    assertThat(obtenus.enregistrer(u, "PREMIER_TAMPON")).isTrue();
    assertThat(obtenus.enregistrer(u, "PREMIER_TAMPON")).isFalse();
    assertThat(obtenus.enregistrer(u, "LEGENDE")).isTrue();
    assertThat(obtenus.enregistrer(UUID.randomUUID(), "PREMIER_TAMPON")).isTrue();
    assertThat(compter(u)).isEqualTo(2);
  }

  @Test
  void compteSupprime_efface_ses_succes_seulement() {
    UUID parti = UUID.randomUUID();
    UUID reste = UUID.randomUUID();
    obtenus.enregistrer(parti, "PREMIER_TAMPON");
    obtenus.enregistrer(reste, "PREMIER_TAMPON");

    tx.executeWithoutResult(s -> evenements.publishEvent(new CompteSupprime(parti)));

    await().atMost(Duration.ofSeconds(20)).until(() -> compter(parti) == 0);
    assertThat(compter(reste)).isEqualTo(1);
  }

  private int compter(UUID u) {
    return jdbc.queryForObject(
        "select count(*) from progression.succes_obtenu where utilisateur_id = ?",
        Integer.class,
        u);
  }
}
