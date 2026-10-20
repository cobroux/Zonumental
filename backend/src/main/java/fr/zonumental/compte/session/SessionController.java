package fr.zonumental.compte.session;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "auth")
class SessionController {

  record ReponseAcces(String jetonAcces, long expireDans) {}

  private final Connexion connexion;

  SessionController(Connexion connexion) {
    this.connexion = connexion;
  }

  @PostMapping("/api/auth/connexion")
  @Operation(
      operationId = "connexion",
      security = {},
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "400"),
        @ApiResponse(responseCode = "401"),
        @ApiResponse(responseCode = "409"),
        @ApiResponse(responseCode = "429")
      })
  ResponseEntity<ReponseAcces> connexion(@Valid @RequestBody DemandeConnexion demande) {
    Connexion.Ouverte o = connexion.connecter(demande);
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, o.cookie())
        .body(new ReponseAcces(o.jetonAcces(), JetonsAcces.DUREE.toSeconds()));
  }
}
