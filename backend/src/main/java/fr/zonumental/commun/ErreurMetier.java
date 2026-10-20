package fr.zonumental.commun;

import org.springframework.http.HttpStatus;

/** Erreur attendue, rendue en problem+json avec le `code` du contrat. */
public class ErreurMetier extends RuntimeException {

  private final HttpStatus statut;
  private final String code;

  public ErreurMetier(HttpStatus statut, String code) {
    super(code);
    this.statut = statut;
    this.code = code;
  }

  public HttpStatus statut() {
    return statut;
  }

  public String code() {
    return code;
  }
}
