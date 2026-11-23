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
  private final OuvertureClassement ouverture;

  LancementClassementController(JdbcClient jdbc, Clock horloge, OuvertureClassement ouverture) {
    this.ouverture = ouverture;
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
    int explorateurs = ouverture.explorateurs(codeInsee);
    boolean consentement =
        jdbc.sql(
                "select coalesce((select c.accorde from compte.consentement c"
                    + " where c.utilisateur_id = :moi and c.type = 'CLASSEMENT'"
                    + " order by c.horodatage desc, c.id desc limit 1), false)")
            .param("moi", moi)
            .query(Boolean.class)
            .single();
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
    int seuil = ouverture.seuil();
    return new Reponse(
        ville,
        seuil,
        Math.min(explorateurs, seuil),
        ouverture.ouverte(codeInsee, explorateurs),
        consentement,
        new Moi(tampons));
  }
}
