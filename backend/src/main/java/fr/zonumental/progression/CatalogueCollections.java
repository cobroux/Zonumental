package fr.zonumental.progression;

import fr.zonumental.catalogue.TypeMonument;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.yaml.snakeyaml.Yaml;

/** Contenu validé de {@code collections.yml} (RG-R2-05, RG-R2-05b). */
public record CatalogueCollections(List<Collection> collections, Map<String, String> regions) {

  private static final Set<String> CLES = Set.of("code", "nom", "types", "ville", "region");

  /** Critères nuls = non appliqués ; combinés par ET. */
  public record Collection(
      String code, String nom, Set<String> types, String ville, String region) {}

  public static CatalogueCollections charger(InputStream in) {
    Object brut = new Yaml().load(in);
    if (!(brut instanceof Map<?, ?> racine) || !(racine.get("collections") instanceof List<?> l)) {
      throw new IllegalArgumentException("collections.yml : liste 'collections' manquante");
    }
    Map<String, String> deptRegion = new HashMap<>(); // département -> région
    if (racine.get("regions") instanceof Map<?, ?> regions) {
      regions.forEach(
          (r, ds) -> ((List<?>) ds).forEach(d -> deptRegion.put(d.toString(), r.toString())));
    }
    List<Collection> collections = new ArrayList<>();
    Set<String> codes = new HashSet<>();
    for (Object o : l) {
      if (!(o instanceof Map<?, ?> m)) {
        throw new IllegalArgumentException("collections.yml : entrée invalide : " + o);
      }
      String code = String.valueOf(m.get("code"));
      m.keySet().stream()
          .filter(k -> !CLES.contains(k))
          .findFirst()
          .ifPresent(
              k -> {
                throw new IllegalArgumentException("critère inconnu : " + k + " (" + code + ")");
              });
      if (m.get("nom") == null || !codes.add(code)) {
        throw new IllegalArgumentException("nom manquant ou code en double : " + code);
      }
      Set<String> types = Set.of();
      if (m.get("types") instanceof List<?> ts) {
        types = new HashSet<>();
        for (Object t : ts) {
          try {
            types.add(TypeMonument.valueOf(t.toString()).name());
          } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("type inconnu : " + t + " (" + code + ")", e);
          }
        }
      }
      String ville = m.get("ville") == null ? null : m.get("ville").toString();
      String region = m.get("region") == null ? null : m.get("region").toString();
      if (region != null && !deptRegion.containsValue(region)) {
        throw new IllegalArgumentException("région inconnue : " + region + " (" + code + ")");
      }
      if (types.isEmpty() && ville == null && region == null) {
        throw new IllegalArgumentException("aucun critère : " + code);
      }
      collections.add(new Collection(code, m.get("nom").toString(), types, ville, region));
    }
    return new CatalogueCollections(List.copyOf(collections), Map.copyOf(deptRegion));
  }

  /** Le monument (type, INSEE de sa ville) appartient-il à l'ensemble ? */
  public boolean accepte(Collection c, String type, String insee) {
    return (c.types().isEmpty() || c.types().contains(type))
        && (c.ville() == null || c.ville().equals(insee))
        && (c.region() == null || c.region().equals(regions.get(departement(insee))));
  }

  private static String departement(String insee) {
    return insee.substring(0, insee.startsWith("97") || insee.startsWith("98") ? 3 : 2);
  }
}
