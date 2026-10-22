package fr.zonumental.compte;

import java.util.UUID;

/**
 * Publié par la purge (RG-014) dans la transaction qui efface le compte. Écouté à partir de R1 par
 * {@code @ApplicationModuleListener} avec le registre de publications JDBC de Spring Modulith,
 * rejoué après échec ; les écouteurs doivent être idempotents (ADR 0008).
 */
public record CompteSupprime(UUID utilisateurId) {}
