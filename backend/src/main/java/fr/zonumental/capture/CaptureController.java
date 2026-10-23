package fr.zonumental.capture;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Tag(name = "capture")
class CaptureController {

  /** {@code toString} sans position ni précision : jamais dans un journal (ADR 0008). */
  record Demande(
      @NotNull @Min(1) Integer numero,
      @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
      @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
      @NotNull @DecimalMin("0") Double precisionMetres,
      @NotNull MultipartFile photo) {

    @Override
    public String toString() {
      return "Demande[numero=" + numero + "]";
    }
  }

  private final Capturer capturer;

  CaptureController(Capturer capturer) {
    this.capturer = capturer;
  }

  @PostMapping(path = "/api/captures", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(
      operationId = "capturer",
      responses = {
        @ApiResponse(responseCode = "201"),
        @ApiResponse(responseCode = "400"),
        @ApiResponse(responseCode = "401"),
        @ApiResponse(responseCode = "403"),
        @ApiResponse(responseCode = "404"),
        @ApiResponse(responseCode = "409"),
        @ApiResponse(responseCode = "422")
      })
  Capturer.Reussite capturer(@Valid Demande d, @AuthenticationPrincipal Jwt jwt) {
    try {
      return capturer.capturer(
          UUID.fromString(jwt.getSubject()),
          d.numero(),
          d.latitude(),
          d.longitude(),
          d.precisionMetres(),
          d.photo().getBytes());
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}
