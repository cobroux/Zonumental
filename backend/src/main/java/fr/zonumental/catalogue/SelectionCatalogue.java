package fr.zonumental.catalogue;

import java.text.Collator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Logique pure de l'import : places libres, numéros, rareté (RG-016 à RG-020, ADR 0007). */
final class SelectionCatalogue {

  /** Monument déjà en base, pour le calcul du rang de rareté. */
  record Existant(String wikidataId, String nom, long popularite) {}

  record Numerote(int numero, Rarete rarete, Candidat candidat) {}

  private SelectionCatalogue() {}

  /** Popularité décroissante, puis nom alphabétique, puis identifiant Wikidata (RG-017). */
  private static <T> Comparator<T> ordre(
      java.util.function.ToLongFunction<T> popularite,
      java.util.function.Function<T, String> nom,
      java.util.function.Function<T, String> id) {
    Collator collator = Collator.getInstance(Locale.FRENCH);
    return Comparator.comparingLong(popularite)
        .reversed()
        .thenComparing(nom, collator)
        .thenComparing(id);
  }

  private static final Comparator<Candidat> ORDRE =
      ordre(Candidat::popularite, Candidat::nom, Candidat::wikidataId);

  /** Nouveaux monuments d'une ville : au plus {@code quota - dejaEnBase}, jamais de retrait. */
  static List<Candidat> choisir(
      int quota, int dejaEnBase, Set<String> idsExistants, List<Candidat> candidats) {
    int places = Math.max(0, quota - dejaEnBase);
    return candidats.stream()
        .filter(c -> !idsExistants.contains(c.wikidataId()))
        .sorted(ORDRE)
        .limit(places)
        .toList();
  }

  /** Numéros {@code maxNumero + 1, …} et rareté des seuls nouveaux (RG-019, RG-020). */
  static List<Numerote> attribuer(
      int maxNumero, List<Existant> existants, List<Candidat> nouveaux) {
    List<Candidat> tries = nouveaux.stream().sorted(ORDRE).toList();
    var rang =
        new ArrayList<>(
            existants.stream()
                .map(e -> new Existant(e.wikidataId(), e.nom(), e.popularite()))
                .toList());
    tries.forEach(c -> rang.add(new Existant(c.wikidataId(), c.nom(), c.popularite())));
    rang.sort(ordre(Existant::popularite, Existant::nom, Existant::wikidataId));
    int n = rang.size();
    int legendaires = (5 * n + 50) / 100;
    int rares = (20 * n + 50) / 100;

    List<Numerote> res = new ArrayList<>();
    int numero = maxNumero;
    for (Candidat c : tries) {
      int position = indexDe(rang, c.wikidataId()) + 1;
      Rarete rarete =
          position <= legendaires
              ? Rarete.LEGENDAIRE
              : position <= legendaires + rares ? Rarete.RARE : Rarete.COMMUN;
      res.add(new Numerote(++numero, rarete, c));
    }
    return res;
  }

  private static int indexDe(List<Existant> rang, String id) {
    for (int i = 0; i < rang.size(); i++) {
      if (rang.get(i).wikidataId().equals(id)) {
        return i;
      }
    }
    throw new IllegalStateException(id);
  }
}
