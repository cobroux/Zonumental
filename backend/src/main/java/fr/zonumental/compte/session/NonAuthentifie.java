package fr.zonumental.compte.session;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/** 401 au format du contrat (corps constant, jamais de détail sur la cause). */
@Component
class NonAuthentifie implements AuthenticationEntryPoint {

  private static final byte[] CORPS =
      ("{\"type\":\"https://zonumental.fr/erreurs/non-authentifie\","
              + "\"title\":\"non-authentifie\",\"status\":401,\"code\":\"non-authentifie\"}")
          .getBytes(StandardCharsets.UTF_8);

  @Override
  public void commence(
      HttpServletRequest requete, HttpServletResponse reponse, AuthenticationException e)
      throws java.io.IOException {
    reponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    reponse.setContentType("application/problem+json");
    reponse.getOutputStream().write(CORPS);
  }
}
