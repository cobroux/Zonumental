package fr.zonumental.progression;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Collections du joueur connecté, calculées à la demande (RG-R2-05 à 08). */
@RestController
@Tag(name = "progression")
class CollectionsController {

  private static final int SEUIL_ENSEMBLE = 3; // RG-R2-07

  record MonumentCollection(int numero, String nom, boolean capture) {}

  record MaCollection(
      String code,
      String nom,
      int total,
      long captures,
      boolean complete,
      List<MonumentCollection> monuments) {}

  private record Mon(int numero, String nom, String type, String insee) {}

  private final CatalogueCollections catalogue;
  private final JdbcClient jdbc;

  CollectionsController(CatalogueCollections catalogue, JdbcClient jdbc) {
    this.catalogue = catalogue;
    this.jdbc = jdbc;
  }

  @GetMapping("/api/progression/collections")
  @Operation(
      operationId = "mesCollections",
      responses = {@ApiResponse(responseCode = "200"), @ApiResponse(responseCode = "401")})
  List<MaCollection> mesCollections(@AuthenticationPrincipal Jwt jwt) {
    UUID moi = UUID.fromString(jwt.getSubject());
    // Lecture directe des schémas catalogue et capture : pas de dépendance Java inter-modules.
    List<Mon> tous =
        jdbc.sql(
                "select numero, nom, type, ville_code_insee from catalogue.monument order by numero")
            .query((r, i) -> new Mon(r.getInt(1), r.getString(2), r.getString(3), r.getString(4)))
            .list();
    Set<Integer> pris =
        Set.copyOf(
            jdbc.sql("select numero_monument from capture.capture where utilisateur_id = ?")
                .param(moi)
                .query(Integer.class)
                .list());
    return catalogue.collections().stream()
        .map(
            c -> {
              List<MonumentCollection> ms =
                  tous.stream()
                      .filter(m -> catalogue.accepte(c, m.type(), m.insee()))
                      .map(
                          m ->
                              new MonumentCollection(
                                  m.numero(), m.nom(), pris.contains(m.numero())))
                      .toList();
              long n = ms.stream().filter(MonumentCollection::capture).count();
              return new MaCollection(c.code(), c.nom(), ms.size(), n, n == ms.size(), ms);
            })
        .filter(c -> c.total() >= SEUIL_ENSEMBLE)
        .toList();
  }
}
