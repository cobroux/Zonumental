package fr.zonumental.catalogue;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** r0-socle-21 : les images copiées par l'import sont servies par nous, jamais par Wikimedia. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ImageCatalogueTest {

  static final byte[] OCTETS = {1, 2, 3, 4};
  static final Path dossier;

  static {
    try {
      dossier = Files.createTempDirectory("images-catalogue");
      Files.write(dossier.resolve("1.jpg"), OCTETS);
      Files.write(dossier.resolve("1-nb.jpg"), OCTETS);
      Files.write(dossier.resolve("2.png"), OCTETS);
      Files.write(dossier.resolve("3.webp"), OCTETS);
      // Présent mais non numérique : le motif de route doit le refuser.
      Files.write(dossier.resolve("abc.jpg"), OCTETS);
      // Hors du dossier d'images : ne doit jamais être atteignable.
      Files.write(dossier.resolveSibling("secret.jpg"), OCTETS);
    } catch (IOException e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @DynamicPropertySource
  static void proprietes(DynamicPropertyRegistry r) {
    r.add("zonumental.catalogue.images-dir", () -> dossier.toString());
  }

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  @Test
  void noirEtBlancServiSansJetonAvecCacheLong() throws Exception {
    mvc.perform(get("/api/catalogue/images/1-nb.jpg"))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", "image/jpeg"))
        .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"))
        .andExpect(content().bytes(OCTETS));
  }

  @ParameterizedTest
  @ValueSource(strings = {"1.jpg", "2.png", "3.webp"})
  void couleurIntrouvableSurLaRoutePublique(String nom) throws Exception {
    mvc.perform(get("/api/catalogue/images/" + nom)).andExpect(status().isNotFound());
  }

  @Test
  void couleurSansJetonDonne401() throws Exception {
    mvc.perform(get("/api/catalogue/monuments/1/image")).andExpect(status().isUnauthorized());
  }

  @Test
  void couleurNonCapturee404EtCapturee200Privee() throws Exception {
    UUID moi = UUID.randomUUID();
    jdbc.update("delete from capture.capture");
    jdbc.update("delete from catalogue.monument");
    jdbc.update("delete from catalogue.ville");
    jdbc.update("insert into catalogue.ville values ('69123', 'Lyon', 10)");
    for (int n = 1; n <= 3; n++) {
      jdbc.update(
          "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
              + " latitude, longitude, rarete, popularite, image_url, image_source_url, image_licence) values (?, ?, 'M', 'TOUR',"
              + " '69123', 45.76, 4.83, 'COMMUN', 1, ?, 'https://commons.wikimedia.org/x', 'CC0')",
          n,
          "Q" + n,
          n == 3 ? null : "/api/catalogue/images/" + n + ".jpg");
    }
    jdbc.update(
        "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id)"
            + " values (?, 1, 1, ?), (?, 3, 1, ?)",
        moi,
        UUID.randomUUID(),
        moi,
        UUID.randomUUID());
    var connecte = jwt().jwt(j -> j.subject(moi.toString()));
    mvc.perform(get("/api/catalogue/monuments/2/image").with(connecte))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/catalogue/monuments/99/image").with(connecte))
        .andExpect(status().isNotFound());
    // capturé mais sans image
    mvc.perform(get("/api/catalogue/monuments/3/image").with(connecte))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/catalogue/monuments/1/image").with(connecte))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", "image/jpeg"))
        .andExpect(header().string("Cache-Control", "max-age=86400, private"))
        .andExpect(content().bytes(OCTETS));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "99-nb.jpg",
        "1-nb.gif",
        "1-nb.png",
        "abc.jpg",
        "1-nb.jpg.bak",
        "..",
        "..%2fsecret.jpg",
        "..%2F..%2Fsecret.jpg",
        "%2e%2e%2fsecret.jpg",
        "%2e%2e/secret.jpg",
        "..%5csecret.jpg",
        "%2fetc%2fpasswd",
        "..;/secret.jpg",
        "/etc/passwd"
      })
  void inconnueOuSortieDuDossierDonne404SansFuite(String nom) throws Exception {
    mvc.perform(get("/api/catalogue/images/" + nom))
        .andExpect(status().isNotFound())
        .andExpect(
            result -> {
              String corps = result.getResponse().getContentAsString();
              if (corps.contains(dossier.toString()) || corps.contains("secret")) {
                throw new AssertionError("fuite de chemin : " + corps);
              }
            });
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"/api/health/..%2fsecret", "/api/catalogue/..%2fsecret", "/api/%2e%2e%2fx"})
  void requeteRejeteeHorsImagesResteEn400SansCorps(String uri) throws Exception {
    mvc.perform(get(uri)).andExpect(status().isBadRequest()).andExpect(content().string(""));
  }
}
