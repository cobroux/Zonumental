package fr.zonumental.competition.defi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** fidelite-22 / defis-back-1 : défi courant, progression dérivée des captures. */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, DefiApiTest.Horloge.class})
@TestPropertySource(properties = "zonumental.competition.defis=classpath:defis-test.yml")
class DefiApiTest {

  static final AtomicReference<Instant> MAINTENANT = new AtomicReference<>();

  @TestConfiguration
  static class Horloge {
    @Bean
    @Primary
    Clock horlogeDeTest() {
      return new Clock() {
        @Override
        public ZoneId getZone() {
          return ZoneId.of("Europe/Paris");
        }

        @Override
        public Clock withZone(ZoneId z) {
          return this;
        }

        @Override
        public Instant instant() {
          return MAINTENANT.get();
        }
      };
    }
  }

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired ControleDefis controle;

  UUID moi = UUID.randomUUID();
  UUID autre = UUID.randomUUID();

  @BeforeEach
  void donnees() {
    nettoyer();
    jdbc.update("insert into catalogue.ville values ('99004', 'Defiville', 4)");
    for (int n = 9401; n <= 9405; n++) {
      jdbc.update(
          "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
              + " latitude, longitude, rarete, popularite) values (?, ?, ?, 'TOUR', '99004', 1, 1,"
              + " 'COMMUN', 1)",
          n,
          "Q" + n,
          "Tour " + n);
    }
    MAINTENANT.set(Instant.parse("2026-11-18T10:00:00Z"));
  }

  @AfterEach
  void nettoyer() {
    jdbc.update("delete from capture.capture where numero_monument between 9401 and 9405");
    jdbc.update("delete from catalogue.monument where numero between 9401 and 9405");
    jdbc.update("delete from catalogue.ville where code_insee = '99004'");
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

  ResultActions lire(UUID u) throws Exception {
    return mvc.perform(get("/api/defis/courant").with(jwt().jwt(j -> j.subject(u.toString()))));
  }

  @Test
  void sansJeton401() throws Exception {
    mvc.perform(get("/api/defis/courant")).andExpect(status().isUnauthorized());
  }

  @Test
  void aucunDefiEn200AvecDefiNull() throws Exception {
    MAINTENANT.set(Instant.parse("2027-01-01T10:00:00Z"));
    lire(moi)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.defi").hasJsonPath())
        .andExpect(jsonPath("$.defi").value((Object) null));
  }

  @Test
  void monumentsPastillesDansLOrdreDeLaConfigEtSeulementMesCaptures() throws Exception {
    capture(moi, 9401, "2026-06-01T10:00:00Z"); // avant la semaine : compte (RG-034)
    capture(moi, 9403, "2026-11-17T10:00:00Z");
    capture(moi, 9402, "2026-11-22T23:00:00Z"); // = finLe : exclu
    capture(autre, 9402, "2026-11-17T10:00:00Z");
    lire(moi)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.defi.code").value("DOMES"))
        .andExpect(jsonPath("$.defi.nom").value("Dômes"))
        .andExpect(jsonPath("$.defi.description").value("Trois tours."))
        .andExpect(jsonPath("$.defi.saison").value("Saison test"))
        .andExpect(jsonPath("$.defi.semaine").value(7))
        .andExpect(jsonPath("$.defi.debutLe").value("2026-11-15T23:00:00Z"))
        .andExpect(jsonPath("$.defi.finLe").value("2026-11-22T23:00:00Z"))
        .andExpect(jsonPath("$.defi.seuil").value(3))
        .andExpect(jsonPath("$.defi.valeur").value(2))
        .andExpect(jsonPath("$.defi.reussi").value(false))
        .andExpect(jsonPath("$.defi.recompense.code").value("DEFI_DOMES"))
        .andExpect(jsonPath("$.defi.recompense.libelle").value("Tampon doré"))
        .andExpect(jsonPath("$.defi.pastilles.length()").value(3))
        .andExpect(jsonPath("$.defi.pastilles[0].libelle").value("Tour 9403"))
        .andExpect(jsonPath("$.defi.pastilles[0].faite").value(true))
        .andExpect(jsonPath("$.defi.pastilles[1].libelle").value("Tour 9401"))
        .andExpect(jsonPath("$.defi.pastilles[1].faite").value(true))
        .andExpect(jsonPath("$.defi.pastilles[2].libelle").value("Tour 9402"))
        .andExpect(jsonPath("$.defi.pastilles[2].faite").value(false));
  }

  @Test
  void monumentsReussiQuandToutEstCapture() throws Exception {
    capture(moi, 9401, "2026-11-16T10:00:00Z");
    capture(moi, 9402, "2026-11-17T10:00:00Z");
    capture(moi, 9403, "2026-11-18T09:00:00Z");
    lire(moi)
        .andExpect(jsonPath("$.defi.valeur").value(3))
        .andExpect(jsonPath("$.defi.reussi").value(true));
  }

  @Test
  void capturesFenetreFiltreOrdreEtPastillesNulles() throws Exception {
    MAINTENANT.set(Instant.parse("2026-10-07T10:00:00Z"));
    capture(moi, 9404, "2026-10-06T10:00:00Z");
    capture(moi, 9401, "2026-10-04T22:00:00Z"); // = debutLe : inclus
    capture(moi, 9405, "2026-10-04T21:59:00Z"); // avant la fenêtre
    lire(moi)
        .andExpect(jsonPath("$.defi.code").value("PAS"))
        .andExpect(jsonPath("$.defi.debutLe").value("2026-10-04T22:00:00Z"))
        .andExpect(jsonPath("$.defi.valeur").value(2))
        .andExpect(jsonPath("$.defi.reussi").value(false))
        .andExpect(jsonPath("$.defi.pastilles.length()").value(3))
        .andExpect(jsonPath("$.defi.pastilles[0].libelle").value("Tour 9401"))
        .andExpect(jsonPath("$.defi.pastilles[0].faite").value(true))
        .andExpect(jsonPath("$.defi.pastilles[1].libelle").value("Tour 9404"))
        .andExpect(jsonPath("$.defi.pastilles[2].libelle").value((Object) null))
        .andExpect(jsonPath("$.defi.pastilles[2].faite").value(false));
    capture(moi, 9402, "2026-10-08T10:00:00Z");
    capture(moi, 9403, "2026-10-09T10:00:00Z");
    lire(moi)
        .andExpect(jsonPath("$.defi.valeur").value(3))
        .andExpect(jsonPath("$.defi.reussi").value(true))
        .andExpect(jsonPath("$.defi.pastilles.length()").value(3));
  }

  @Test
  void avertitSiUnMonumentReferenceEstInconnu() {
    jdbc.update("delete from catalogue.monument where numero = 9402");
    assertThat(controle.incoherences()).anyMatch(s -> s.contains("DOMES") && s.contains("9402"));
  }
}
