package fr.zonumental.compte.profil;

import fr.zonumental.commun.ErreurMetier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "compte")
class ProfilController {

  record Profil(UUID id, String pseudo, String email, boolean emailVerifie) {}

  private final JdbcClient jdbc;

  ProfilController(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping("/api/compte/moi")
  @Operation(
      operationId = "monCompte",
      responses = {@ApiResponse(responseCode = "200"), @ApiResponse(responseCode = "401")})
  Profil moi(@AuthenticationPrincipal Jwt jwt) {
    return jdbc.sql(
            "select id, pseudo, email, email_verifie_le is not null as verifie"
                + " from compte.utilisateur where id = ?")
        .param(UUID.fromString(jwt.getSubject()))
        .query(
            (r, i) ->
                new Profil(
                    r.getObject("id", UUID.class),
                    r.getString("pseudo"),
                    r.getString("email"),
                    r.getBoolean("verifie")))
        .optional()
        .orElseThrow(() -> new ErreurMetier(HttpStatus.UNAUTHORIZED, "non-authentifie"));
  }
}
