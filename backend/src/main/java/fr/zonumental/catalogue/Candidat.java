package fr.zonumental.catalogue;

import java.math.BigDecimal;

/** Monument tel que lu dans les sources (popularité, textes et licences compris). */
public record Candidat(
    String wikidataId,
    String merimeeId,
    String nom,
    TypeMonument type,
    String villeInsee,
    double latitude,
    double longitude,
    long popularite,
    Integer annee,
    String style,
    BigDecimal hauteurM,
    String histoireTexte,
    String histoireSourceUrl,
    String histoireLicence,
    String imageFichier,
    String imageSourceUrl,
    String imageLicence,
    String imageLicenceUrl,
    String imageAuteur) {}
