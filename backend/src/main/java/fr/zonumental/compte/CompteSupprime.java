package fr.zonumental.compte;

import java.util.UUID;

/**
 * Publié par la purge (RG-014) dans la transaction qui efface le compte : les modules qui
 * détiennent des données de l'utilisateur (capture, photos...) l'écoutent et les effacent. Un
 * écouteur synchrone qui échoue annule la suppression du compte, qui sera rejouée à la purge
 * suivante (ADR 0008).
 */
public record CompteSupprime(UUID utilisateurId) {}
