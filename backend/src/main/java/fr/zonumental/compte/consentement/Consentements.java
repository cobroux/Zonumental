package fr.zonumental.compte.consentement;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Consentements facultatifs : état courant = dernière ligne du journal par type (ADR 0008). */
@Service
public class Consentements {

  record Facultatifs(boolean classement, boolean emails) {}

  private final JdbcClient jdbc;
  private final Clock horloge;
  private final String version;

  Consentements(
      JdbcClient jdbc,
      Clock horloge,
      @Value("${zonumental.legal.version-confidentialite}") String version) {
    this.jdbc = jdbc;
    this.horloge = horloge;
    this.version = version;
  }

  /** Garde RG-012 : à appeler avant tout e-mail non indispensable (pas encore d'usage en R0). */
  public boolean emailsAccordes(UUID utilisateur) {
    return accorde(utilisateur, "EMAILS");
  }

  Facultatifs etat(UUID utilisateur) {
    return new Facultatifs(accorde(utilisateur, "CLASSEMENT"), accorde(utilisateur, "EMAILS"));
  }

  /** N'ajoute une ligne que si la valeur change : effet immédiat, daté, versionné. */
  @Transactional
  Facultatifs modifier(UUID utilisateur, Facultatifs demande) {
    changer(utilisateur, "CLASSEMENT", demande.classement());
    changer(utilisateur, "EMAILS", demande.emails());
    return etat(utilisateur);
  }

  private void changer(UUID utilisateur, String type, boolean valeur) {
    if (accorde(utilisateur, type) == valeur) {
      return;
    }
    jdbc.sql(
            "insert into compte.consentement (utilisateur_id, type, accorde, version_texte,"
                + " horodatage) values (?, ?, ?, ?, ?)")
        .params(utilisateur, type, valeur, version, OffsetDateTime.now(horloge))
        .update();
  }

  private boolean accorde(UUID utilisateur, String type) {
    return jdbc.sql(
            "select accorde from compte.consentement where utilisateur_id = ? and type = ?"
                + " order by horodatage desc, id desc limit 1")
        .params(utilisateur, type)
        .query(Boolean.class)
        .optional()
        .orElse(false);
  }
}
