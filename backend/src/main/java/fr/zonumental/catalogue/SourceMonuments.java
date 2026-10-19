package fr.zonumental.catalogue;

import java.util.List;

/** Lecture des sources externes ; appelée par la tâche d'import uniquement (ADR 0007). */
public interface SourceMonuments {

  /** Monuments éligibles d'une commune (Mérimée + article fr.wikipedia), popularité comprise. */
  List<Candidat> candidats(Quotas.Ville ville);

  /** Octets de l'image de référence du candidat ({@code imageFichier} non nul). */
  byte[] telechargerImage(Candidat candidat);
}
