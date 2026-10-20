package fr.zonumental.compte.verification;

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
class VerificationController {

  private final Verification verification;

  VerificationController(Verification verification) {
    this.verification = verification;
  }

  @PostMapping("/api/compte/email/verification")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(
      operationId = "verifierEmail",
      security = {},
      responses = {
        @ApiResponse(responseCode = "204"),
        @ApiResponse(responseCode = "400"),
        @ApiResponse(responseCode = "409"),
        @ApiResponse(responseCode = "410")
      })
  void verifier(@RequestBody DemandeVerification demande) {
    verification.verifier(demande.jeton());
  }

  @PostMapping("/api/compte/email/verification/renvoi")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @Operation(
      operationId = "renvoyerVerification",
      security = {},
      responses = {@ApiResponse(responseCode = "202"), @ApiResponse(responseCode = "400")})
  void renvoyer(@Valid @RequestBody DemandeRenvoi demande) {
    verification.renvoyer(demande.email());
  }
}
