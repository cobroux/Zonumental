import { placement } from './placement';
import type { Encre } from './tampon';

const ETOILE = 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z';

/** Ordre de RG-R2-01 (rang → rotation déterministe), encre et glyphe (spec §7.4). */
const CATALOGUE: Record<string, { encre: Encre; glyphe?: string; texte?: string }> = {
  PREMIER_TAMPON: {
    encre: 'commun',
    glyphe:
      'M12 2.6a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM10.5 7.6h3v3.6h-3zM5.5 11.2h13a1 1 0 0 1 1 1v3.3a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-3.3a1 1 0 0 1 1-1z',
  },
  EXPLORATEUR_10: { encre: 'commun', texte: '10' },
  EXPLORATEUR_25: { encre: 'commun', texte: '25' },
  EXPLORATEUR_50: { encre: 'commun', texte: '50' },
  CHASSEUR_RARE: { encre: 'rare', glyphe: ETOILE },
  LEGENDE: { encre: 'legendaire', glyphe: 'M3 18h18l-1.5-9-4.5 4-3-6-3 6-4.5-4z' },
  GLOBE_TROTTEUR: {
    encre: 'legendaire',
    glyphe: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 3c3.2 3 3.2 15 0 18-3.2-3-3.2-15 0-18z',
  },
  TOUR_DE_FRANCE: {
    encre: 'legendaire',
    glyphe: 'M12 2.5l7.5 3.5 2 6.5-4 7.5-5.5 2-5.5-2-4-7.5 2-6.5z',
  },
  ENCYCLOPEDISTE: {
    encre: 'commun',
    glyphe: 'M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1zM12 6.5v13',
  },
  PARISIEN: {
    encre: 'legendaire',
    glyphe: 'M12 1.5 13.6 8l3.4 6 2 8.5h-4.4c-1-2.6-4.2-2.6-5.2 0H5l2-8.5 3.4-6z',
  },
  COLLECTIONNEUR: { encre: 'commun', glyphe: 'M7 4h12v12H7zM4 8v12h12' },
};
const CODES = Object.keys(CATALOGUE);

/** Encre, glyphe, texte et rotation déterministe d'une médaille (spec fidélité §7.4). */
export function styleMedaille(code: string): {
  encre: Encre;
  glyphe: string;
  texte: string;
  rotation: number;
} {
  const c = CATALOGUE[code] ?? { encre: 'commun' as Encre, glyphe: ETOILE };
  const rang = CODES.indexOf(code);
  return {
    encre: c.encre,
    glyphe: c.glyphe ?? '',
    texte: c.texte ?? '',
    rotation: placement(rang < 0 ? 99 : rang + 1).rotation,
  };
}
