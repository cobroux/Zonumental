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

/** Dans ce paquet : l'annulation partage le compteur d'échecs, package-private, de la connexion. */
@RestController
@Tag(name = "compte")
class AnnulationSuppressionController {

  private final Connexion connexion;

  AnnulationSuppressionController(Connexion connexion) {
    this.connexion = connexion;
  }

  @PostMapping("/api/compte/suppression/annulation")
  @Operation(
      operationId = "annulerSuppression",
      security = {},
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "400"),
        @ApiResponse(responseCode = "401"),
        @ApiResponse(responseCode = "429")
      })
  ResponseEntity<SessionController.ReponseAcces> annulerSuppression(
      @Valid @RequestBody DemandeConnexion demande) {
    Connexion.Ouverte o = connexion.annulerSuppression(demande);
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, o.cookie())
        .body(new SessionController.ReponseAcces(o.jetonAcces(), JetonsAcces.DUREE.toSeconds()));
  }
}
