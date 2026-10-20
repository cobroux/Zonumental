package fr.zonumental.compte.verification;

import fr.zonumental.commun.ErreurMetier;
import fr.zonumental.compte.courriel.Courriels;
import fr.zonumental.compte.jeton.Jetons;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/** r0-socle-7 : confirmation de l'e-mail par jeton et renvoi du lien (RG-007). */
@Service
class Verification {

  private static final Duration ANTI_RAFALE = Duration.ofSeconds(60);
  private static final int TAILLE_MAX_JETON = 100;
  private static final String USAGE = "VERIFICATION_EMAIL";

  private final JdbcClient jdbc;
  private final TransactionTemplate tx;
  private final Jetons jetons;
  private final Courriels courriels;
  private final Clock horloge;
  private final Duration duree;

  Verification(
      JdbcClient jdbc,
      TransactionTemplate tx,
      Jetons jetons,
      Courriels courriels,
      Clock horloge,
      @Value("${zonumental.compte.verification-duree}") Duration duree) {
    this.jdbc = jdbc;
    this.tx = tx;
    this.jetons = jetons;
    this.courriels = courriels;
    this.horloge = horloge;
    this.duree = duree;
  }

  private record Ligne(long id, UUID utilisateurId, OffsetDateTime expireLe, boolean utilise) {}

  void verifier(String jeton) {
    if (jeton == null || jeton.isBlank() || jeton.length() > TAILLE_MAX_JETON) {
      throw erreur(HttpStatus.BAD_REQUEST, "jeton-invalide");
    }
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    tx.executeWithoutResult(
        s -> {
          Ligne l =
              jdbc.sql(
                      "select id, utilisateur_id, expire_le, utilise_le is not null as utilise"
                          + " from compte.jeton where empreinte = ? and usage = ?")
                  .params(Jetons.empreinte(jeton), USAGE)
                  .query(
                      (r, i) ->
                          new Ligne(
                              r.getLong("id"),
                              r.getObject("utilisateur_id", UUID.class),
                              r.getObject("expire_le", OffsetDateTime.class),
                              r.getBoolean("utilise")))
                  .optional()
                  .orElseThrow(() -> erreur(HttpStatus.BAD_REQUEST, "jeton-invalide"));
          if (l.utilise()) {
            throw erreur(HttpStatus.CONFLICT, "jeton-deja-utilise");
          }
          if (!l.expireLe().isAfter(maintenant)) {
            throw erreur(HttpStatus.GONE, "jeton-expire");
          }
          // Le where tranche la course entre deux clics simultanés.
          int pris =
              jdbc.sql("update compte.jeton set utilise_le = ? where id = ? and utilise_le is null")
                  .params(maintenant, l.id())
                  .update();
          if (pris == 0) {
            throw erreur(HttpStatus.CONFLICT, "jeton-deja-utilise");
          }
          jdbc.sql(
                  "update compte.utilisateur set email_verifie_le = coalesce(email_verifie_le, ?)"
                      + " where id = ?")
              .params(maintenant, l.utilisateurId())
              .update();
        });
  }

  /**
   * Toujours muet vers l'appelant : adresse inconnue, déjà vérifiée ou trop tôt = rien (RG-004).
   */
  void renvoyer(String email) {
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    // Verrou sur l'utilisateur : deux renvois simultanés ne produisent qu'un jeton.
    String jeton =
        tx.execute(
            s ->
                jdbc.sql(
                        "select id from compte.utilisateur where email = ?"
                            + " and email_verifie_le is null for update")
                    .param(email)
                    .query(UUID.class)
                    .optional()
                    .filter(id -> !recent(id, maintenant))
                    .map(id -> remplacer(id, maintenant))
                    .orElse(null));
    // Après commit (ADR 0005).
    if (jeton != null) {
      courriels.verification(email, jeton);
    }
  }

  private boolean recent(UUID id, OffsetDateTime maintenant) {
    return jdbc.sql(
            "select exists (select 1 from compte.jeton where utilisateur_id = ? and usage = ?"
                + " and cree_le > ?)")
        .params(id, USAGE, maintenant.minus(ANTI_RAFALE))
        .query(Boolean.class)
        .single();
  }

  private String remplacer(UUID id, OffsetDateTime maintenant) {
    jdbc.sql(
            "delete from compte.jeton where utilisateur_id = ? and usage = ? and utilise_le is null")
        .params(id, USAGE)
        .update();
    return jetons.emettre(id, USAGE, maintenant, duree);
  }

  private static ErreurMetier erreur(HttpStatus statut, String code) {
    return new ErreurMetier(statut, code);
  }
}
