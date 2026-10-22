package fr.zonumental.catalogue;

import fr.zonumental.commun.ErreurMetier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Lecture du catalogue (RG-022, RG-023) : une stat inconnue reste null, jamais inventée. */
@RestController
@Tag(name = "catalogue")
class MonumentController {

  record Ville(String codeInsee, String nom) {}

  record Position(double latitude, double longitude) {}

  record Image(String url, String sourceUrl, String licence, String licenceUrl, String auteur) {}

  record Resume(
      int numero,
      String nom,
      TypeMonument type,
      Ville ville,
      Rarete rarete,
      Position position,
      int rayonCaptureMetres,
      Image image) {}

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
      Stats stats,
      Histoire histoire) {

    Resume versResume() {
      return new Resume(numero, nom, type, ville, rarete, position, rayonCaptureMetres, image);
    }
  }

  private static final String SELECT =
      "select m.*, v.nom as ville_nom from catalogue.monument m"
          + " join catalogue.ville v on v.code_insee = m.ville_code_insee";

  private final JdbcClient jdbc;

  MonumentController(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping("/api/catalogue/monuments")
  @Operation(
      operationId = "listerMonuments",
      responses = {@ApiResponse(responseCode = "200"), @ApiResponse(responseCode = "401")})
  List<Resume> lister() {
    return jdbc.sql(SELECT + " order by m.numero").query((r, i) -> resume(r)).list();
  }

  @GetMapping("/api/catalogue/monuments/{numero}")
  @Operation(
      operationId = "lireMonument",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "401"),
        @ApiResponse(responseCode = "404")
      })
  Fiche lire(@PathVariable int numero) {
    return jdbc.sql(SELECT + " where m.numero = ?")
        .param(numero)
        .query((r, i) -> fiche(r))
        .optional()
        .orElseThrow(() -> new ErreurMetier(HttpStatus.NOT_FOUND, "introuvable"));
  }

  private static Resume resume(ResultSet r) throws SQLException {
    return fiche(r).versResume();
  }

  private static Fiche fiche(ResultSet r) throws SQLException {
    String urlImage = r.getString("image_url");
    // Image sans url (licence inconnue, RG-022) : null, le client affiche la silhouette.
    Image image =
        urlImage == null
            ? null
            : new Image(
                urlImage,
                r.getString("image_source_url"),
                r.getString("image_licence"),
                r.getString("image_licence_url"),
                r.getString("image_auteur"));
    String texte = r.getString("histoire_texte");
    Histoire histoire =
        texte == null
            ? null
            : new Histoire(
                texte, r.getString("histoire_source_url"), r.getString("histoire_licence"));
    return new Fiche(
        r.getInt("numero"),
        r.getString("nom"),
        TypeMonument.valueOf(r.getString("type")),
        new Ville(r.getString("ville_code_insee"), r.getString("ville_nom")),
        Rarete.valueOf(r.getString("rarete")),
        new Position(r.getDouble("latitude"), r.getDouble("longitude")),
        r.getInt("rayon_capture_m"),
        image,
        new Stats(
            r.getObject("annee", Integer.class),
            r.getString("style"),
            r.getBigDecimal("hauteur_m")),
        histoire);
  }
}
