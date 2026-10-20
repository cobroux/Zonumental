package fr.zonumental.compte.session;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

/** Jeton d'accès : JWT HS256 de 15 min, claims sub/iat/exp uniquement (ADR 0004). */
@Component
class JetonsAcces {

  static final Duration DUREE = Duration.ofMinutes(15);

  private final JwtEncoder encodeur;
  private final Clock horloge;

  JetonsAcces(JwtEncoder encodeur, Clock horloge) {
    this.encodeur = encodeur;
    this.horloge = horloge;
  }

  String emettre(UUID utilisateurId) {
    Instant maintenant = horloge.instant();
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .subject(utilisateurId.toString())
            .issuedAt(maintenant)
            .expiresAt(maintenant.plus(DUREE))
            .build();
    return encodeur
        .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
        .getTokenValue();
  }
}
