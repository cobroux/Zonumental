package fr.zonumental.catalogue;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

/** r0-socle-20 : sources, licences et stats exposées par l'API (RG-022, RG-023). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class FicheMonumentTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder encodeur;

  String bearer;
  UUID moi = UUID.randomUUID();

  @BeforeEach
  void preparer() throws Exception {
    jdbc.update("delete from catalogue.monument");
    jdbc.update("delete from catalogue.ville");
    jdbc.update("delete from compte.utilisateur");
    jdbc.update("delete from capture.capture");
    jdbc.update("insert into catalogue.ville values ('69123', 'Lyon', 10)");
    // 1 : complet ; 2 : image sans licence (donc non importée), stats inconnues, sans texte.
    monument(
        1,
        "Tour A",
        "1889, 'Art nouveau', 330.5, 'Un texte.', 'https://fr.wikipedia.org/wiki/A', 'CC BY-SA 4.0',"
            + " '/api/catalogue/images/1.jpg', 'https://commons.wikimedia.org/wiki/File:A.jpg',"
            + " 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0', 'Jean'");
    monument(2, "Basilique B", "null, null, null, null, null, null, null, null, null, null, null");

    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " cree_le, derniere_activite_le) values (?, 'marco@exemple.fr', 'Marco', ?,"
            + " '2000-01-01', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
        moi,
        encodeur.encode("chat-bleu-47-lune"));
    String corps =
        mvc.perform(
                post("/api/auth/connexion")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"email\":\"marco@exemple.fr\",\"motDePasse\":\"chat-bleu-47-lune\"}"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    bearer = "Bearer " + corps.replaceAll(".*\"jetonAcces\"\\s*:\\s*\"([^\"]+)\".*", "$1");
  }

  void capturer(UUID qui, int numero) {
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id)"
            + " values (?, ?, 10, ?)",
        qui,
        numero,
        UUID.randomUUID());
  }

  void monument(int numero, String nom, String champs) {
    jdbc.execute(
        "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
            + " latitude, longitude, rarete, popularite, annee, style, hauteur_m, histoire_texte,"
            + " histoire_source_url, histoire_licence, image_url, image_source_url, image_licence,"
            + " image_licence_url, image_auteur) values ("
            + numero
            + ", 'Q"
            + numero
            + "', '"
            + nom
            + "', 'TOUR', '69123', 45.76, 4.83, 'COMMUN', 1, "
            + champs
            + ")");
  }

  @Test
  void capture_ficheExposeSourcesLicencesAuteurStatsEtPhoto() throws Exception {
    capturer(moi, 1);
    mvc.perform(get("/api/catalogue/monuments/1").header("Authorization", bearer))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.numero").value(1))
        .andExpect(jsonPath("$.nom").value("Tour A"))
        .andExpect(jsonPath("$.type").value("TOUR"))
        .andExpect(jsonPath("$.ville.nom").value("Lyon"))
        .andExpect(jsonPath("$.ville.codeInsee").value("69123"))
        .andExpect(jsonPath("$.rarete").value("COMMUN"))
        .andExpect(jsonPath("$.position.latitude").value(45.76))
        .andExpect(jsonPath("$.rayonCaptureMetres").value(150))
        .andExpect(jsonPath("$.captureeLe").isNotEmpty())
        .andExpect(jsonPath("$.siecle").value(19))
        .andExpect(jsonPath("$.photoUrl").value("/api/captures/1/photo"))
        .andExpect(jsonPath("$.stats.annee").value(1889))
        .andExpect(jsonPath("$.stats.style").value("Art nouveau"))
        .andExpect(jsonPath("$.stats.hauteurMetres").value(330.5))
        .andExpect(jsonPath("$.histoire.texte").value("Un texte."))
        .andExpect(jsonPath("$.histoire.sourceUrl").value("https://fr.wikipedia.org/wiki/A"))
        .andExpect(jsonPath("$.histoire.licence").value("CC BY-SA 4.0"))
        .andExpect(jsonPath("$.image.url").value("/api/catalogue/images/1-nb.jpg"))
        .andExpect(jsonPath("$.image.urlCouleur").value("/api/catalogue/monuments/1/image"))
        .andExpect(
            jsonPath("$.image.sourceUrl").value("https://commons.wikimedia.org/wiki/File:A.jpg"))
        .andExpect(jsonPath("$.image.licence").value("CC BY 3.0"))
        .andExpect(
            jsonPath("$.image.licenceUrl").value("https://creativecommons.org/licenses/by/3.0"))
        .andExpect(jsonPath("$.image.auteur").value("Jean"));
  }

  @Test
  void nonCapture_indicesSeulement() throws Exception {
    mvc.perform(get("/api/catalogue/monuments/1").header("Authorization", bearer))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nom").value("Tour A"))
        .andExpect(jsonPath("$.numero").value(1))
        .andExpect(jsonPath("$.type").value("TOUR"))
        .andExpect(jsonPath("$.ville.nom").value("Lyon"))
        .andExpect(jsonPath("$.rarete").value("COMMUN"))
        .andExpect(jsonPath("$.siecle").value(19))
        .andExpect(jsonPath("$.image.url").value("/api/catalogue/images/1-nb.jpg"))
        .andExpect(content().string(containsString("\"urlCouleur\":null")))
        .andExpect(content().string(containsString("\"stats\":null")))
        .andExpect(content().string(containsString("\"histoire\":null")))
        .andExpect(content().string(containsString("\"photoUrl\":null")))
        .andExpect(content().string(containsString("\"captureeLe\":null")));
  }

  @Test
  void siecleDeduitDeLAnnee() throws Exception {
    assertSiecle(1675, 17);
    assertSiecle(1700, 17);
    assertSiecle(1701, 18);
    assertSiecle(-19, -1);
    assertSiecle(-100, -1);
    assertSiecle(-101, -2);
    jdbc.update("update catalogue.monument set annee = null where numero = 2");
    mvc.perform(get("/api/catalogue/monuments/2").header("Authorization", bearer))
        .andExpect(content().string(containsString("\"siecle\":null")));
  }

  void assertSiecle(int annee, int attendu) throws Exception {
    jdbc.update("update catalogue.monument set annee = ? where numero = 2", annee);
    mvc.perform(get("/api/catalogue/monuments/2").header("Authorization", bearer))
        .andExpect(jsonPath("$.siecle").value(attendu));
  }

  @Test
  void capture_statInconnueEstNullEtImageSansLicenceEstAbsente() throws Exception {
    capturer(moi, 2);
    mvc.perform(get("/api/catalogue/monuments/2").header("Authorization", bearer))
        .andExpect(status().isOk())
        .andExpect(content().string(containsString("\"image\":null")))
        .andExpect(content().string(containsString("\"histoire\":null")))
        .andExpect(content().string(containsString("\"siecle\":null")))
        .andExpect(
            content()
                .string(
                    containsString(
                        "\"stats\":{\"annee\":null,\"style\":null,\"hauteurMetres\":null}")));
  }

  @Test
  void histoireImporteeApresCaptureApparaitALaRelecture() throws Exception {
    capturer(moi, 2);
    mvc.perform(get("/api/catalogue/monuments/2").header("Authorization", bearer))
        .andExpect(jsonPath("$.histoire").doesNotExist());
    jdbc.update(
        "update catalogue.monument set histoire_texte = 'Tard.', histoire_source_url ="
            + " 'https://fr.wikipedia.org/wiki/B', histoire_licence = 'CC BY-SA 4.0'"
            + " where numero = 2");
    mvc.perform(get("/api/catalogue/monuments/2").header("Authorization", bearer))
        .andExpect(jsonPath("$.histoire.texte").value("Tard."));
  }

  @Test
  void photoRemplaceeLHistoireResteLa() throws Exception {
    capturer(moi, 1);
    jdbc.update("update capture.capture set photo_id = ?", UUID.randomUUID());
    mvc.perform(get("/api/catalogue/monuments/1").header("Authorization", bearer))
        .andExpect(jsonPath("$.histoire.texte").value("Un texte."));
  }

  @Test
  void captureParUnAutreExplorateurResteVerrouillePourMoi() throws Exception {
    capturer(UUID.randomUUID(), 1);
    mvc.perform(get("/api/catalogue/monuments/1").header("Authorization", bearer))
        .andExpect(content().string(containsString("\"stats\":null")))
        .andExpect(content().string(containsString("\"urlCouleur\":null")));
  }

  @Test
  void listeTrieeParNumeroVerrouilleeSansUrlCouleur() throws Exception {
    mvc.perform(get("/api/catalogue/monuments").header("Authorization", bearer))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].numero").value(1))
        .andExpect(jsonPath("$[0].image.licence").value("CC BY 3.0"))
        .andExpect(jsonPath("$[0].image.url").value("/api/catalogue/images/1-nb.jpg"))
        .andExpect(jsonPath("$[0].image.urlCouleur").doesNotExist())
        .andExpect(jsonPath("$[1].numero").value(2))
        .andExpect(content().string(containsString("\"image\":null")))
        .andExpect(jsonPath("$[1].stats").doesNotExist())
        .andExpect(content().string(org.hamcrest.Matchers.not(containsString("Un texte"))))
        .andExpect(content().string(org.hamcrest.Matchers.not(containsString("1889"))));
  }

  @Test
  void inconnuDonne404Introuvable() throws Exception {
    mvc.perform(get("/api/catalogue/monuments/99").header("Authorization", bearer))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("introuvable"));
  }

  @Test
  void sansJetonDonne401() throws Exception {
    mvc.perform(get("/api/catalogue/monuments")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/catalogue/monuments/1")).andExpect(status().isUnauthorized());
  }
}
