package fr.zonumental.compte.export;

import fr.zonumental.commun.ErreurMetier;
import fr.zonumental.compte.CapturesExportables;
import java.io.IOException;
import java.io.OutputStream;
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
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;

/**
 * Export RGPD (RG-013) : zip {@code donnees.json}. Pas de mot de passe ni de position (RG-006,
 * RG-036). Captures dans {@code donnees.json}, photos dans {@code photos/<numero>.jpg}. Le zip est
 * écrit en flux : une seule photo en mémoire à la fois.
 */
@Service
class Export {

  record Archive(String nom, StreamingResponseBody contenu) {}

  record Compte(
      String pseudo,
      String email,
      LocalDate dateNaissance,
      OffsetDateTime emailVerifieLe,
      OffsetDateTime creeLe) {}

  record Consentement(
      String type, boolean accorde, String versionTexte, OffsetDateTime horodatage) {}

  record Capture(
      int numero, String nom, OffsetDateTime captureeLe, long distanceMetres, String photo) {}

  record Donnees(
      OffsetDateTime exporteLe,
      Compte compte,
      List<Consentement> consentements,
      List<Capture> captures) {}

  private final JdbcClient jdbc;
  private final Clock horloge;
  private final CapturesExportables sourceCaptures;
  private final ObjectMapper json =
      new ObjectMapper().rebuild().enable(SerializationFeature.INDENT_OUTPUT).build();

  Export(JdbcClient jdbc, Clock horloge, CapturesExportables sourceCaptures) {
    this.jdbc = jdbc;
    this.horloge = horloge;
    this.sourceCaptures = sourceCaptures;
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
    List<Capture> captures =
        sourceCaptures.captures(utilisateur).stream()
            .map(
                c ->
                    new Capture(
                        c.numero(),
                        c.nom(),
                        c.captureeLe(),
                        c.distanceMetres(),
                        "photos/" + c.numero() + ".jpg"))
            .toList();
    var donnees = new Donnees(maintenant, compte, consentements, captures);
    return new Archive(
        "zonumental-export-" + maintenant.toLocalDate() + ".zip",
        sortie -> ecrire(sortie, utilisateur, donnees));
  }

  private void ecrire(OutputStream sortie, UUID utilisateur, Donnees donnees) throws IOException {
    var zip = new ZipOutputStream(sortie);
    zip.putNextEntry(new ZipEntry("donnees.json"));
    zip.write(json.writeValueAsBytes(donnees));
    zip.closeEntry();
    for (Capture c : donnees.captures()) {
      // Photo absente : on échoue (zip tronqué) plutôt que d'exporter sans le dire.
      byte[] photo =
          sourceCaptures
              .photo(utilisateur, c.numero())
              .orElseThrow(() -> new IllegalStateException("photo introuvable : " + c.numero()));
      zip.putNextEntry(new ZipEntry(c.photo()));
      zip.write(photo);
      zip.closeEntry();
    }
    zip.finish();
  }
}
