package fr.zonumental.compte.verification;

/** Corps de `POST /api/compte/email/verification` ; toute valeur inutilisable = jeton invalide. */
record DemandeVerification(String jeton) {}
