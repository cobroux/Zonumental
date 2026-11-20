package fr.zonumental.competition.defi;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.yaml.snakeyaml.Yaml;

/** Contenu validé de {@code defis.yml} (ADR 0024). Fenêtre {@code [debut, fin)} en dates Paris. */
public record CatalogueDefis(List<Defi> defis) {

  /** {@code monuments} vide hors critère MONUMENTS ; filtres nuls si absents (CAPTURES). */
  public record Defi(
      String code,
      String nom,
      String description,
      String saison,
      int semaine,
      LocalDate debut,
      LocalDate fin,
      String critere,
      int seuil,
      List<Integer> monuments,
      String ville,
      String type,
      String rarete,
      String recompense) {}

  public static CatalogueDefis charger(InputStream in) {
    Object brut = new Yaml().load(in);
    if (!(brut instanceof Map<?, ?> racine) || !(racine.get("defis") instanceof List<?> liste)) {
      throw new IllegalArgumentException("defis.yml : liste 'defis' manquante");
    }
    List<Defi> defis = new ArrayList<>();
    Set<String> codes = new HashSet<>();
    for (Object o : liste) {
      if (!(o instanceof Map<?, ?> m)) {
        throw new IllegalArgumentException("defis.yml : entrée invalide : " + o);
      }
      Defi d = defi(m);
      if (!codes.add(d.code())) {
        throw new IllegalArgumentException("code de défi en double : " + d.code());
      }
      if (!d.fin().isAfter(d.debut())) {
        throw new IllegalArgumentException("fin doit suivre debut : " + d.code());
      }
      for (Defi autre : defis) {
        if (d.debut().isBefore(autre.fin()) && autre.debut().isBefore(d.fin())) {
          throw new IllegalArgumentException(
              "période qui chevauche : " + d.code() + " / " + autre.code());
        }
      }
      defis.add(d);
    }
    return new CatalogueDefis(List.copyOf(defis));
  }

  private static Defi defi(Map<?, ?> m) {
    String code = texte(m, "code", "?");
    String critere = texte(m, "critere", code);
    List<Integer> monuments = List.of();
    int seuil;
    switch (critere) {
      case "CAPTURES" -> {
        if (!(m.get("seuil") instanceof Integer s) || s < 1) {
          throw new IllegalArgumentException("seuil invalide : " + code);
        }
        seuil = s;
      }
      case "MONUMENTS" -> {
        if (!(m.get("monuments") instanceof List<?> l)
            || l.isEmpty()
            || !l.stream().allMatch(Integer.class::isInstance)
            || l.stream().distinct().count() != l.size()) {
          throw new IllegalArgumentException("monuments invalides : " + code);
        }
        monuments = l.stream().map(Integer.class::cast).toList();
        seuil = monuments.size();
      }
      default ->
          throw new IllegalArgumentException("critère inconnu : " + critere + " (" + code + ")");
    }
    if (!(m.get("semaine") instanceof Integer semaine)) {
      throw new IllegalArgumentException("semaine invalide : " + code);
    }
    return new Defi(
        code,
        texte(m, "nom", code),
        texte(m, "description", code),
        texte(m, "saison", code),
        semaine,
        date(m, "debut", code),
        date(m, "fin", code),
        critere,
        seuil,
        monuments,
        m.get("ville") == null ? null : m.get("ville").toString(),
        m.get("type") == null ? null : m.get("type").toString(),
        m.get("rarete") == null ? null : m.get("rarete").toString(),
        texte(m, "recompense", code));
  }

  private static String texte(Map<?, ?> m, String cle, String code) {
    Object v = m.get(cle);
    if (v == null || v.toString().isBlank()) {
      throw new IllegalArgumentException("champ '" + cle + "' manquant : " + code);
    }
    return v.toString();
  }

  /** SnakeYAML lit une date non quotée en {@link Date} (minuit UTC). */
  private static LocalDate date(Map<?, ?> m, String cle, String code) {
    Object v = m.get(cle);
    if (v instanceof Date d) {
      return d.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
    }
    try {
      return LocalDate.parse(String.valueOf(v));
    } catch (java.time.format.DateTimeParseException e) {
      throw new IllegalArgumentException("date '" + cle + "' invalide : " + code, e);
    }
  }

  /** Défi dont la fenêtre contient ce jour (heure de Paris). */
  public Optional<Defi> courant(LocalDate jour) {
    return defis.stream()
        .filter(d -> !jour.isBefore(d.debut()) && jour.isBefore(d.fin()))
        .findFirst();
  }
}
