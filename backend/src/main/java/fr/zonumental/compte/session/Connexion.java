package fr.zonumental.compte.session;

import fr.zonumental.commun.ErreurMetier;
import fr.zonumental.compte.jeton.Jetons;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/** r0-socle-8 : connexion par e-mail et mot de passe, création de la session (RG-008, RG-010). */
@Service
class Connexion {

  /** Cookie à poser et jeton d'accès à renvoyer. */
  record Ouverte(String jetonAcces, String cookie) {}

  private record Compte(UUID id, String hash, OffsetDateTime suppressionDemandeeLe) {}

  private final JdbcClient jdbc;
  private final TransactionTemplate tx;
  private final PasswordEncoder motsDePasse;
  private final JetonsAcces jetonsAcces;
  private final Clock horloge;
  private final Duration dureeSession;
  private final Duration delaiSuppression;
  // Calculé une fois : un e-mail inconnu coûte autant qu'un mot de passe faux (ADR 0004).
  private final String hashFactice;

  Connexion(
      JdbcClient jdbc,
      TransactionTemplate tx,
      PasswordEncoder motsDePasse,
      JetonsAcces jetonsAcces,
      Clock horloge,
      @Value("${zonumental.compte.session-duree}") Duration dureeSession,
      @Value("${zonumental.compte.suppression-delai}") Duration delaiSuppression) {
    this.jdbc = jdbc;
    this.tx = tx;
    this.motsDePasse = motsDePasse;
    this.jetonsAcces = jetonsAcces;
    this.horloge = horloge;
    this.dureeSession = dureeSession;
    this.delaiSuppression = delaiSuppression;
    this.hashFactice = motsDePasse.encode(Jetons.aleatoire());
  }

  Ouverte connecter(DemandeConnexion demande) {
    // r0-socle-9 : point d'accroche « bloqué ? » (429), avant Argon2.
    Compte compte = verifierIdentifiants(demande);
    // r0-socle-9 : point d'accroche « réussite », même si le compte est en suppression.
    if (compte.suppressionDemandeeLe() != null) {
      throw new ErreurMetier(
          HttpStatus.CONFLICT,
          "suppression-en-cours",
          Map.of("suppressionDefinitiveLe", compte.suppressionDemandeeLe().plus(delaiSuppression)));
    }
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    String cookie = Jetons.aleatoire();
    tx.executeWithoutResult(
        s -> {
          jdbc.sql(
                  "insert into compte.session (utilisateur_id, empreinte, cree_le, expire_le)"
                      + " values (?, ?, ?, ?)")
              .params(
                  compte.id(), Jetons.empreinte(cookie), maintenant, maintenant.plus(dureeSession))
              .update();
          jdbc.sql("update compte.utilisateur set derniere_activite_le = ? where id = ?")
              .params(maintenant, compte.id())
              .update();
        });
    return new Ouverte(jetonsAcces.emettre(compte.id()), CookieSession.poser(cookie, dureeSession));
  }

  /** E-mail inconnu ou mot de passe faux : même erreur, même coût de calcul. */
  private Compte verifierIdentifiants(DemandeConnexion demande) {
    Optional<Compte> compte =
        jdbc.sql(
                "select id, mot_de_passe_hash, suppression_demandee_le from compte.utilisateur"
                    + " where email = ?")
            .param(demande.email())
            .query(
                (r, i) ->
                    new Compte(
                        r.getObject("id", UUID.class),
                        r.getString("mot_de_passe_hash"),
                        r.getObject("suppression_demandee_le", OffsetDateTime.class)))
            .optional();
    boolean ok =
        motsDePasse.matches(demande.motDePasse(), compte.map(Compte::hash).orElse(hashFactice));
    if (compte.isEmpty() || !ok) {
      // r0-socle-9 : point d'accroche « échec ».
      throw new ErreurMetier(HttpStatus.UNAUTHORIZED, "identifiants-invalides");
    }
    return compte.get();
  }
}
