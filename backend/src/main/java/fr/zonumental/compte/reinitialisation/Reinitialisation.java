package fr.zonumental.compte.reinitialisation;

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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/** r0-socle-10 : mot de passe oublié et réinitialisation (RG-011, RG-006, RG-010). */
@Service
class Reinitialisation {

  private static final int TAILLE_MAX_JETON = 100;
  private static final String USAGE = "REINITIALISATION_MDP";

  private final JdbcClient jdbc;
  private final TransactionTemplate tx;
  private final Jetons jetons;
  private final Courriels courriels;
  private final PasswordEncoder motsDePasse;
  private final Clock horloge;
  private final Duration duree;

  Reinitialisation(
      JdbcClient jdbc,
      TransactionTemplate tx,
      Jetons jetons,
      Courriels courriels,
      PasswordEncoder motsDePasse,
      Clock horloge,
      @Value("${zonumental.compte.reinitialisation-duree}") Duration duree) {
    this.jdbc = jdbc;
    this.tx = tx;
    this.jetons = jetons;
    this.courriels = courriels;
    this.motsDePasse = motsDePasse;
    this.horloge = horloge;
    this.duree = duree;
  }

  private record Ligne(long id, UUID utilisateurId, OffsetDateTime expireLe, boolean utilise) {}

  /** Toujours muet vers l'appelant : adresse inconnue = rien (anti-énumération). */
  void demander(String email) {
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    // Verrou sur l'utilisateur : deux demandes simultanées ne laissent qu'un lien valide.
    String jeton =
        tx.execute(
            s ->
                jdbc.sql("select id from compte.utilisateur where email = ? for update")
                    .param(email)
                    .query(UUID.class)
                    .optional()
                    .map(
                        id -> {
                          jdbc.sql(
                                  "delete from compte.jeton where utilisateur_id = ? and usage = ?"
                                      + " and utilise_le is null")
                              .params(id, USAGE)
                              .update();
                          return jetons.emettre(id, USAGE, maintenant, duree);
                        })
                    .orElse(null));
    // Après commit (ADR 0005).
    if (jeton != null) {
      courriels.reinitialisation(email, jeton);
    }
  }

  void reinitialiser(String jeton, String nouveauMotDePasse) {
    if (jeton == null || jeton.isBlank() || jeton.length() > TAILLE_MAX_JETON) {
      throw new ErreurMetier(HttpStatus.BAD_REQUEST, "jeton-invalide");
    }
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    String hash = motsDePasse.encode(nouveauMotDePasse);
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
                  .orElseThrow(() -> new ErreurMetier(HttpStatus.BAD_REQUEST, "jeton-invalide"));
          if (l.utilise()) {
            throw new ErreurMetier(HttpStatus.CONFLICT, "jeton-deja-utilise");
          }
          if (!l.expireLe().isAfter(maintenant)) {
            throw new ErreurMetier(HttpStatus.GONE, "jeton-expire");
          }
          // Le where tranche la course entre deux envois simultanés.
          int pris =
              jdbc.sql("update compte.jeton set utilise_le = ? where id = ? and utilise_le is null")
                  .params(maintenant, l.id())
                  .update();
          if (pris == 0) {
            throw new ErreurMetier(HttpStatus.CONFLICT, "jeton-deja-utilise");
          }
          jdbc.sql("update compte.utilisateur set mot_de_passe_hash = ? where id = ?")
              .params(hash, l.utilisateurId())
              .update();
          jdbc.sql("delete from compte.session where utilisateur_id = ?")
              .param(l.utilisateurId())
              .update();
        });
  }
}
