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
  private final TentativesConnexion tentatives;
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
      TentativesConnexion tentatives,
      TransactionTemplate tx,
      PasswordEncoder motsDePasse,
      JetonsAcces jetonsAcces,
      Clock horloge,
      @Value("${zonumental.compte.session-duree}") Duration dureeSession,
      @Value("${zonumental.compte.suppression-delai}") Duration delaiSuppression) {
    this.jdbc = jdbc;
    this.tentatives = tentatives;
    this.tx = tx;
    this.motsDePasse = motsDePasse;
    this.jetonsAcces = jetonsAcces;
    this.horloge = horloge;
    this.dureeSession = dureeSession;
    this.delaiSuppression = delaiSuppression;
    this.hashFactice = motsDePasse.encode(Jetons.aleatoire());
  }

  Ouverte connecter(DemandeConnexion demande) {
    tentatives.verifierNonBloque(demande.email());
    Compte compte = verifierIdentifiants(demande);
    // Même si le compte est en suppression : les identifiants étaient bons.
    tentatives.reinitialiser(demande.email());
    if (compte.suppressionDemandeeLe() != null) {
      OffsetDateTime fin = compte.suppressionDemandeeLe().plus(delaiSuppression);
      // Délai écoulé, purge pas encore passée : le compte n'est plus annulable.
      if (!fin.isAfter(OffsetDateTime.now(horloge))) {
        throw new ErreurMetier(HttpStatus.UNAUTHORIZED, "identifiants-invalides");
      }
      throw new ErreurMetier(
          HttpStatus.CONFLICT, "suppression-en-cours", Map.of("suppressionDefinitiveLe", fin));
    }
    return ouvrir(compte.id());
  }

  /**
   * Q-9 : bons identifiants pendant le délai = suppression annulée puis connexion. Même compteur
   * d'échecs que la connexion. Un compte non en suppression est simplement connecté.
   */
  Ouverte annulerSuppression(DemandeConnexion demande) {
    tentatives.verifierNonBloque(demande.email());
    Compte compte = verifierIdentifiants(demande);
    tentatives.reinitialiser(demande.email());
    if (compte.suppressionDemandeeLe() != null) {
      OffsetDateTime maintenant = OffsetDateTime.now(horloge);
      // Le where écarte le délai écoulé (purge pas encore passée) et le compte déjà purgé.
      int annule =
          jdbc.sql(
                  "update compte.utilisateur set suppression_demandee_le = null where id = ?"
                      + " and suppression_demandee_le > ?")
              .params(compte.id(), maintenant.minus(delaiSuppression))
              .update();
      if (annule == 0) {
        throw new ErreurMetier(HttpStatus.UNAUTHORIZED, "identifiants-invalides");
      }
    }
    return ouvrir(compte.id());
  }

  private Ouverte ouvrir(UUID utilisateurId) {
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    String cookie = Jetons.aleatoire();
    tx.executeWithoutResult(
        s -> {
          jdbc.sql(
                  "insert into compte.session (utilisateur_id, empreinte, cree_le, expire_le)"
                      + " values (?, ?, ?, ?)")
              .params(
                  utilisateurId,
                  Jetons.empreinte(cookie),
                  maintenant,
                  maintenant.plus(dureeSession))
              .update();
          jdbc.sql("update compte.utilisateur set derniere_activite_le = ? where id = ?")
              .params(maintenant, utilisateurId)
              .update();
        });
    return new Ouverte(
        jetonsAcces.emettre(utilisateurId), CookieSession.poser(cookie, dureeSession));
  }

  /**
   * Session valide (non expirée, compte actif) : expiration repoussée à +30 j, même cookie (ADR
   * 0004, pas de rotation). Vide si le cookie ne mène à rien.
   */
  Optional<Ouverte> renouveler(String cookie) {
    if (cookie == null || cookie.isBlank() || cookie.length() > 100) {
      return Optional.empty();
    }
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    byte[] empreinte = Jetons.empreinte(cookie);
    return tx.execute(
        s -> {
          Optional<UUID> id =
              jdbc.sql(
                      "update compte.session set expire_le = ? where empreinte = ? and expire_le > ?"
                          + " and exists (select 1 from compte.utilisateur u where u.id ="
                          + " utilisateur_id and u.suppression_demandee_le is null)"
                          + " returning utilisateur_id")
                  .params(maintenant.plus(dureeSession), empreinte, maintenant)
                  .query(UUID.class)
                  .optional();
          id.ifPresent(
              u ->
                  jdbc.sql(
                          "update compte.utilisateur set derniere_activite_le = ? where id = ?"
                              + " and derniere_activite_le < ?")
                      .params(maintenant, u, maintenant.minusDays(1))
                      .update());
          return id.map(
              u -> new Ouverte(jetonsAcces.emettre(u), CookieSession.poser(cookie, dureeSession)));
        });
  }

  /** Idempotent : sans cookie ou session inconnue, rien à faire. */
  void deconnecter(String cookie) {
    if (cookie != null && !cookie.isBlank() && cookie.length() <= 100) {
      jdbc.sql("delete from compte.session where empreinte = ?")
          .param(Jetons.empreinte(cookie))
          .update();
    }
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
      tentatives.echec(demande.email());
      throw new ErreurMetier(HttpStatus.UNAUTHORIZED, "identifiants-invalides");
    }
    return compte.get();
  }
}
