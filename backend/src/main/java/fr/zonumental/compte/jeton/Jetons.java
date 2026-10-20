package fr.zonumental.compte.jeton;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Émission des jetons à usage unique : 256 bits aléatoires, seule l'empreinte SHA-256 est stockée.
 */
@Component
public class Jetons {

  private static final SecureRandom ALEA = new SecureRandom();

  private final JdbcClient jdbc;

  Jetons(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** À appeler dans la transaction de l'appelant ; renvoie le jeton en clair. */
  public String emettre(
      UUID utilisateurId, String usage, OffsetDateTime maintenant, Duration duree) {
    byte[] octets = new byte[32];
    ALEA.nextBytes(octets);
    String jeton = Base64.getUrlEncoder().withoutPadding().encodeToString(octets);
    jdbc.sql(
            "insert into compte.jeton (utilisateur_id, usage, empreinte, cree_le, expire_le)"
                + " values (?, ?, ?, ?, ?)")
        .params(utilisateurId, usage, empreinte(jeton), maintenant, maintenant.plus(duree))
        .update();
    return jeton;
  }

  public static byte[] empreinte(String jeton) {
    try {
      return MessageDigest.getInstance("SHA-256").digest(jeton.getBytes(StandardCharsets.UTF_8));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
