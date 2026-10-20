package fr.zonumental.commun;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Erreur attendue, rendue en problem+json avec le `code` du contrat. */
public class ErreurMetier extends RuntimeException {

  private final HttpStatus statut;
  private final String code;

  private final Map<String, Object> proprietes;

  public ErreurMetier(HttpStatus statut, String code) {
    this(statut, code, Map.of());
  }

  /** {@code proprietes} : champs en plus du problème (ex. suppressionDefinitiveLe). */
  public ErreurMetier(HttpStatus statut, String code, Map<String, Object> proprietes) {
    super(code);
    this.statut = statut;
    this.code = code;
    this.proprietes = proprietes;
  }

  public Map<String, Object> proprietes() {
    return proprietes;
  }

  public HttpStatus statut() {
    return statut;
  }

  public String code() {
    return code;
  }
}
