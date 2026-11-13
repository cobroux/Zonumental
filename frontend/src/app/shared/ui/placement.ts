/** Rotation ±8°, décalage ±5 % de la taille propre du tampon. Pure, stable d'une visite à l'autre. */
export function placement(numero: number): { rotation: number; dx: number; dy: number } {
  let h = Math.imul((numero | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  const u = (decalage: number) => (((h >>> decalage) & 0xff) / 255) * 2 - 1; // [-1, 1]
  const arrondi = (x: number) => Math.round(x * 10) / 10;
  return { rotation: arrondi(u(0) * 8), dx: arrondi(u(8) * 5), dy: arrondi(u(16) * 5) };
}
