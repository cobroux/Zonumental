package fr.zonumental.compte.suppression;

import fr.zonumental.compte.session.CookieSession;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "compte")
class SuppressionController {

  record SuppressionProgrammee(OffsetDateTime suppressionDefinitiveLe) {}

  private final Suppression suppression;

  SuppressionController(Suppression suppression) {
    this.suppression = suppression;
  }

  @PostMapping("/api/compte/suppression")
  @Operation(
      operationId = "demanderSuppression",
      responses = {@ApiResponse(responseCode = "202"), @ApiResponse(responseCode = "401")})
  ResponseEntity<SuppressionProgrammee> demander(@AuthenticationPrincipal Jwt jwt) {
    OffsetDateTime fin = suppression.demander(UUID.fromString(jwt.getSubject()));
    return ResponseEntity.accepted()
        .header(HttpHeaders.SET_COOKIE, CookieSession.effacer())
        .body(new SuppressionProgrammee(fin));
  }
}
