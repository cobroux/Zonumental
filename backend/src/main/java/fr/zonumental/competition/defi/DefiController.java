package fr.zonumental.competition.defi;

import fr.zonumental.competition.defi.ProgressionDefi.DefiCourant;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Défi de la semaine de l'appelant : l'identité vient du jeton, aucune position (RG-036). */
@RestController
@Tag(name = "competition")
class DefiController {

  record Reponse(DefiCourant defi) {}

  private final CatalogueDefis catalogue;
  private final ProgressionDefi progression;
  private final Clock horloge;

  DefiController(CatalogueDefis catalogue, ProgressionDefi progression, Clock horloge) {
    this.catalogue = catalogue;
    this.progression = progression;
    this.horloge = horloge;
  }

  @GetMapping("/api/defis/courant")
  @Operation(
      operationId = "defiCourant",
      responses = {@ApiResponse(responseCode = "200"), @ApiResponse(responseCode = "401")})
  Reponse defiCourant(@AuthenticationPrincipal Jwt jwt) {
    UUID moi = UUID.fromString(jwt.getSubject());
    LocalDate jour = LocalDate.now(horloge.withZone(ProgressionDefi.PARIS));
    return new Reponse(catalogue.courant(jour).map(d -> progression.de(d, moi)).orElse(null));
  }
}
