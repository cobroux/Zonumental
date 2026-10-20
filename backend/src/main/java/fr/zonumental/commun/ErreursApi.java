package fr.zonumental.commun;

import jakarta.validation.ConstraintViolation;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import tools.jackson.databind.exc.InvalidFormatException;

/** Erreurs au format du contrat : problem+json avec `code` (et `erreurs` pour `validation`). */
// Avant le gestionnaire par défaut de Spring (problemdetails) qui masquerait `code`.
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
class ErreursApi {

  @ExceptionHandler(ErreurMetier.class)
  ResponseEntity<ProblemDetail> metier(ErreurMetier e) {
    ProblemDetail p = probleme(e.statut(), e.code());
    e.proprietes().forEach(p::setProperty);
    ResponseEntity.BodyBuilder r = ResponseEntity.status(e.statut());
    e.entetes().forEach(r::header);
    return r.body(p);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ProblemDetail validation(MethodArgumentNotValidException e) {
    List<Map<String, String>> erreurs =
        e.getBindingResult().getFieldErrors().stream()
            .map(
                f ->
                    Map.of(
                        "champ", f.getField(),
                        "code", codeContrainte(f.unwrap(ConstraintViolation.class))))
            .toList();
    ProblemDetail p = probleme(HttpStatus.BAD_REQUEST, "validation");
    p.setProperty("erreurs", erreurs);
    return p;
  }

  /** Corps illisible : une date impossible est signalée sur son champ, le reste en général. */
  @ExceptionHandler(HttpMessageNotReadableException.class)
  ProblemDetail illisible(HttpMessageNotReadableException e) {
    ProblemDetail p = probleme(HttpStatus.BAD_REQUEST, "validation");
    if (e.getCause() instanceof InvalidFormatException f
        && f.getTargetType() == java.time.LocalDate.class
        && !f.getPath().isEmpty()) {
      p.setProperty(
          "erreurs",
          List.of(
              Map.of("champ", f.getPath().getLast().getPropertyName(), "code", "date-invalide")));
    }
    return p;
  }

  private static String codeContrainte(ConstraintViolation<?> v) {
    return switch (v.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName()) {
      case "NotNull", "NotBlank" -> "obligatoire";
      case "Size" -> {
        Object min = v.getConstraintDescriptor().getAttributes().get("min");
        yield v.getInvalidValue() instanceof String s && s.length() < (int) min
            ? "trop-court"
            : "trop-long";
      }
      default -> "format";
    };
  }

  private static ProblemDetail probleme(HttpStatus statut, String code) {
    ProblemDetail p = ProblemDetail.forStatus(statut);
    p.setType(URI.create("https://zonumental.fr/erreurs/" + code));
    p.setTitle(code);
    p.setProperty("code", code);
    return p;
  }
}
