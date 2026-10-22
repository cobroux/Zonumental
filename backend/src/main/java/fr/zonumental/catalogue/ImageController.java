package fr.zonumental.catalogue;

import fr.zonumental.commun.ErreurMetier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sert les images copiées par {@link ImportCatalogue} (RG-022 : seules les images sous licence y
 * sont copiées). Le nom doit être {@code <numéro>.<ext>} : aucun séparateur de chemin possible.
 */
@RestController
@Tag(name = "catalogue")
class ImageController {

  private static final Map<String, MediaType> TYPES =
      Map.of(
          "jpg", MediaType.IMAGE_JPEG,
          "png", MediaType.IMAGE_PNG,
          "webp", MediaType.parseMediaType("image/webp"));

  private final Path dossier;

  ImageController(@Value("${zonumental.catalogue.images-dir:images-catalogue}") Path dossier) {
    this.dossier = dossier;
  }

  @GetMapping("/api/catalogue/images/{fichier:[0-9]+\\.(?:jpg|png|webp)}")
  @Operation(
      operationId = "lireImageMonument",
      responses = {@ApiResponse(responseCode = "200"), @ApiResponse(responseCode = "404")})
  ResponseEntity<Resource> lire(@PathVariable String fichier) {
    Path chemin = dossier.resolve(fichier);
    if (!Files.isRegularFile(chemin)) {
      throw new ErreurMetier(HttpStatus.NOT_FOUND, "introuvable");
    }
    // Le fichier d'un numéro est remplacé seulement par un nouvel import : cache long.
    return ResponseEntity.ok()
        .contentType(TYPES.get(fichier.substring(fichier.indexOf('.') + 1)))
        .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
        .body(new FileSystemResource(chemin));
  }
}
