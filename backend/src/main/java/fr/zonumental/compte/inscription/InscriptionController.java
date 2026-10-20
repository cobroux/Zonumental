package fr.zonumental.compte.inscription;

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
class InscriptionController {

  private final Inscription inscription;

  InscriptionController(Inscription inscription) {
    this.inscription = inscription;
  }

  @PostMapping("/api/compte/inscription")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @Operation(
      operationId = "inscrire",
      security = {},
      responses = {
        @ApiResponse(responseCode = "202"),
        @ApiResponse(responseCode = "400"),
        @ApiResponse(responseCode = "409"),
        @ApiResponse(responseCode = "422")
      })
  void inscrire(@Valid @RequestBody DemandeInscription demande) {
    inscription.inscrire(demande);
  }
}
