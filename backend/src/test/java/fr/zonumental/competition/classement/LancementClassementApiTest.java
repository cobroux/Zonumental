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

/** fidelite-23 / classement-back-1 : compteur de lancement de la ville, dérivé des captures. */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, LancementClassementApiTest.Horloge.class})
class LancementClassementApiTest {

  @TestConfiguration
  static class Horloge {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      // mercredi 2026-11-18 : la semaine commence le lundi 16 à 00:00 Paris (= 15 à 23:00Z)
      return Clock.fixed(Instant.parse("2026-11-18T10:00:00Z"), ZoneId.of("Europe/Paris"));
    }
  }

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  final List<UUID> comptes = new ArrayList<>();
  UUID moi;

  @BeforeEach
  void donnees() {
    nettoyer();
    jdbc.update("insert into catalogue.ville values ('99005', 'Lanceville', 4)");
    jdbc.update("insert into catalogue.ville values ('99006', 'Autreville', 4)");
    for (int n = 9501; n <= 9503; n++) {
      jdbc.update(
          "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
              + " latitude, longitude, rarete, popularite) values (?, ?, ?, 'TOUR', ?, 1, 1,"
              + " 'COMMUN', 1)",
          n,
          "Q" + n,
          "Tour " + n,
          n == 9503 ? "99006" : "99005");
    }
    moi = compte(false, true, false);
  }

  @AfterEach
  void nettoyer() {
    for (UUID u : comptes) {
      jdbc.update("delete from capture.capture where utilisateur_id = ?", u);
      jdbc.update("delete from compte.utilisateur where id = ?", u);
    }
    comptes.clear();
    jdbc.update("delete from capture.capture where numero_monument between 9501 and 9503");
    jdbc.update("delete from catalogue.monument where numero between 9501 and 9503");
    jdbc.update("delete from catalogue.ville where code_insee in ('99005', '99006')");
  }

  UUID compte(boolean consentant, boolean verifie, boolean suppression) {
    UUID id = UUID.randomUUID();
    comptes.add(id);
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " email_verifie_le, cree_le, derniere_activite_le, suppression_demandee_le)"
            + " values (?, ?, ?, 'x', '1990-01-01', ?::timestamptz, now(), now(), ?::timestamptz)",
        id,
        id + "@test.fr",
        "u" + id.toString().substring(0, 8),
        verifie ? "2026-01-01T00:00:00Z" : null,
        suppression ? "2026-11-01T00:00:00Z" : null);
    if (consentant) {
      consentement(id, true, "2026-01-01T00:00:00Z");
    }
    return id;
  }

  void consentement(UUID id, boolean accorde, String le) {
    jdbc.update(
        "insert into compte.consentement (utilisateur_id, type, accorde, version_texte,"
            + " horodatage) values (?, 'CLASSEMENT', ?, 'v1', ?::timestamptz)",
        id,
        accorde,
        le);
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

  ResultActions lire(String insee) throws Exception {
    return mvc.perform(
        get("/api/classement/villes/" + insee + "/lancement")
            .with(jwt().jwt(j -> j.subject(moi.toString()))));
  }

  @Test
  void sansJeton401() throws Exception {
    mvc.perform(get("/api/classement/villes/99005/lancement")).andExpect(status().isUnauthorized());
  }

  @Test
  void villeInconnue404() throws Exception {
    lire("99999")
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("introuvable"));
  }

  @Test
  void compteSeulementLesExplorateursClassables() throws Exception {
    UUID ok = compte(true, true, false);
    capture(ok, 9501, "2026-06-01T10:00:00Z"); // toutes périodes
    capture(ok, 9502, "2026-06-02T10:00:00Z"); // une seule fois malgré 2 captures
    UUID ok2 = compte(true, true, false);
    capture(ok2, 9502, "2026-11-17T10:00:00Z");
    UUID sansConsentement = compte(false, true, false);
    capture(sansConsentement, 9501, "2026-11-17T10:00:00Z");
    UUID retire = compte(true, true, false);
    consentement(retire, false, "2026-02-01T00:00:00Z"); // dernier consentement : refusé
    capture(retire, 9501, "2026-11-17T10:00:00Z");
    UUID reaccorde = compte(true, true, false);
    consentement(reaccorde, false, "2026-02-01T00:00:00Z");
    consentement(reaccorde, true, "2026-03-01T00:00:00Z"); // dernier : accordé
    capture(reaccorde, 9501, "2026-11-17T10:00:00Z");
    UUID nonVerifie = compte(true, false, false);
    capture(nonVerifie, 9501, "2026-11-17T10:00:00Z");
    UUID supprime = compte(true, true, true);
    capture(supprime, 9501, "2026-11-17T10:00:00Z");
    UUID autreVille = compte(true, true, false);
    capture(autreVille, 9503, "2026-11-17T10:00:00Z");
    lire("99005")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ville.codeInsee").value("99005"))
        .andExpect(jsonPath("$.ville.nom").value("Lanceville"))
        .andExpect(jsonPath("$.seuil").value(50))
        .andExpect(jsonPath("$.explorateurs").value(3))
        .andExpect(jsonPath("$.ouvert").value(false))
        .andExpect(jsonPath("$.consentementClassement").value(false))
        .andExpect(jsonPath("$.moi.tampons").value(0));
  }

  @Test
  void ouvertAuSeuilEtCompteurPlafonne() throws Exception {
    for (int i = 0; i < 51; i++) {
      capture(compte(true, true, false), 9501, "2026-11-17T10:00:00Z");
    }
    lire("99005")
        .andExpect(jsonPath("$.explorateurs").value(50))
        .andExpect(jsonPath("$.ouvert").value(true));
  }

  @Test
  void moiConsentementEtTamponsDeLaSemaineToutesVilles() throws Exception {
    consentement(moi, true, "2026-01-01T00:00:00Z");
    capture(moi, 9501, "2026-11-15T22:59:00Z"); // avant lundi 00:00 Paris : exclu
    capture(moi, 9502, "2026-11-15T23:00:00Z"); // = début de semaine : inclus
    capture(moi, 9503, "2026-11-17T10:00:00Z"); // autre ville : inclus
    lire("99005")
        .andExpect(jsonPath("$.consentementClassement").value(true))
        .andExpect(jsonPath("$.moi.tampons").value(2))
        .andExpect(jsonPath("$.explorateurs").value(1))
        .andExpect(jsonPath("$.length()").value(6));
  }
}
