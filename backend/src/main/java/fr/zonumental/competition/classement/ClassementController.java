package fr.zonumental.competition.classement;

import fr.zonumental.commun.ErreurMetier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Classement hebdomadaire d'une ville ou de la France, calculé à la lecture (ADR 0024 §5 à §7) :
 * seuls pseudo, rang, score, tendance et indicateur {@code moi} sont exposés.
 */
@RestController
@Tag(name = "competition")
class ClassementController {

  private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

  record Ville(String codeInsee, String nom) {}

  record Ligne(Integer rang, String pseudo, int score, Integer tendance, boolean moi) {}

  record Reponse(
      String portee,
      Ville ville,
      Instant semaineDebutLe,
      boolean ouvert,
      List<Ligne> podium,
      List<Ligne> autourDeMoi) {}

  private final JdbcClient jdbc;
  private final Clock horloge;
  private final OuvertureClassement ouverture;

  ClassementController(JdbcClient jdbc, Clock horloge, OuvertureClassement ouverture) {
    this.jdbc = jdbc;
    this.horloge = horloge;
    this.ouverture = ouverture;
  }

  /**
   * Scores des comptes classables sur [debut, fin), rangés (égalité : dernière capture la plus
   * ancienne).
   */
  private static String rangs(String debut, String fin) {
    return "select u.id, u.pseudo, s.score, row_number() over (order by s.score desc,"
        + " s.derniere asc, u.id) rang from compte.utilisateur u join (select c.utilisateur_id,"
        + " count(*) score, max(c.capturee_le) derniere from capture.capture c"
        + " join catalogue.monument m on m.numero = c.numero_monument"
        + " where c.capturee_le >= :"
        + debut
        + " and c.capturee_le < :"
        + fin
        + " and (cast(:ville as text) is null or m.ville_code_insee = :ville)"
        + " group by c.utilisateur_id) s on s.utilisateur_id = u.id where "
        + OuvertureClassement.CLASSABLE;
  }

  @GetMapping("/api/classement")
  @Operation(
      operationId = "classement",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "400"),
        @ApiResponse(responseCode = "401"),
        @ApiResponse(responseCode = "404")
      })
  Reponse classement(
      @RequestParam String portee,
      @RequestParam(required = false) String ville,
      @AuthenticationPrincipal Jwt jwt) {
    UUID moi = UUID.fromString(jwt.getSubject());
    boolean france = portee.equals("FRANCE");
    if (!france && !portee.equals("VILLE") || !france && (ville == null || ville.isBlank())) {
      throw new ErreurMetier(HttpStatus.BAD_REQUEST, "validation");
    }
    Ville v =
        france
            ? null
            : jdbc.sql("select code_insee, nom from catalogue.ville where code_insee = :c")
                .param("c", ville)
                .query((r, i) -> new Ville(r.getString(1), r.getString(2)))
                .optional()
                .orElseThrow(() -> new ErreurMetier(HttpStatus.NOT_FOUND, "introuvable"));
    String insee = france ? null : ville;

    ZoneId paris = PARIS;
    Instant debut =
        LocalDate.now(horloge.withZone(paris))
            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            .atStartOfDay(paris)
            .toInstant();
    // Semaines de 7 jours civils à Paris (23 h ou 25 h au changement d'heure).
    Instant fin = debut.atZone(paris).plusWeeks(1).toInstant();
    Instant precedente = debut.atZone(paris).minusWeeks(1).toInstant();

    int explorateurs = ouverture.explorateurs(insee);
    boolean ouvert = ouverture.ouverte(insee, explorateurs);
    if (!ouvert) {
      return new Reponse(portee, v, debut, false, List.of(), List.of());
    }

    List<Ligne> lignes =
        jdbc.sql(
                "with actuel as ("
                    + rangs("debut", "fin")
                    + "), avant as ("
                    + rangs("avantDebut", "debut")
                    + ") select a.rang, a.pseudo, a.score, p.rang precedent, a.id = :moi moi"
                    + " from actuel a left join avant p on p.id = a.id"
                    + " where a.rang <= 3 or a.rang between"
                    + " (select rang from actuel where id = :moi) - 1"
                    + " and (select rang from actuel where id = :moi) + 1 order by a.rang")
            .param("ville", insee)
            .param("debut", Timestamp.from(debut))
            .param("fin", Timestamp.from(fin))
            .param("avantDebut", Timestamp.from(precedente))
            .param("moi", moi)
            .query(
                (r, i) -> {
                  int rang = r.getInt("rang");
                  int prec = r.getInt("precedent");
                  boolean absent = r.wasNull();
                  return new Ligne(
                      rang,
                      r.getString("pseudo"),
                      r.getInt("score"),
                      absent ? null : prec - rang,
                      r.getBoolean("moi"));
                })
            .list();
    List<Ligne> podium = lignes.stream().filter(l -> l.rang() <= 3).toList();
    List<Ligne> autour = lignes.stream().filter(l -> l.rang() > 3).toList();
    if (lignes.stream().noneMatch(Ligne::moi) && !classable(moi)) {
      autour = List.of(ligneNonClassee(moi, insee, debut, fin));
    }
    return new Reponse(portee, v, debut, true, podium, autour);
  }

  private boolean classable(UUID moi) {
    return jdbc.sql(
                "select count(*) from compte.utilisateur u where u.id = :moi and "
                    + OuvertureClassement.CLASSABLE)
            .param("moi", moi)
            .query(Integer.class)
            .single()
        > 0;
  }

  /** Ligne « Toi » d'un appelant non classé : visible de lui seul, sans rang ni tendance. */
  private Ligne ligneNonClassee(UUID moi, String insee, Instant debut, Instant fin) {
    return jdbc.sql(
            "select u.pseudo, (select count(*) from capture.capture c"
                + " join catalogue.monument m on m.numero = c.numero_monument"
                + " where c.utilisateur_id = u.id and c.capturee_le >= :debut"
                + " and c.capturee_le < :fin"
                + " and (cast(:ville as text) is null or m.ville_code_insee = :ville)) score"
                + " from compte.utilisateur u where u.id = :moi")
        .param("ville", insee)
        .param("debut", Timestamp.from(debut))
        .param("fin", Timestamp.from(fin))
        .param("moi", moi)
        .query((r, i) -> new Ligne(null, r.getString(1), r.getInt(2), null, true))
        .single();
  }
}
