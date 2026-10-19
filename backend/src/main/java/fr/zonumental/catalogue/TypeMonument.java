package fr.zonumental.catalogue;

import java.util.List;
import java.util.Map;

/** Type de jeu (forme du tampon). Liste à valider par PO/UX (ADR 0007). */
public enum TypeMonument {
  CHATEAU,
  RELIGIEUX,
  PONT,
  PHARE,
  PALAIS,
  TOUR,
  MUSEE,
  AUTRE;

  private static final Map<TypeMonument, List<String>> P31 =
      Map.of(
          CHATEAU, List.of("Q23413", "Q751876", "Q57821"),
          RELIGIEUX,
              List.of("Q16970", "Q2977", "Q108325", "Q44613", "Q160742", "Q317557", "Q163687"),
          PONT, List.of("Q12280"),
          PHARE, List.of("Q39715"),
          PALAIS, List.of("Q16560"),
          TOUR, List.of("Q12518"),
          MUSEE, List.of("Q33506"));

  /** Premier type reconnu parmi les valeurs P31 de l'élément, sinon AUTRE. */
  public static TypeMonument depuisP31(List<String> qids) {
    for (TypeMonument t : values()) {
      if (t != AUTRE && qids.stream().anyMatch(q -> P31.get(t).contains(q))) {
        return t;
      }
    }
    return AUTRE;
  }
}
