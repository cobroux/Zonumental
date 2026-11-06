package fr.zonumental.catalogue;

import fr.zonumental.commun.ErreurMetier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Lecture du catalogue (RG-022, RG-023) : une stat inconnue reste null, jamais inventée. */
@RestController
@Tag(name = "catalogue")
class MonumentController {

  record Ville(String codeInsee, String nom) {}

  record Position(double latitude, double longitude) {}

  record Image(
      String url,
      String urlCouleur,
      String sourceUrl,
      String licence,
      String licenceUrl,
      String auteur) {}

  record Resume(
      int numero,
      String nom,
      TypeMonument type,
      Ville ville,
      Rarete rarete,
      Position position,
      int rayonCaptureMetres,
      Image image,
      OffsetDateTime captureeLe) {}

  record Stats(Integer annee, String style, BigDecimal hauteurMetres) {}

  record Histoire(String texte, String sourceUrl, String licence) {}

  record Fiche(
      int numero,
      String nom,
      TypeMonument type,
      Ville ville,
      Rarete rarete,
      Position position,
      int rayonCaptureMetres,
      Image image,
      OffsetDateTime captureeLe,
      Integer siecle,
      Stats stats,
      String photoUrl,
      Histoire histoire) {

    Resume versResume() {
      return new Resume(
          numero, nom, type, ville, rarete, position, rayonCaptureMetres, image, captureeLe);
    }
  }

  private static final String SELECT =
      "select m.*, v.nom as ville_nom from catalogue.monument m"
          + " join catalogue.ville v on v.code_insee = m.ville_code_insee";

  private final JdbcClient jdbc;
  private final CapturesExplorateur captures;
  private final Path dossier;

  MonumentController(
      JdbcClient jdbc,
      CapturesExplorateur captures,
      @Value("${zonumental.catalogue.images-dir:images-catalogue}") Path dossier) {
    this.jdbc = jdbc;
    this.captures = captures;
    this.dossier = dossier;
  }

  @GetMapping("/api/catalogue/monuments")
  @Operation(
      operationId = "listerMonuments",
      responses = {@ApiResponse(responseCode = "200"), @ApiResponse(responseCode = "401")})
  List<Resume> lister(@AuthenticationPrincipal Jwt jwt) {
    Map<Integer, OffsetDateTime> dates = dates(jwt);
    return jdbc.sql(SELECT + " order by m.numero")
        .query((r, i) -> fiche(r, dates).versResume())
        .list();
  }

  @GetMapping("/api/catalogue/monuments/{numero}")
  @Operation(
      operationId = "lireMonument",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "401"),
        @ApiResponse(responseCode = "404")
      })
  Fiche lire(@PathVariable int numero, @AuthenticationPrincipal Jwt jwt) {
    Map<Integer, OffsetDateTime> dates = dates(jwt);
    return jdbc.sql(SELECT + " where m.numero = ?")
        .param(numero)
        .query((r, i) -> fiche(r, dates))
        .optional()
        .orElseThrow(() -> new ErreurMetier(HttpStatus.NOT_FOUND, "introuvable"));
  }

  /** Image couleur : seulement pour l'explorateur qui a capturé (RG-054, ADR 0021). */
  @GetMapping("/api/catalogue/monuments/{numero}/image")
  @Operation(
      operationId = "lireImageCouleurMonument",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "401"),
        @ApiResponse(responseCode = "404")
      })
  ResponseEntity<Resource> lireCouleur(@PathVariable int numero, @AuthenticationPrincipal Jwt jwt) {
    String url =
        dates(jwt).containsKey(numero)
            ? jdbc.sql("select image_url from catalogue.monument where numero = ?")
                .param(numero)
                .query(String.class)
                .optional()
                .orElse(null)
            : null;
    // Nom seul, issu de l'import : jamais de chemin venant de l'appelant.
    Path chemin = url == null ? null : dossier.resolve(url.substring(url.lastIndexOf('/') + 1));
    MediaType type =
        chemin == null ? null : ImageController.TYPES.get(url.substring(url.lastIndexOf('.') + 1));
    if (type == null || !Files.isRegularFile(chemin)) {
      throw new ErreurMetier(HttpStatus.NOT_FOUND, "introuvable");
    }
    return ResponseEntity.ok()
        .contentType(type)
        .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
        .body(new FileSystemResource(chemin));
  }

  private Map<Integer, OffsetDateTime> dates(Jwt jwt) {
    return captures.datesDeCapture(UUID.fromString(jwt.getSubject()));
  }

  /** Seul point de construction (fiche et liste) : le verrou RG-054 vit ici. */
  private static Fiche fiche(ResultSet r, Map<Integer, OffsetDateTime> dates) throws SQLException {
    int numero = r.getInt("numero");
    OffsetDateTime captureeLe = dates.get(numero);
    boolean capturee = captureeLe != null;
    String urlImage = r.getString("image_url");
    // Image sans url (licence inconnue, RG-022) : null, le client affiche la silhouette.
    Image image =
        urlImage == null
            ? null
            : new Image(
                "/api/catalogue/images/" + numero + "-nb.jpg",
                capturee ? "/api/catalogue/monuments/" + numero + "/image" : null,
                r.getString("image_source_url"),
                r.getString("image_licence"),
                r.getString("image_licence_url"),
                r.getString("image_auteur"));
    String texte = r.getString("histoire_texte");
    Histoire histoire =
        texte == null || !capturee
            ? null
            : new Histoire(
                texte, r.getString("histoire_source_url"), r.getString("histoire_licence"));
    Integer annee = r.getObject("annee", Integer.class);
    return new Fiche(
        numero,
        r.getString("nom"),
        TypeMonument.valueOf(r.getString("type")),
        new Ville(r.getString("ville_code_insee"), r.getString("ville_nom")),
        Rarete.valueOf(r.getString("rarete")),
        new Position(r.getDouble("latitude"), r.getDouble("longitude")),
        r.getInt("rayon_capture_m"),
        image,
        captureeLe,
        annee == null ? null : siecle(annee),
        capturee ? new Stats(annee, r.getString("style"), r.getBigDecimal("hauteur_m")) : null,
        capturee ? "/api/captures/" + numero + "/photo" : null,
        histoire);
  }

  /** 1675 -> 17 ; -19 -> -1 (av. J.-C.) ; l'année 0 n'existe pas. */
  static int siecle(int annee) {
    return annee > 0 ? (annee - 1) / 100 + 1 : -((-annee - 1) / 100 + 1);
  }
}
