/** Niveau = 1 + ⌊tampons ÷ 3⌋ (valeur par défaut retenue, spec fidélité §7.3). */
export const niveau = (tampons: number) => 1 + Math.floor(tampons / 3);
