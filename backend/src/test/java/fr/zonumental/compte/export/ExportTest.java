package fr.zonumental.compte.export;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** r0-socle-13 : export des données personnelles (R0-17, RG-013, RG-006, RG-036). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ExportTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired PasswordEncoder encodeur;

  String bearer;

  @BeforeEach
  void connecte() throws Exception {
    jdbc.update("delete from compte.utilisateur");
    UUID id = UUID.randomUUID();
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " email_verifie_le, cree_le, derniere_activite_le) values (?, 'marco@exemple.fr',"
            + " 'Marco', ?, '2000-01-01', '2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z',"
            + " '2026-01-01T00:00:00Z')",
        id,
        encodeur.encode("chat-bleu-47-lune"));
    jdbc.update(
        "insert into compte.consentement (utilisateur_id, type, accorde, version_texte,"
            + " horodatage) values (?, 'CGU', true, 'v1', '2026-01-01T00:00:00Z'),"
            + " (?, 'CLASSEMENT', false, 'v1', '2026-01-01T00:00:00Z'),"
            + " (?, 'CLASSEMENT', true, 'v2', '2026-02-01T00:00:00Z')",
        id,
        id,
        id);
    String corps =
        mvc.perform(
                post("/api/auth/connexion")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"email\":\"marco@exemple.fr\",\"motDePasse\":\"chat-bleu-47-lune\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    bearer = "Bearer " + corps.replaceAll(".*\"jetonAcces\"\\s*:\\s*\"([^\"]+)\".*", "$1");
  }

  @Test
  void sansJetonRefuse() throws Exception {
    mvc.perform(get("/api/compte/export")).andExpect(status().isUnauthorized());
  }

  @Test
  void zipAvecDonneesDuCompteSansSecret() throws Exception {
    var debut =
        mvc.perform(get("/api/compte/export").header("Authorization", bearer))
            .andExpect(request().asyncStarted())
            .andReturn();
    var reponse =
        mvc.perform(asyncDispatch(debut)).andExpect(status().isOk()).andReturn().getResponse();

    assertThat(reponse.getContentType()).startsWith("application/zip");
    assertThat(reponse.getHeader("Content-Disposition"))
        .isEqualTo("attachment; filename=\"zonumental-export-" + LocalDate.now() + ".zip\"");

    Map<String, String> entrees = new LinkedHashMap<>();
    try (var zip = new ZipInputStream(new ByteArrayInputStream(reponse.getContentAsByteArray()))) {
      for (ZipEntry e = zip.getNextEntry(); e != null; e = zip.getNextEntry()) {
        entrees.put(e.getName(), new String(zip.readAllBytes(), StandardCharsets.UTF_8));
      }
    }
    assertThat(entrees).containsOnlyKeys("donnees.json");

    String brut = entrees.get("donnees.json");
    JsonNode json = new ObjectMapper().readTree(brut);
    assertThat(json.get("exporteLe").asText()).isNotBlank();
    assertThat(json.at("/compte/pseudo").asText()).isEqualTo("Marco");
    assertThat(json.at("/compte/email").asText()).isEqualTo("marco@exemple.fr");
    assertThat(json.at("/compte/dateNaissance").asText()).isEqualTo("2000-01-01");
    assertThat(json.at("/compte/emailVerifieLe").asText()).startsWith("2026-01-02");
    assertThat(json.at("/compte/creeLe").asText()).startsWith("2026-01-01");

    JsonNode consentements = json.get("consentements");
    assertThat(consentements).hasSize(3);
    assertThat(consentements.get(0).get("type").asText()).isEqualTo("CGU");
    assertThat(consentements.get(2).get("type").asText()).isEqualTo("CLASSEMENT");
    assertThat(consentements.get(2).get("accorde").asBoolean()).isTrue();
    assertThat(consentements.get(2).get("versionTexte").asText()).isEqualTo("v2");
    assertThat(consentements.get(2).get("horodatage").asText()).startsWith("2026-02-01");

    // Compte sans capture : export valide, liste vide.
    assertThat(json.get("captures").isArray()).isTrue();
    assertThat(json.get("captures")).isEmpty();

    assertThat(brut.toLowerCase())
        .doesNotContain("motdepasse", "mot_de_passe", "hash", "empreinte", "argon", "bcrypt")
        .doesNotContain("latitude", "longitude", "jeton")
        .doesNotContain("$2");
  }
}
