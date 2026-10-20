package fr.zonumental.compte.session;

import fr.zonumental.commun.ErreurMetier;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * r0-socle-9 : compteur d'échecs de connexion par e-mail normalisé, connu ou non (RG-009). Clé =
 * HMAC-SHA256 de l'e-mail : aucune adresse en clair.
 */
@Component
class TentativesConnexion {

  private final JdbcClient jdbc;
  private final Clock horloge;
  private final SecretKeySpec cle;
  private final int echecsMax;
  private final Duration blocage;

  TentativesConnexion(
      JdbcClient jdbc,
      Clock horloge,
      @Value("${zonumental.hmac.secret}") String secret,
      @Value("${zonumental.compte.connexion-echecs-max}") int echecsMax,
      @Value("${zonumental.compte.connexion-blocage-duree}") Duration blocage) {
    byte[] octets = Base64.getDecoder().decode(secret.strip());
    if (octets.length < 32) {
      throw new IllegalStateException("ZONUMENTAL_HMAC_SECRET : 32 octets minimum");
    }
    this.jdbc = jdbc;
    this.horloge = horloge;
    this.cle = new SecretKeySpec(octets, "HmacSHA256");
    this.echecsMax = echecsMax;
    this.blocage = blocage;
  }

  /** 429 avec {@code Retry-After} (secondes) si l'e-mail est bloqué. */
  void verifierNonBloque(String email) {
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    jdbc.sql(
            "select bloque_jusqu_au from compte.tentative_connexion"
                + " where empreinte_email = ? and bloque_jusqu_au > ?")
        .params(empreinte(email), maintenant)
        .query(OffsetDateTime.class)
        .optional()
        .ifPresent(
            fin -> {
              long secondes =
                  Math.max(1, (long) Math.ceil(maintenant.until(fin, ChronoUnit.MILLIS) / 1000.0));
              throw new ErreurMetier(
                  HttpStatus.TOO_MANY_REQUESTS,
                  "connexion-bloquee",
                  Map.of(),
                  Map.of("Retry-After", Long.toString(secondes)));
            });
  }

  /** Incrément atomique ; au dernier échec permis, blocage et compteur remis à zéro. */
  void echec(String email) {
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    jdbc.sql(
            "insert into compte.tentative_connexion as t (empreinte_email, echecs,"
                + " bloque_jusqu_au, derniere_tentative_le) values (:cle, 1, null, :maintenant)"
                + " on conflict (empreinte_email) do update set"
                + " echecs = case when t.echecs + 1 >= :max then 0 else t.echecs + 1 end,"
                + " bloque_jusqu_au = case when t.echecs + 1 >= :max then :fin else null end,"
                + " derniere_tentative_le = :maintenant")
        .param("cle", empreinte(email))
        .param("maintenant", maintenant)
        .param("max", echecsMax)
        .param("fin", maintenant.plus(blocage))
        .update();
  }

  void reinitialiser(String email) {
    jdbc.sql("delete from compte.tentative_connexion where empreinte_email = ?")
        .param(empreinte(email))
        .update();
  }

  private byte[] empreinte(String email) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(cle);
      return mac.doFinal(email.getBytes(StandardCharsets.UTF_8));
    } catch (java.security.GeneralSecurityException e) {
      throw new IllegalStateException(e);
    }
  }
}
