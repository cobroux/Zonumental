import { MonumentResume } from '../../core/api/models/monument-resume';
import { Rarete } from '../../core/api/models/rarete';
import { TypeMonument } from '../../core/api/models/type-monument';
import { ContenuTampon, Encre, Forme } from '../../shared/ui/tampon';

/** Spec fidélité §3.2, décision n° 4. */
export const FORME_PAR_TYPE: Record<TypeMonument, Forme> = {
  TOUR: 'cercle',
  PHARE: 'cercle',
  AUTRE: 'cercle',
  PONT: 'rectangle',
  CHATEAU: 'rectangle',
  PALAIS: 'rectangle',
  RELIGIEUX: 'octogone',
  MUSEE: 'ovale',
};
/** Décision n° 1 : commun marine, rare bordeaux, légendaire sapin. */
export const ENCRE_PAR_RARETE: Record<Rarete, Encre> = {
  COMMUN: 'commun',
  RARE: 'rare',
  LEGENDAIRE: 'legendaire',
};

const RARETE_ECRITE: Record<Rarete, string> = {
  COMMUN: 'COMMUN',
  RARE: 'RARE',
  LEGENDAIRE: 'LÉGENDAIRE',
};
// Caractères max (haut, centre, bas) par forme : largeur disponible / corps du texte (spec §3.3).
const MAX: Record<Forme, [number, number, number]> = {
  cercle: [34, 12, 12],
  rectangle: [16, 25, 22],
  octogone: [14, 14, 17],
  ovale: [14, 23, 20],
};
const FUSEAU = 'Europe/Paris';

const tronquer = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const majuscules = (s: string) => s.toLocaleUpperCase('fr-FR');
const numero = (m: MonumentResume) => `N°${String(m.numero).padStart(3, '0')}`;
const jjmmaa = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        timeZone: FUSEAU,
      })
        .format(new Date(iso))
        .replaceAll('/', '·')
    : '';

/** Texte des trois zones du tampon selon sa forme ; jamais d'abréviation, « … » seulement. */
export function contenuTampon(m: MonumentResume): ContenuTampon {
  const forme = FORME_PAR_TYPE[m.type];
  const [maxHaut, maxCentre, maxBas] = MAX[forme];
  const ville = majuscules(m.ville.nom);
  const nom = majuscules(m.nom);
  const rarete = RARETE_ECRITE[m.rarete];
  const n = numero(m);
  const lignes: Record<Forme, ContenuTampon> = {
    // l'arc complet « VILLE · NOM · N°001 · » tient en maxHaut : on ne rogne que le nom
    cercle: {
      haut: `${ville} · ${tronquer(nom, Math.max(4, maxHaut - ville.length - n.length - 8))} · ${n} ·`,
      centre: rarete,
      bas: jjmmaa(m.captureeLe),
    },
    rectangle: { haut: nom, centre: ville, bas: `${n} · ${rarete}` },
    octogone: { haut: nom, centre: n, bas: rarete },
    ovale: { haut: ville, centre: nom, bas: `${n} · ${rarete}` },
  };
  const c = lignes[forme];
  return {
    haut: forme === 'cercle' ? c.haut : tronquer(c.haut, maxHaut),
    centre: tronquer(c.centre, maxCentre),
    bas: tronquer(c.bas, maxBas),
  };
}

/** Commence par le nom complet : le texte visible tronqué en est un préfixe (WCAG 2.5.3). */
export function etiquetteTampon(m: MonumentResume): string {
  const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: FUSEAU }).format(
    new Date(m.captureeLe ?? 0),
  );
  return `${m.nom}, ${numero(m)}, ${m.ville.nom}, ${RARETE_ECRITE[m.rarete].toLocaleLowerCase('fr-FR')}, tamponné le ${date}`;
}
