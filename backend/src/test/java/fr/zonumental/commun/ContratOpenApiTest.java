package fr.zonumental.commun;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.yaml.snakeyaml.Yaml;

/**
 * Le contrat publié par springdoc doit coïncider avec docs/api/openapi.yaml (contrat d'abord, ADR
 * 0014). Comparaison sémantique des opérations ; échec = désynchronisation.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ContratOpenApiTest {

  /** Parties du contrat dont le code n'existe pas encore ; retirer le préfixe à chaque story. */
  private static final String[] NON_IMPLEMENTE = {"/api/compte/"};

  /** Opérations de ces préfixes déjà implémentées (donc contrôlées). */
  private static final Set<String> IMPLEMENTE =
      Set.of(
          "/api/compte/inscription",
          "/api/compte/email/verification",
          "/api/compte/email/verification/renvoi",
          "/api/compte/mot-de-passe/oubli",
          "/api/compte/mot-de-passe/reinitialisation",
          "/api/compte/moi",
          "/api/compte/consentements",
          "/api/compte/export",
          "/api/compte/suppression",
          "/api/compte/suppression/annulation",
          "/api/auth/connexion",
          "/api/auth/renouvellement",
          "/api/auth/deconnexion");

  @Autowired MockMvc mvc;

  @Test
  @SuppressWarnings("unchecked")
  void contratGenereIdentiqueAuContratVersionne() throws Exception {
    String genere =
        mvc.perform(get("/v3/api-docs.yaml"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    Map<String, Object> code = (Map<String, Object>) new Yaml().load(genere);
    Map<String, Object> contrat = (Map<String, Object>) new Yaml().load(lireContrat());

    Map<String, Object> pathsCode = (Map<String, Object>) code.get("paths");
    Map<String, Object> pathsContrat = (Map<String, Object>) contrat.get("paths");

    // Rien dans le code qui ne soit au contrat, et tout le contrat implémenté sauf liste explicite.
    TreeSet<String> attendus = new TreeSet<>(pathsContrat.keySet());
    attendus.removeIf(
        p ->
            !IMPLEMENTE.contains(p)
                && java.util.Arrays.stream(NON_IMPLEMENTE).anyMatch(p::startsWith));
    assertThat(pathsCode.keySet()).containsExactlyInAnyOrderElementsOf(attendus);

    for (String chemin : pathsCode.keySet()) {
      Map<String, Object> opsCode = (Map<String, Object>) pathsCode.get(chemin);
      Map<String, Object> opsContrat = (Map<String, Object>) pathsContrat.get(chemin);
      assertThat(opsCode.keySet()).as(chemin).isEqualTo(opsContrat.keySet());
      for (String verbe : opsCode.keySet()) {
        Map<String, Object> oc = (Map<String, Object>) opsCode.get(verbe);
        Map<String, Object> ot = (Map<String, Object>) opsContrat.get(verbe);
        assertThat(oc.get("operationId"))
            .as(chemin + " operationId")
            .isEqualTo(ot.get("operationId"));
        assertThat(
                ((Map<String, Object>) oc.get("responses"))
                    .keySet().stream().map(String::valueOf).toList())
            .as(chemin + " réponses")
            .containsExactlyInAnyOrderElementsOf(
                ((Map<String, Object>) ot.get("responses"))
                    .keySet().stream().map(String::valueOf).toList());
        assertThat(oc.get("tags")).as(chemin + " tags").isEqualTo(ot.get("tags"));
      }
    }
  }

  private static String lireContrat() throws IOException {
    Path p = Path.of("..", "docs", "api", "openapi.yaml");
    return Files.readString(p);
  }
}
