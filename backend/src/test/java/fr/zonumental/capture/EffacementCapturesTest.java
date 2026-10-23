package fr.zonumental.capture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import fr.zonumental.TestcontainersConfiguration;
import fr.zonumental.compte.CompteSupprime;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/** r1-capturer-1 : effacement des captures et photos à la suppression du compte (RG-014). */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class EffacementCapturesTest {

  @Autowired JdbcTemplate jdbc;
  @Autowired StockagePhotos stockage;
  @Autowired Photos photos;
  @Autowired ApplicationEventPublisher evenements;
  @Autowired TransactionTemplate tx;

  UUID parti = UUID.randomUUID();
  UUID reste = UUID.randomUUID();
  UUID photoPartie1 = UUID.randomUUID();
  UUID photoPartie2 = UUID.randomUUID();
  UUID photoRestee = UUID.randomUUID();
  UUID orpheline = UUID.randomUUID();

  @BeforeEach
  void captures() {
    jdbc.update("delete from capture.capture");
    byte[] jpeg = photos.reencoder(ImagesDeTest.encoder(ImagesDeTest.image(50, 50), "png"));
    capture(parti, 1, photoPartie1, jpeg);
    capture(parti, 2, photoPartie2, jpeg);
    capture(reste, 1, photoRestee, jpeg);
    stockage.deposer(parti, orpheline, jpeg); // objet sans ligne : crash entre PUT et INSERT
  }

  private void capture(UUID u, int numero, UUID photo, byte[] jpeg) {
    stockage.deposer(u, photo, jpeg);
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id)"
            + " values (?, ?, 10, ?)",
        u,
        numero,
        photo);
  }

  @Test
  void compteSupprime_efface_lignes_et_prefixe_s3_sans_toucher_aux_autres() {
    tx.executeWithoutResult(s -> evenements.publishEvent(new CompteSupprime(parti)));

    await()
        .atMost(Duration.ofSeconds(20))
        .untilAsserted(
            () -> {
              assertThat(compter(parti)).isZero();
              assertThat(stockage.lire(parti, photoPartie1)).isEmpty();
              assertThat(stockage.lire(parti, photoPartie2)).isEmpty();
              assertThat(stockage.lire(parti, orpheline)).isEmpty();
            });
    assertThat(compter(reste)).isEqualTo(1);
    assertThat(stockage.lire(reste, photoRestee)).isPresent();
  }

  @Test
  void rejouer_l_evenement_est_sans_effet() {
    tx.executeWithoutResult(s -> evenements.publishEvent(new CompteSupprime(parti)));
    await().atMost(Duration.ofSeconds(20)).until(() -> compter(parti) == 0);

    tx.executeWithoutResult(s -> evenements.publishEvent(new CompteSupprime(parti)));
    await()
        .atMost(Duration.ofSeconds(20))
        .until(
            () ->
                jdbc.queryForObject("select count(*) from event_publication", Integer.class) == 0);
    assertThat(compter(reste)).isEqualTo(1);
  }

  private int compter(UUID u) {
    return jdbc.queryForObject(
        "select count(*) from capture.capture where utilisateur_id = ?", Integer.class, u);
  }
}
