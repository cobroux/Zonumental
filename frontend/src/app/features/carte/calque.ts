/** Rayon d'une zone dévoilée au zoom initial, en px (maquette CarteV6). */
const RAYON_INITIAL = 62;

/** Le brouillard suit l'échelle de la carte : le rayon double à chaque niveau de zoom. */
export const rayon = (zoom: number, zoomInitial: number): number =>
  RAYON_INITIAL * 2 ** (zoom - zoomInitial);

/** « Paris dévoilé à N % » : capturés ÷ catalogue de la ville, arrondi inférieur (AMOA, #131). */
export function pourcentage(
  monuments: { ville: { nom: string }; captureeLe: string | null }[],
  ville: string,
): number {
  const deLaVille = monuments.filter((m) => m.ville.nom === ville);
  if (!deLaVille.length) return 0;
  return Math.floor(
    (100 * deLaVille.filter((m) => m.captureeLe !== null).length) / deLaVille.length,
  );
}

/** Épingle à faire : le numéro seulement ; le nom n'apparaît qu'à la sélection (RG-054). */
export const libelle = (m: { numero: number }): string => `N° ${String(m.numero).padStart(3, '0')}`;
