package fr.zonumental.progression;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Succès du joueur connecté uniquement : l'identité vient du jeton, jamais de la requête. */
@RestController
@Tag(name = "progression")
class SuccesController {

  record Obtenu(String code, String libelle, OffsetDateTime obtenuLe) {}

  record EnCours(String code, String libelle, long valeur, int seuil) {}

  record MesSucces(List<Obtenu> obtenus, List<EnCours> enCours) {}

  private final CatalogueSucces catalogue;
  private final CalculSucces calcul;
  private final JdbcClient jdbc;

  SuccesController(CatalogueSucces catalogue, CalculSucces calcul, JdbcClient jdbc) {
    this.catalogue = catalogue;
    this.calcul = calcul;
    this.jdbc = jdbc;
  }

  @GetMapping("/api/progression/succes")
  @Operation(
      operationId = "mesSucces",
      responses = {@ApiResponse(responseCode = "200"), @ApiResponse(responseCode = "401")})
  MesSucces mesSucces(@AuthenticationPrincipal Jwt jwt) {
    UUID moi = UUID.fromString(jwt.getSubject());
    Map<String, OffsetDateTime> dates =
        jdbc
            .sql("select code, obtenu_le from progression.succes_obtenu where utilisateur_id = ?")
            .param(moi)
            .query((r, i) -> Map.entry(r.getString(1), r.getObject(2, OffsetDateTime.class)))
            .list()
            .stream()
            .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    Map<String, Long> valeurs = calcul.valeurs(moi);
    List<Obtenu> obtenus =
        catalogue.succes().stream()
            .filter(s -> dates.containsKey(s.code()))
            .map(s -> new Obtenu(s.code(), s.libelle(), dates.get(s.code())))
            .toList();
    List<EnCours> enCours =
        catalogue.succes().stream()
            .filter(s -> !dates.containsKey(s.code()))
            .map(
                s ->
                    new EnCours(
                        s.code(),
                        s.libelle(),
                        Math.min(valeurs.get(s.code()), s.seuil()),
                        s.seuil()))
            .toList();
    return new MesSucces(obtenus, enCours);
  }
}
