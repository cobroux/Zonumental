package fr.zonumental.competition.classement;

import fr.zonumental.commun.ErreurMetier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Compteur de lancement du classement d'une ville, dérivé des captures (ADR 0024) : seuls un
 * compteur et l'état de l'appelant sont exposés, jamais d'identité ni de position (RG-036).
 */
@RestController
@Tag(name = "competition")
class LancementClassementController {

  static final int SEUIL = 50;
  private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

  record Ville(String codeInsee, String nom) {}

  record Moi(int tampons) {}

  record Reponse(
      Ville ville,
      int seuil,
      int explorateurs,
      boolean ouvert,
      boolean consentementClassement,
      Moi moi) {}

  private final JdbcClient jdbc;
  private final Clock horloge;

  LancementClassementController(JdbcClient jdbc, Clock horloge) {
    this.jdbc = jdbc;
    this.horloge = horloge;
  }

  @GetMapping("/api/classement/villes/{codeInsee}/lancement")
  @Operation(
      operationId = "lancementClassementVille",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "401"),
        @ApiResponse(responseCode = "404")
      })
  Reponse lancement(@PathVariable String codeInsee, @AuthenticationPrincipal Jwt jwt) {
    UUID moi = UUID.fromString(jwt.getSubject());
    Ville ville =
        jdbc.sql("select code_insee, nom from catalogue.ville where code_insee = :c")
            .param("c", codeInsee)
            .query((r, i) -> new Ville(r.getString(1), r.getString(2)))
            .optional()
            .orElseThrow(() -> new ErreurMetier(HttpStatus.NOT_FOUND, "introuvable"));
    // Dernier consentement CLASSEMENT accordé (journal en ajout seul, ADR 0008).
    String classable =
        "(select c.accorde from compte.consentement c where c.utilisateur_id = u.id"
            + " and c.type = 'CLASSEMENT' order by c.horodatage desc, c.id desc limit 1)";
    int explorateurs =
        jdbc.sql(
                "select count(*) from compte.utilisateur u where u.email_verifie_le is not null"
                    + " and u.suppression_demandee_le is null and coalesce("
                    + classable
                    + ", false) and exists (select 1 from capture.capture c"
                    + " join catalogue.monument m on m.numero = c.numero_monument"
                    + " where c.utilisateur_id = u.id and m.ville_code_insee = :c)")
            .param("c", codeInsee)
            .query(Integer.class)
            .single();
    boolean consentement =
        jdbc.sql(
                "select coalesce("
                    + classable
                    + ", false) from compte.utilisateur u"
                    + " where u.id = :moi")
            .param("moi", moi)
            .query(Boolean.class)
            .optional()
            .orElse(false);
    LocalDate lundi =
        LocalDate.now(horloge.withZone(PARIS))
            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    int tampons =
        jdbc.sql(
                "select count(*) from capture.capture where utilisateur_id = :moi"
                    + " and capturee_le >= :debut")
            .param("moi", moi)
            .param("debut", Timestamp.from(lundi.atStartOfDay(PARIS).toInstant()))
            .query(Integer.class)
            .single();
    int compte = Math.min(explorateurs, SEUIL);
    return new Reponse(ville, SEUIL, compte, compte >= SEUIL, consentement, new Moi(tampons));
  }
}
