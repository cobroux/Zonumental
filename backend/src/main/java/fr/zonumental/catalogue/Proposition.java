package fr.zonumental.catalogue;

import java.util.List;

/**
 * Fichier de relecture du premier import. {@code numeroPropose} et {@code rareteProposee} sont
 * informatifs : les numéros ne sont figés (et recalculés) que par {@code figer}. Relecteur :
 * supprimer une ligne de {@code nouveaux} retire le monument, corriger un champ le corrige.
 */
public record Proposition(
    List<Ligne> nouveaux, List<Candidat> existants, List<String> absentsDesSources) {

  public record Ligne(Integer numeroPropose, Rarete rareteProposee, Candidat candidat) {}
}
