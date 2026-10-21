package fr.zonumental.compte.export;

import fr.zonumental.commun.ErreurMetier;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;

/**
 * Export RGPD (RG-013) : zip {@code donnees.json}. Pas de mot de passe ni de position (RG-006,
 * RG-036). Les photos iront dans {@code photos/<numero>.webp} quand les captures existeront (R1) :
 * {@code captures} est vide en R0.
 */
@Service
class Export {

  record Archive(String nom, byte[] contenu) {}

  record Compte(
      String pseudo,
      String email,
      LocalDate dateNaissance,
      OffsetDateTime emailVerifieLe,
      OffsetDateTime creeLe) {}

  record Consentement(
      String type, boolean accorde, String versionTexte, OffsetDateTime horodatage) {}

  record Donnees(
      OffsetDateTime exporteLe,
      Compte compte,
      List<Consentement> consentements,
      List<Object> captures) {}

  private final JdbcClient jdbc;
  private final Clock horloge;
  private final ObjectMapper json =
      new ObjectMapper().rebuild().enable(SerializationFeature.INDENT_OUTPUT).build();

  Export(JdbcClient jdbc, Clock horloge) {
    this.jdbc = jdbc;
    this.horloge = horloge;
  }

  Archive archive(UUID utilisateur) {
    Compte compte =
        jdbc.sql(
                "select pseudo, email, date_naissance, email_verifie_le, cree_le"
                    + " from compte.utilisateur where id = ?")
            .param(utilisateur)
            .query(
                (r, i) ->
                    new Compte(
                        r.getString("pseudo"),
                        r.getString("email"),
                        r.getObject("date_naissance", LocalDate.class),
                        r.getObject("email_verifie_le", OffsetDateTime.class),
                        r.getObject("cree_le", OffsetDateTime.class)))
            .optional()
            .orElseThrow(() -> new ErreurMetier(HttpStatus.UNAUTHORIZED, "non-authentifie"));
    List<Consentement> consentements =
        jdbc.sql(
                "select type, accorde, version_texte, horodatage from compte.consentement"
                    + " where utilisateur_id = ? order by horodatage, id")
            .param(utilisateur)
            .query(
                (r, i) ->
                    new Consentement(
                        r.getString("type"),
                        r.getBoolean("accorde"),
                        r.getString("version_texte"),
                        r.getObject("horodatage", OffsetDateTime.class)))
            .list();
    OffsetDateTime maintenant = OffsetDateTime.now(horloge);
    var donnees = new Donnees(maintenant, compte, consentements, List.of());
    try (var sortie = new ByteArrayOutputStream();
        var zip = new ZipOutputStream(sortie)) {
      zip.putNextEntry(new ZipEntry("donnees.json"));
      zip.write(json.writeValueAsBytes(donnees));
      zip.closeEntry();
      zip.finish();
      return new Archive(
          "zonumental-export-" + maintenant.toLocalDate() + ".zip", sortie.toByteArray());
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}
