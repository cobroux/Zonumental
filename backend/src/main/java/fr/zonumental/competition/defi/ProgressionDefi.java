package fr.zonumental.competition.defi;

import fr.zonumental.competition.defi.CatalogueDefis.Defi;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** Progression dérivée des captures de l'appelant, jamais stockée (ADR 0024 §3). */
@Service
class ProgressionDefi {

  static final ZoneId PARIS = ZoneId.of("Europe/Paris");

  record Pastille(String libelle, boolean faite) {}

  record Recompense(String code, String libelle) {}

  record DefiCourant(
      String code,
      String nom,
      String description,
      String saison,
      int semaine,
      Instant debutLe,
      Instant finLe,
      int seuil,
      int valeur,
      boolean reussi,
      Recompense recompense,
      List<Pastille> pastilles) {}

  private final JdbcClient jdbc;

  ProgressionDefi(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  DefiCourant de(Defi d, UUID moi) {
    Instant debut = d.debut().atStartOfDay(PARIS).toInstant();
    Instant fin = d.fin().atStartOfDay(PARIS).toInstant();
    List<Pastille> pastilles =
        d.critere().equals("MONUMENTS") ? monuments(d, moi, fin) : captures(d, moi, debut, fin);
    int valeur = (int) pastilles.stream().filter(Pastille::faite).count();
    return new DefiCourant(
        d.code(),
        d.nom(),
        d.description(),
        d.saison(),
        d.semaine(),
        debut,
        fin,
        d.seuil(),
        valeur,
        valeur >= d.seuil(),
        new Recompense("DEFI_" + d.code(), d.recompense()),
        pastilles);
  }

  /** Un par monument de la liste, dans l'ordre de la config, capturé avant la fin (RG-034). */
  private List<Pastille> monuments(Defi d, UUID moi, Instant fin) {
    record Ligne(int numero, String nom, boolean faite) {}
    // Lecture directe des schémas capture et catalogue, comme progression (pas de dépendance Java).
    List<Ligne> lignes =
        jdbc.sql(
                "select m.numero, m.nom, exists (select 1 from capture.capture c"
                    + " where c.numero_monument = m.numero and c.utilisateur_id = :moi"
                    + " and c.capturee_le < :fin) from catalogue.monument m"
                    + " where m.numero in (:numeros)")
            .param("moi", moi)
            .param("fin", java.sql.Timestamp.from(fin))
            .param("numeros", d.monuments())
            .query((r, i) -> new Ligne(r.getInt(1), r.getString(2), r.getBoolean(3)))
            .list();
    return d.monuments().stream()
        .map(
            n ->
                lignes.stream()
                    .filter(l -> l.numero() == n)
                    .findFirst()
                    .map(l -> new Pastille(l.nom(), l.faite()))
                    .orElse(
                        new Pastille(
                            "Monument " + n, false))) // numéro inconnu : voir ControleDefis
        .toList();
  }

  /** Monuments comptés dans l'ordre de capture, puis pastilles non faites sans libellé. */
  private List<Pastille> captures(Defi d, UUID moi, Instant debut, Instant fin) {
    StringBuilder sql =
        new StringBuilder(
            "select m.nom from capture.capture c join catalogue.monument m"
                + " on m.numero = c.numero_monument where c.utilisateur_id = :moi"
                + " and c.capturee_le >= :debut and c.capturee_le < :fin");
    if (d.ville() != null) {
      sql.append(" and m.ville_code_insee = :ville");
    }
    if (d.type() != null) {
      sql.append(" and m.type = :type");
    }
    if (d.rarete() != null) {
      sql.append(" and m.rarete = :rarete");
    }
    sql.append(" order by c.capturee_le, c.numero_monument limit :seuil");
    var q =
        jdbc.sql(sql.toString())
            .param("moi", moi)
            .param("debut", java.sql.Timestamp.from(debut))
            .param("fin", java.sql.Timestamp.from(fin))
            .param("seuil", d.seuil());
    if (d.ville() != null) {
      q = q.param("ville", d.ville());
    }
    if (d.type() != null) {
      q = q.param("type", d.type());
    }
    if (d.rarete() != null) {
      q = q.param("rarete", d.rarete());
    }
    List<Pastille> pastilles =
        new ArrayList<>(q.query((r, i) -> new Pastille(r.getString(1), true)).list());
    while (pastilles.size() < d.seuil()) {
      pastilles.add(new Pastille(null, false));
    }
    return pastilles;
  }
}
