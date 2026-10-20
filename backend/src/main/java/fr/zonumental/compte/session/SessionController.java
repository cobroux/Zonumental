package fr.zonumental.compte.session;

import fr.zonumental.commun.ErreurMetier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
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

  @PostMapping("/api/auth/renouvellement")
  @Operation(
      operationId = "renouvellement",
      security = {},
      responses = {@ApiResponse(responseCode = "200"), @ApiResponse(responseCode = "401")})
  ResponseEntity<ReponseAcces> renouvellement(
      @CookieValue(name = CookieSession.NOM, required = false) String cookie,
      HttpServletResponse reponse) {
    Connexion.Ouverte o =
        connexion
            .renouveler(cookie)
            .orElseThrow(
                () -> {
                  // L'en-tête posé ici survit au rendu du problème par ErreursApi.
                  reponse.addHeader(HttpHeaders.SET_COOKIE, CookieSession.effacer());
                  return new ErreurMetier(HttpStatus.UNAUTHORIZED, "session-expiree");
                });
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, o.cookie())
        .body(new ReponseAcces(o.jetonAcces(), JetonsAcces.DUREE.toSeconds()));
  }

  @PostMapping("/api/auth/deconnexion")
  @Operation(
      operationId = "deconnexion",
      security = {},
      responses = {@ApiResponse(responseCode = "204")})
  ResponseEntity<Void> deconnexion(
      @CookieValue(name = CookieSession.NOM, required = false) String cookie) {
    connexion.deconnecter(cookie);
    return ResponseEntity.noContent()
        .header(HttpHeaders.SET_COOKIE, CookieSession.effacer())
        .build();
  }
}
