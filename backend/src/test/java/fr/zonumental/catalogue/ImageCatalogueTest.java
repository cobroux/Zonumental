package fr.zonumental.catalogue;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import fr.zonumental.TestcontainersConfiguration;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
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

  @Test
  void imageServieSansJetonAvecTypeEtCacheLong() throws Exception {
    mvc.perform(get("/api/catalogue/images/1.jpg"))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", "image/jpeg"))
        .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"))
        .andExpect(content().bytes(OCTETS));
    mvc.perform(get("/api/catalogue/images/2.png"))
        .andExpect(header().string("Content-Type", "image/png"));
    mvc.perform(get("/api/catalogue/images/3.webp"))
        .andExpect(header().string("Content-Type", "image/webp"));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "99.jpg",
        "1.gif",
        "abc.jpg",
        "1.jpg.bak",
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
