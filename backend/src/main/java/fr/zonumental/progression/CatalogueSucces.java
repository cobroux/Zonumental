package fr.zonumental.progression;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.yaml.snakeyaml.Yaml;

/** Contenu validé de {@code succes.yml} (CDC §5, RG-R2-01). Calcul : r2-collectionner-2. */
public record CatalogueSucces(List<Succes> succes) {

  private static final Set<String> CRITERES =
      Set.of("CAPTURES", "VILLES", "TYPES", "RARETE", "VILLE", "COLLECTIONS");

  public record Succes(String code, String critere, String valeur, int seuil) {}

  public static CatalogueSucces charger(InputStream in) {
    Object brut = new Yaml().load(in);
    if (!(brut instanceof Map<?, ?> racine) || !(racine.get("succes") instanceof List<?> liste)) {
      throw new IllegalArgumentException("succes.yml : liste 'succes' manquante");
    }
    List<Succes> succes = new ArrayList<>();
    Set<String> codes = new HashSet<>();
    for (Object o : liste) {
      if (!(o instanceof Map<?, ?> m)) {
        throw new IllegalArgumentException("succes.yml : entrée invalide : " + o);
      }
      String code = String.valueOf(m.get("code"));
      String critere = String.valueOf(m.get("critere"));
      if (!CRITERES.contains(critere)) {
        throw new IllegalArgumentException("critère inconnu : " + critere + " (" + code + ")");
      }
      if (!(m.get("seuil") instanceof Integer seuil) || seuil < 1) {
        throw new IllegalArgumentException("seuil invalide : " + code);
      }
      if (!codes.add(code)) {
        throw new IllegalArgumentException("code de succès en double : " + code);
      }
      Object valeur = m.get("valeur");
      succes.add(new Succes(code, critere, valeur == null ? null : valeur.toString(), seuil));
    }
    return new CatalogueSucces(List.copyOf(succes));
  }
}
