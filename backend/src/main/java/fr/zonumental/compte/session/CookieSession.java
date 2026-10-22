package fr.zonumental.compte.session;

import java.time.Duration;
import org.springframework.http.ResponseCookie;

/** Cookie de session de renouvellement ; l'effacement garde exactement le même Path. */
public final class CookieSession {

  static final String NOM = "zonumental_session";

  private CookieSession() {}

  static String poser(String valeur, Duration duree) {
    return construire(valeur, duree);
  }

  public static String effacer() {
    return construire("", Duration.ZERO);
  }

  private static String construire(String valeur, Duration duree) {
    return ResponseCookie.from(NOM, valeur)
        .httpOnly(true)
        .secure(true)
        .sameSite("Strict")
        .path("/api/auth")
        .maxAge(duree)
        .build()
        .toString();
  }
}
