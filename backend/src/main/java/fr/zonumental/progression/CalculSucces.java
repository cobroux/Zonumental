package fr.zonumental.progression;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Évalue les succès sur l'ensemble des captures du joueur (RG-R2-01, RG-R2-03) : une capture
 * manquée par un échec antérieur est donc rattrapée au calcul suivant.
 */
@Service
public class CalculSucces {

  /** Succès obtenu par ce calcul. */
  public record Gagne(String code, String libelle) {}

  private record Prise(String rarete, String ville, String type) {}

  private final CatalogueSucces catalogue;
  private final SuccesObtenus obtenus;
  private final JdbcClient jdbc;

  CalculSucces(CatalogueSucces catalogue, SuccesObtenus obtenus, JdbcClient jdbc) {
    this.catalogue = catalogue;
    this.obtenus = obtenus;
    this.jdbc = jdbc;
  }

  public List<Gagne> calculer(UUID utilisateur) {
    // Lecture directe du schéma capture : pas de dépendance Java vers le module capture.
    List<Prise> prises =
        jdbc.sql(
                "select m.rarete, m.ville_code_insee, m.type from capture.capture c"
                    + " join catalogue.monument m on m.numero = c.numero_monument"
                    + " where c.utilisateur_id = ?")
            .params(utilisateur)
            .query((r, i) -> new Prise(r.getString(1), r.getString(2), r.getString(3)))
            .list();
    return catalogue.succes().stream()
        .filter(s -> valeur(s, prises) >= s.seuil())
        .filter(s -> obtenus.enregistrer(utilisateur, s.code()))
        .map(s -> new Gagne(s.code(), s.libelle()))
        .toList();
  }

  private static long valeur(CatalogueSucces.Succes s, List<Prise> prises) {
    return switch (s.critere()) {
      case "CAPTURES" -> prises.size();
      case "VILLES" -> prises.stream().map(Prise::ville).distinct().count();
      case "TYPES" -> prises.stream().map(Prise::type).distinct().count();
      case "RARETE" -> prises.stream().filter(p -> p.rarete().equals(s.valeur())).count();
      case "VILLE" -> prises.stream().filter(p -> p.ville().equals(s.valeur())).count();
      default -> 0; // COLLECTIONS : définies dans une story suivante
    };
  }
}
