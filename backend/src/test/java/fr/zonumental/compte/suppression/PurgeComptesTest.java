package fr.zonumental.compte.suppression;

import static org.assertj.core.api.Assertions.assertThat;

import fr.zonumental.TestcontainersConfiguration;
import fr.zonumental.compte.CompteSupprime;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;

/** r0-socle-14 : purge définitive après le délai (RG-014, RG-005), idempotente. */
@SpringBootTest
@Import({TestcontainersConfiguration.class, PurgeComptesTest.Config.class})
class PurgeComptesTest {

  static final Instant MAINTENANT = Instant.parse("2026-10-20T10:00:00Z");

  /** Faux abonné de test : enregistre les événements et échoue pour les ids de {@code EN_PANNE}. */
  static class Abonne {
    final List<UUID> recus = new CopyOnWriteArrayList<>();
    final Set<UUID> enPanne = java.util.concurrent.ConcurrentHashMap.newKeySet();

    @EventListener
    void sur(CompteSupprime e) {
      recus.add(e.utilisateurId());
      if (enPanne.contains(e.utilisateurId())) {
        throw new IllegalStateException("panne simulée");
      }
    }
  }

  @TestConfiguration
  static class Config {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      return Clock.fixed(MAINTENANT, ZoneId.of("Europe/Paris"));
    }

    @Bean
    Abonne abonne() {
      return new Abonne();
    }
  }

  @Autowired JdbcTemplate jdbc;
  @Autowired PurgeComptes purge;
  @Autowired Abonne abonne;

  UUID du = UUID.randomUUID();
  UUID duAussi = UUID.randomUUID();
  UUID pasEncore = UUID.randomUUID();
  UUID actif = UUID.randomUUID();

  @BeforeEach
  void comptes() {
    abonne.recus.clear();
    abonne.enPanne.clear();
    jdbc.update("delete from compte.utilisateur");
    utilisateur(du, "dudu", 31);
    utilisateur(duAussi, "duaussi", 40);
    utilisateur(pasEncore, "pasencore", 29);
    utilisateur(actif, "actif", -1);
  }

  void utilisateur(UUID id, String pseudo, int joursDepuisDemande) {
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le, suppression_demandee_le) values (?, ?, ?, 'x',"
            + " '2000-01-01', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', ?)",
        id,
        pseudo + "@exemple.fr",
        pseudo,
        joursDepuisDemande < 0
            ? null
            : Timestamp.from(MAINTENANT.minusSeconds(joursDepuisDemande * 86400L)));
    jdbc.update(
        "insert into compte.consentement (utilisateur_id, type, accorde, version_texte,"
            + " horodatage) values (?, 'CGU', true, 'v1', '2026-01-01T00:00:00Z')",
        id);
    jdbc.update(
        "insert into compte.jeton (utilisateur_id, usage, empreinte, cree_le, expire_le)"
            + " values (?, 'VERIFICATION_EMAIL', ?, '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')",
        id,
        id.toString().getBytes());
    jdbc.update(
        "insert into compte.session (utilisateur_id, empreinte, cree_le, expire_le)"
            + " values (?, ?, '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z')",
        id,
        id.toString().getBytes());
  }

  List<String> pseudos() {
    return new ArrayList<>(
        jdbc.queryForList("select pseudo from compte.utilisateur order by pseudo", String.class));
  }

  int lignes(String table) {
    return jdbc.queryForObject("select count(*) from compte." + table, Integer.class);
  }

  @Test
  void efface_comptes_echus_et_donnees_liees_seulement() {
    purge.purger();

    assertThat(pseudos()).containsExactly("actif", "pasencore");
    assertThat(lignes("consentement")).isEqualTo(2);
    assertThat(lignes("jeton")).isEqualTo(2);
    assertThat(lignes("session")).isEqualTo(2);
    assertThat(abonne.recus).containsExactlyInAnyOrder(du, duAussi);
  }

  @Test
  void pseudoEtEmailRedeviennentDisponibles() {
    purge.purger();
    utilisateur(UUID.randomUUID(), "dudu", 0);
    assertThat(pseudos()).contains("dudu");
  }

  @Test
  void echecPartielRejouableSansPerteNiDoublon() {
    abonne.enPanne.add(du);

    purge.purger();

    // Le compte en panne est intact (transaction annulée), l'autre est purgé.
    assertThat(pseudos()).containsExactly("actif", "dudu", "pasencore");
    assertThat(lignes("consentement")).isEqualTo(3);
    assertThat(lignes("session")).isEqualTo(3);

    abonne.enPanne.clear();
    abonne.recus.clear();
    purge.purger();
    purge.purger();

    assertThat(pseudos()).containsExactly("actif", "pasencore");
    assertThat(abonne.recus).containsExactly(du);
  }
}
