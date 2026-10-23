package fr.zonumental.capture;

import fr.zonumental.commun.ErreurMetier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "capture")
class PhotoCaptureController {

  private final JdbcClient jdbc;
  private final StockagePhotos stockage;

  PhotoCaptureController(JdbcClient jdbc, StockagePhotos stockage) {
    this.jdbc = jdbc;
    this.stockage = stockage;
  }

  /**
   * La clé dépend du jeton : on ne peut pas viser la photo d'un autre, elle est « introuvable ».
   */
  @GetMapping("/api/captures/{numero}/photo")
  @Operation(
      operationId = "lirePhotoCapture",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "401"),
        @ApiResponse(responseCode = "404")
      })
  ResponseEntity<byte[]> photo(@PathVariable int numero, @AuthenticationPrincipal Jwt jwt) {
    UUID utilisateur = UUID.fromString(jwt.getSubject());
    byte[] jpeg =
        jdbc.sql(
                "select photo_id from capture.capture"
                    + " where utilisateur_id = ? and numero_monument = ?")
            .params(utilisateur, numero)
            .query(UUID.class)
            .optional()
            .flatMap(photo -> stockage.lire(utilisateur, photo))
            .orElseThrow(() -> new ErreurMetier(HttpStatus.NOT_FOUND, "introuvable"));
    return ResponseEntity.ok()
        .contentType(MediaType.IMAGE_JPEG)
        .cacheControl(CacheControl.noStore().cachePrivate())
        .body(jpeg);
  }
}
