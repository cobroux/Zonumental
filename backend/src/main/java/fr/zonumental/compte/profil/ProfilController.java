package fr.zonumental.compte.profil;

import fr.zonumental.commun.ErreurMetier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.deser.std.StdDeserializer;

@RestController
@Tag(name = "compte")
class ProfilController {

  record Profil(UUID id, String pseudo, String email, boolean emailVerifie, boolean modeFacile) {}

  record Preferences(@NotNull @JsonDeserialize(using = BooleenStrict.class) Boolean modeFacile) {}

  /** Refuse « true », 1, 0 : pas de coercition, sans toucher à la config globale de Jackson. */
  static class BooleenStrict extends StdDeserializer<Boolean> {
    BooleenStrict() {
      super(Boolean.class);
    }

    @Override
    public Boolean deserialize(JsonParser p, DeserializationContext ctxt) {
      JsonToken t = p.currentToken();
      if (t == JsonToken.VALUE_TRUE || t == JsonToken.VALUE_FALSE) {
        return t == JsonToken.VALUE_TRUE;
      }
      return (Boolean) ctxt.handleUnexpectedToken(Boolean.class, p);
    }
  }

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
            "select id, pseudo, email, email_verifie_le is not null as verifie, mode_facile"
                + " from compte.utilisateur where id = ?")
        .param(UUID.fromString(jwt.getSubject()))
        .query(
            (r, i) ->
                new Profil(
                    r.getObject("id", UUID.class),
                    r.getString("pseudo"),
                    r.getString("email"),
                    r.getBoolean("verifie"),
                    r.getBoolean("mode_facile")))
        .optional()
        .orElseThrow(() -> new ErreurMetier(HttpStatus.UNAUTHORIZED, "non-authentifie"));
  }

  @PutMapping("/api/compte/preferences")
  @Operation(
      operationId = "modifierPreferences",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "400"),
        @ApiResponse(responseCode = "401")
      })
  Preferences modifier(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Preferences p) {
    int n =
        jdbc.sql(
                "update compte.utilisateur set mode_facile = ? where id = ?"
                    + " and suppression_demandee_le is null")
            .params(p.modeFacile(), UUID.fromString(jwt.getSubject()))
            .update();
    if (n == 0) {
      throw new ErreurMetier(HttpStatus.UNAUTHORIZED, "non-authentifie");
    }
    return p;
  }
}
