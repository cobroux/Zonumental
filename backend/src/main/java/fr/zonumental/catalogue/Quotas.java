package fr.zonumental.catalogue;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.yaml.snakeyaml.Yaml;

/** Contenu validé de {@code catalogue-quotas.yml} (RG-016, RG-021). */
public record Quotas(List<Ville> villes, Map<String, Integer> rayons) {

  public record Ville(String nom, String insee, int quota) {}

  @SuppressWarnings("unchecked")
  public static Quotas charger(InputStream in) {
    Object brut = new Yaml().load(in);
    if (!(brut instanceof Map<?, ?> racine) || !(racine.get("villes") instanceof List<?> liste)) {
      throw new IllegalArgumentException("catalogue-quotas.yml : liste 'villes' manquante");
    }
    List<Ville> villes = new ArrayList<>();
    Set<String> codes = new HashSet<>();
    for (Object o : liste) {
      Map<String, Object> m = (Map<String, Object>) o;
      Ville v =
          new Ville(
              String.valueOf(m.get("nom")),
              String.valueOf(m.get("insee")),
              ((Number) m.get("quota")).intValue());
      if (v.quota() < 0) {
        throw new IllegalArgumentException("quota négatif : " + v.nom());
      }
      if (!codes.add(v.insee())) {
        throw new IllegalArgumentException("INSEE en double : " + v.insee());
      }
      villes.add(v);
    }
    Map<String, Integer> rayons = new java.util.LinkedHashMap<>();
    if (racine.get("rayons") instanceof Map<?, ?> r) {
      r.forEach(
          (k, val) -> {
            int metres = ((Number) val).intValue();
            if (metres < 50 || metres > 500) {
              throw new IllegalArgumentException("rayon hors 50-500 m : " + k);
            }
            rayons.put(String.valueOf(k), metres);
          });
    }
    return new Quotas(List.copyOf(villes), Map.copyOf(rayons));
  }
}
