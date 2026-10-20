package fr.zonumental.commun;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Erreur attendue, rendue en problem+json avec le `code` du contrat. */
public class ErreurMetier extends RuntimeException {

  private final HttpStatus statut;
  private final String code;

  private final Map<String, Object> proprietes;
  private final Map<String, String> entetes;

  public ErreurMetier(HttpStatus statut, String code) {
    this(statut, code, Map.of());
  }

  /** {@code proprietes} : champs en plus du problème (ex. suppressionDefinitiveLe). */
  public ErreurMetier(HttpStatus statut, String code, Map<String, Object> proprietes) {
    this(statut, code, proprietes, Map.of());
  }

  /** {@code entetes} : en-têtes HTTP de la réponse (ex. Retry-After). */
  public ErreurMetier(
      HttpStatus statut, String code, Map<String, Object> proprietes, Map<String, String> entetes) {
    super(code);
    this.entetes = entetes;
    this.statut = statut;
    this.code = code;
    this.proprietes = proprietes;
  }

  public Map<String, Object> proprietes() {
    return proprietes;
  }

  public Map<String, String> entetes() {
    return entetes;
  }

  public HttpStatus statut() {
    return statut;
  }

  public String code() {
    return code;
  }
}
