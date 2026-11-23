package fr.zonumental.competition.classement;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** defis-2 : classement hebdomadaire dérivé des captures (ADR 0024 §5 à §8). */
@SpringBootTest(properties = "zonumental.classement.seuil-ville=3")
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, ClassementApiTest.Horloge.class})
class ClassementApiTest {

  @TestConfiguration
  static class Horloge {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      // mercredi 2026-11-18 : semaine = [2026-11-15T23:00Z, 2026-11-22T23:00Z)
      return Clock.fixed(Instant.parse("2026-11-18T10:00:00Z"), ZoneId.of("Europe/Paris"));
    }
  }

  static final String SEMAINE = "2026-11-17T10:00:00Z";
  static final String PRECEDENTE = "2026-11-10T10:00:00Z";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  final List<UUID> comptes = new ArrayList<>();

  @BeforeEach
  void donnees() {
    nettoyer();
    jdbc.update("insert into catalogue.ville values ('99007', 'Classeville', 4)");
    jdbc.update("insert into catalogue.ville values ('99008', 'Voisineville', 4)");
    for (int n = 9601; n <= 9604; n++) {
      jdbc.update(
          "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
              + " latitude, longitude, rarete, popularite) values (?, ?, ?, 'TOUR', ?, 1, 1,"
              + " 'COMMUN', 1)",
          n,
          "Q" + n,
          "Tour " + n,
          n == 9604 ? "99008" : "99007");
    }
  }

  @AfterEach
  void nettoyer() {
    for (UUID u : comptes) {
      jdbc.update("delete from capture.capture where utilisateur_id = ?", u);
      jdbc.update("delete from compte.utilisateur where id = ?", u);
    }
    comptes.clear();
    jdbc.update("delete from capture.capture where numero_monument between 9601 and 9604");
    jdbc.update(
        "delete from competition.ville_ouverte where ville_code_insee in ('99007', '99008')");
    jdbc.update("delete from catalogue.monument where numero between 9601 and 9604");
    jdbc.update("delete from catalogue.ville where code_insee in ('99007', '99008')");
  }

  UUID compte(String pseudo, boolean consentant) {
    UUID id = UUID.randomUUID();
    comptes.add(id);
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " email_verifie_le, cree_le, derniere_activite_le) values (?, ?, ?, 'x',"
            + " '1990-01-01', now(), now(), now())",
        id,
        id + "@test.fr",
        "t_" + pseudo);
    if (consentant) {
      jdbc.update(
          "insert into compte.consentement (utilisateur_id, type, accorde, version_texte,"
              + " horodatage) values (?, 'CLASSEMENT', true, 'v1', '2026-01-01T00:00:00Z')",
          id);
    }
    return id;
  }

  void capture(UUID u, int numero, String le) {
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, capturee_le, distance_m,"
            + " photo_id) values (?, ?, ?::timestamptz, 1, ?)",
        u,
        numero,
        le,
        UUID.randomUUID());
  }

  /** Remplit la ville pour franchir le seuil (3) : 3 explorateurs classables. */
  void ouvrir() {
    for (int i = 0; i < 3; i++) {
      capture(compte("rempli" + i, true), 9601, "2026-06-01T10:00:00Z");
    }
  }

  ResultActions lire(UUID moi, String query) throws Exception {
    return mvc.perform(
        get("/api/classement?" + query).with(jwt().jwt(j -> j.subject(moi.toString()))));
  }

  @Test
  void sansJeton401() throws Exception {
    mvc.perform(get("/api/classement?portee=FRANCE")).andExpect(status().isUnauthorized());
  }

  @Test
  void amisEtParametresInvalides400() throws Exception {
    UUID moi = compte("moi", true);
    lire(moi, "portee=AMIS")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("validation"));
    lire(moi, "portee=VILLE").andExpect(status().isBadRequest());
    lire(moi, "portee=XYZ").andExpect(status().isBadRequest());
  }

  @Test
  void villeInconnue404() throws Exception {
    lire(compte("moi", true), "portee=VILLE&ville=99999")
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("introuvable"));
  }

  @Test
  void fermeePodiumEtAutourVides() throws Exception {
    UUID moi = compte("moi", true);
    capture(moi, 9601, SEMAINE);
    lire(moi, "portee=VILLE&ville=99007")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ouvert").value(false))
        .andExpect(jsonPath("$.podium.length()").value(0))
        .andExpect(jsonPath("$.autourDeMoi.length()").value(0));
  }

  @Test
  void rangScoreTendanceEtVoisinage() throws Exception {
    ouvrir(); // 3 comptes sans capture cette semaine
    UUID a = compte("a", true);
    UUID b = compte("b", true);
    UUID c = compte("c", true);
    UUID d = compte("d", true);
    UUID e = compte("e", true);
    UUID hors = compte("hors", false);
    // semaine : a=3 ; b=2 (plus tôt) ; c=2 ; d=1 ; e=1 (plus tard)
    capture(a, 9601, SEMAINE);
    capture(a, 9602, SEMAINE);
    capture(a, 9603, SEMAINE);
    capture(b, 9601, "2026-11-16T10:00:00Z");
    capture(b, 9602, "2026-11-16T11:00:00Z");
    capture(c, 9601, "2026-11-17T10:00:00Z");
    capture(c, 9602, "2026-11-17T11:00:00Z");
    capture(d, 9601, "2026-11-17T12:00:00Z");
    capture(e, 9601, "2026-11-17T13:00:00Z");
    capture(e, 9604, "2026-11-17T14:00:00Z"); // autre ville : hors portée VILLE
    capture(hors, 9601, SEMAINE); // sans consentement : jamais classé
    capture(c, 9603, "2026-11-23T10:00:00Z"); // semaine suivante : ignoré
    // précédente : e=2 (rang 1), d=1 (rang 2) ; b absent
    capture(e, 9602, PRECEDENTE);
    capture(e, 9603, PRECEDENTE);
    capture(d, 9602, PRECEDENTE);

    lire(d, "portee=VILLE&ville=99007")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.portee").value("VILLE"))
        .andExpect(jsonPath("$.ville.codeInsee").value("99007"))
        .andExpect(jsonPath("$.ville.nom").value("Classeville"))
        .andExpect(jsonPath("$.semaineDebutLe").value("2026-11-15T23:00:00Z"))
        .andExpect(jsonPath("$.ouvert").value(true))
        .andExpect(jsonPath("$.podium.length()").value(3))
        .andExpect(jsonPath("$.podium[0].pseudo").value("t_a"))
        .andExpect(jsonPath("$.podium[0].rang").value(1))
        .andExpect(jsonPath("$.podium[0].score").value(3))
        .andExpect(jsonPath("$.podium[0].moi").value(false))
        .andExpect(jsonPath("$.podium[1].pseudo").value("t_b"))
        .andExpect(jsonPath("$.podium[2].pseudo").value("t_c"))
        // d rang 4 (score 1 premier arrivé), précédent 2 -> tendance -2 ; e rang 5, précédent 1
        .andExpect(jsonPath("$.autourDeMoi.length()").value(2))
        .andExpect(jsonPath("$.autourDeMoi[0].pseudo").value("t_d"))
        .andExpect(jsonPath("$.autourDeMoi[0].rang").value(4))
        .andExpect(jsonPath("$.autourDeMoi[0].tendance").value(-2))
        .andExpect(jsonPath("$.autourDeMoi[0].moi").value(true))
        .andExpect(jsonPath("$.autourDeMoi[1].pseudo").value("t_e"))
        .andExpect(jsonPath("$.autourDeMoi[1].tendance").value(-4))
        .andExpect(jsonPath("$.podium[0].tendance").doesNotExist())
        .andExpect(jsonPath("$.podium[0].id").doesNotExist());
  }

  @Test
  void sansConsentementSaLigneSeule() throws Exception {
    ouvrir();
    UUID a = compte("a", true);
    capture(a, 9601, SEMAINE);
    UUID moi = compte("moi", false);
    capture(moi, 9601, SEMAINE);
    capture(moi, 9602, SEMAINE);
    lire(moi, "portee=VILLE&ville=99007")
        .andExpect(jsonPath("$.podium.length()").value(1))
        .andExpect(jsonPath("$.podium[0].pseudo").value("t_a"))
        .andExpect(jsonPath("$.autourDeMoi.length()").value(1))
        .andExpect(jsonPath("$.autourDeMoi[0].pseudo").value("t_moi"))
        .andExpect(jsonPath("$.autourDeMoi[0].rang").doesNotExist())
        .andExpect(jsonPath("$.autourDeMoi[0].tendance").doesNotExist())
        .andExpect(jsonPath("$.autourDeMoi[0].score").value(2))
        .andExpect(jsonPath("$.autourDeMoi[0].moi").value(true));
  }

  @Test
  void classableSansScoreAutourVide() throws Exception {
    ouvrir();
    capture(compte("a", true), 9601, SEMAINE);
    lire(compte("moi", true), "portee=VILLE&ville=99007")
        .andExpect(jsonPath("$.podium.length()").value(1))
        .andExpect(jsonPath("$.autourDeMoi.length()").value(0));
  }

  @Test
  void villeResteOuverteMemeSousLeSeuil() throws Exception {
    ouvrir();
    UUID moi = compte("moi", true);
    lire(moi, "portee=VILLE&ville=99007").andExpect(jsonPath("$.ouvert").value(true));
    jdbc.update(
        "delete from capture.capture where numero_monument = 9601 and capturee_le < '2026-07-01'");
    lire(moi, "portee=VILLE&ville=99007").andExpect(jsonPath("$.ouvert").value(true));
  }

  @Test
  void franceAgregueToutesLesVilles() throws Exception {
    ouvrir();
    UUID a = compte("a", true);
    capture(a, 9601, SEMAINE);
    capture(a, 9604, SEMAINE);
    lire(a, "portee=FRANCE")
        .andExpect(jsonPath("$.portee").value("FRANCE"))
        .andExpect(jsonPath("$.ville").doesNotExist())
        .andExpect(jsonPath("$.ouvert").value(true))
        .andExpect(jsonPath("$.podium[0].pseudo").value("t_a"))
        .andExpect(jsonPath("$.podium[0].score").value(2));
  }
}
