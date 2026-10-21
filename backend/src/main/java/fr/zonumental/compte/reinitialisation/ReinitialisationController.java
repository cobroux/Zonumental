package fr.zonumental.compte.reinitialisation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "compte")
class ReinitialisationController {

  private final Reinitialisation reinitialisation;

  ReinitialisationController(Reinitialisation reinitialisation) {
    this.reinitialisation = reinitialisation;
  }

  @PostMapping("/api/compte/mot-de-passe/oubli")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @Operation(
      operationId = "demanderReinitialisation",
      security = {},
      responses = {@ApiResponse(responseCode = "202"), @ApiResponse(responseCode = "400")})
  void demander(@Valid @RequestBody DemandeOubli demande) {
    reinitialisation.demander(demande.email());
  }

  @PostMapping("/api/compte/mot-de-passe/reinitialisation")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(
      operationId = "reinitialiserMotDePasse",
      security = {},
      responses = {
        @ApiResponse(responseCode = "204"),
        @ApiResponse(responseCode = "400"),
        @ApiResponse(responseCode = "409"),
        @ApiResponse(responseCode = "410")
      })
  void reinitialiser(@Valid @RequestBody DemandeReinitialisation demande) {
    reinitialisation.reinitialiser(demande.jeton(), demande.nouveauMotDePasse());
  }
}
