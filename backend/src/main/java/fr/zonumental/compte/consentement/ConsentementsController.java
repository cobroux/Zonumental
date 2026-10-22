package fr.zonumental.compte.consentement;

import fr.zonumental.compte.consentement.Consentements.Facultatifs;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "compte")
class ConsentementsController {

  record Demande(@NotNull Boolean classement, @NotNull Boolean emails) {}

  private final Consentements consentements;

  ConsentementsController(Consentements consentements) {
    this.consentements = consentements;
  }

  @GetMapping("/api/compte/consentements")
  @Operation(
      operationId = "mesConsentements",
      responses = {@ApiResponse(responseCode = "200"), @ApiResponse(responseCode = "401")})
  Facultatifs lire(@AuthenticationPrincipal Jwt jwt) {
    return consentements.etat(UUID.fromString(jwt.getSubject()));
  }

  @PutMapping("/api/compte/consentements")
  @Operation(
      operationId = "modifierConsentements",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "400"),
        @ApiResponse(responseCode = "401")
      })
  Facultatifs modifier(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Demande d) {
    return consentements.modifier(
        UUID.fromString(jwt.getSubject()), new Facultatifs(d.classement(), d.emails()));
  }
}
