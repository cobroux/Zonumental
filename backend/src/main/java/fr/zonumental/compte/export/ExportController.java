package fr.zonumental.compte.export;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "compte")
class ExportController {

  private final Export export;

  ExportController(Export export) {
    this.export = export;
  }

  @GetMapping(value = "/api/compte/export", produces = "application/zip")
  @Operation(
      operationId = "exporterMesDonnees",
      responses = {@ApiResponse(responseCode = "200"), @ApiResponse(responseCode = "401")})
  ResponseEntity<byte[]> exporter(@AuthenticationPrincipal Jwt jwt) {
    Export.Archive archive = export.archive(UUID.fromString(jwt.getSubject()));
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("application/zip"))
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(archive.nom()).build().toString())
        .body(archive.contenu());
  }
}
