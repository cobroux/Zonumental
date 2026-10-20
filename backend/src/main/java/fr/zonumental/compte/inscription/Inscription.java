package fr.zonumental.compte.inscription;

import fr.zonumental.commun.ErreurMetier;
import fr.zonumental.compte.courriel.Courriels;
import fr.zonumental.compte.jeton.Jetons;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/** r0-socle-6 : création du compte, ou e-mail « déjà un carnet » si l'adresse existe (RG-004). */
@Service
class Inscription {

  private static final int AGE_MINIMUM = 15;

  private final JdbcClient jdbc;
  private final TransactionTemplate tx;
  private final PasswordEncoder motsDePasse;
  private final Courriels courriels;
  private final Jetons jetons;
  private final Clock horloge;
  private final String versionCgu;
  private final String versionConfidentialite;
  private final Duration dureeVerification;

  Inscription(
      JdbcClient jdbc,
      TransactionTemplate tx,
      PasswordEncoder motsDePasse,
      Courriels courriels,
      Jetons jetons,
      Clock horloge,
      @Value("${zonumental.legal.version-cgu}") String versionCgu,
      @Value("${zonumental.legal.version-confidentialite}") String versionConfidentialite,
      @Value("${zonumental.compte.verification-duree}") Duration dureeVerification) {
    this.jdbc = jdbc;
    this.tx = tx;
    this.motsDePasse = motsDePasse;
    this.courriels = courriels;
    this.jetons = jetons;
    this.horloge = horloge;
    this.versionCgu = versionCgu;
    this.versionConfidentialite = versionConfidentialite;
    this.dureeVerification = dureeVerification;
  }

  void inscrire(DemandeInscription d) {
    var c = d.consentements();
    // Refus : on sort avant toute écriture, rien n'est conservé (RG-002, RG-003).
    if (!ageAtteint(d.dateNaissance(), LocalDate.now(horloge))) {
      throw new ErreurMetier(HttpStatus.UNPROCESSABLE_ENTITY, "age-minimum");
    }
    if (!c.cgu() || !c.confidentialite()) {
      throw new ErreurMetier(HttpStatus.UNPROCESSABLE_ENTITY, "consentement-obligatoire");
    }
    if (!versionCgu.equals(c.versionCgu())
        || !versionConfidentialite.equals(c.versionConfidentialite())) {
      throw new ErreurMetier(HttpStatus.CONFLICT, "version-texte-obsolete");
    }
    // Le pseudo est public : son conflit est signalé, il ne révèle aucun compte (RG-005).
    if (existe("lower(pseudo) = lower(?)", d.pseudo())) {
      throw pseudoPris();
    }
    // Haché dans les deux cas pour que le temps de réponse ne révèle pas l'existence (RG-004).
    String hash = motsDePasse.encode(d.motDePasse());
    String jeton = null;
    try {
      jeton = existe("email = ?", d.email()) ? null : tx.execute(s -> creer(d, hash));
    } catch (DataIntegrityViolationException e) {
      // Course : la contrainte unique tranche. E-mail déjà pris entre-temps = cas générique.
      if (existe("lower(pseudo) = lower(?)", d.pseudo())) {
        throw pseudoPris();
      }
    }
    // Après commit : un e-mail ne part jamais pour une transaction annulée (ADR 0005).
    if (jeton != null) {
      courriels.verification(d.email(), jeton);
    } else {
      courriels.dejaInscrit(d.email());
    }
  }

  static boolean ageAtteint(LocalDate naissance, LocalDate aujourdhui) {
    return !naissance.plusYears(AGE_MINIMUM).isAfter(aujourdhui);
  }

  private static ErreurMetier pseudoPris() {
    return new ErreurMetier(HttpStatus.CONFLICT, "pseudo-deja-pris");
  }

  private boolean existe(String condition, String valeur) {
    return jdbc.sql("select exists (select 1 from compte.utilisateur where " + condition + ")")
        .param(valeur)
        .query(Boolean.class)
        .single();
  }

  /** Utilisateur, 4 consentements et jeton de vérification ; renvoie le jeton en clair. */
  private String creer(DemandeInscription d, String hash) {
    var c = d.consentements();
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    UUID id = UUID.randomUUID();
    jdbc.sql(
            "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
                + " cree_le, derniere_activite_le) values (?, ?, ?, ?, ?, ?, ?)")
        .params(id, d.email(), d.pseudo(), hash, d.dateNaissance(), maintenant, maintenant)
        .update();
    // Les consentements facultatifs sont versionnés avec la politique de confidentialité (ADR
    // 0008).
    consentement(id, "CGU", true, versionCgu, maintenant);
    consentement(id, "CONFIDENTIALITE", true, versionConfidentialite, maintenant);
    consentement(id, "CLASSEMENT", c.classement(), versionConfidentialite, maintenant);
    consentement(id, "EMAILS", c.emails(), versionConfidentialite, maintenant);

    return jetons.emettre(id, "VERIFICATION_EMAIL", maintenant, dureeVerification);
  }

  private void consentement(
      UUID id, String type, boolean accorde, String version, OffsetDateTime t) {
    jdbc.sql(
            "insert into compte.consentement (utilisateur_id, type, accorde, version_texte,"
                + " horodatage) values (?, ?, ?, ?, ?)")
        .params(id, type, accorde, version, t)
        .update();
  }
}
