import { jjmmaa } from '../../shared/ui/tampon-monument';

export const LARGEUR = 1080;
export const HAUTEUR = 1920;
const ECHELLE = LARGEUR / 405; // la maquette V2-Partage fait 405 x 720
const LARGEUR_MRZ = 30;

export interface Collection {
  captures: number;
  monuments: { numero: number; capture: boolean }[];
}
export interface Page {
  nom: string;
  ville: string;
  numero: number;
  rarete: string; // écrite en majuscules (COMMUN, RARE, LÉGENDAIRE)
  encre: string; // nom du token : --zn-tampon-rare, etc.
  iso: string; // date de capture, ISO
  annee: number | null;
  pseudo: string; // déjà décidé (D5), jamais l'e-mail ni la position (RG-036)
  capturesFrance: number;
  totalFrance: number;
  photo: CanvasImageSource | null;
}

/** Rang « N / total » : monuments distincts des collections (aucun endpoint dédié). */
export function rang(collections: Collection[]): { n: number; total: number } {
  const tous = new Map<number, boolean>();
  for (const c of collections)
    for (const m of c.monuments) tous.set(m.numero, (tous.get(m.numero) ?? false) || m.capture);
  return { n: [...tous.values()].filter(Boolean).length, total: tous.size };
}

/** D5 : pseudo seulement avec le consentement « classement », sinon « Explorateur ». */
export const pseudoPartage = (pseudo: string | undefined, classement: boolean): string =>
  classement && pseudo ? `@${pseudo}` : 'Explorateur';

const mrzMot = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replaceAll('Œ', 'OE')
    .replace(/[^A-Z0-9]+/g, '<');
const bourrer = (s: string, n: number) => s.slice(0, n).padEnd(n, '<');
const n3 = (n: number) => String(n).padStart(3, '0');

/** Deux lignes de 30 caractères, façon passeport (décor, masqué aux lecteurs d'écran). */
export function ligneMrz(p: Page): [string, string] {
  const jour = new Date(p.iso)
    .toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
    .replaceAll('/', '');
  return [
    bourrer(`ZNM<FRA<${mrzMot(p.nom)}`, LARGEUR_MRZ - 3) + n3(p.numero),
    bourrer(
      `${mrzMot(p.ville)}<<${jour}<<${n3(p.capturesFrance)}<${n3(p.totalFrance)}`,
      LARGEUR_MRZ,
    ),
  ];
}

export interface Style {
  couleur: (token: string) => string;
  police: { titre: string; ui: string; mono: string };
}

/** object-fit: cover, object-position 50% 30%. */
function cadrer(src: CanvasImageSource, w: number, h: number) {
  const { width: sw, height: sh } = src as { width: number; height: number };
  const k = Math.max(w / sw, h / sh);
  const [cw, ch] = [w / k, h / k];
  return [(sw - cw) * 0.5, (sh - ch) * 0.3, cw, ch] as const;
}

/** Coupe sur les espaces ; longueur approximative (corps 34, ~0,5 em par lettre). */
function lignesNom(texte: string, largeur: number): string[] {
  const max = Math.floor(largeur / 17);
  const lignes: string[] = [];
  for (const m of texte.split(' ')) {
    const l = lignes.at(-1);
    if (l !== undefined && l.length + m.length < max) lignes[lignes.length - 1] = `${l} ${m}`;
    else lignes.push(m);
  }
  return lignes;
}

/** Dessine la page de carnet dans les coordonnées de la maquette (405 x 720). */
export function dessiner(ctx: CanvasRenderingContext2D, p: Page, s: Style): void {
  const { couleur: c, police } = s;
  ctx.save();
  ctx.scale(ECHELLE, ECHELLE);
  ctx.fillStyle = c('--zn-papier');
  ctx.fillRect(0, 0, 405, 720);
  // guillochis : 36 ellipses tournées de 5° en 5°
  ctx.strokeStyle = c('--zn-sapin');
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 0.6;
  for (let a = 0; a < 180; a += 5) {
    ctx.beginPath();
    ctx.ellipse(202, 590, 230, 54, (a * Math.PI) / 180, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = c('--zn-encre');
  ctx.font = `20px ${police.titre}`;
  ctx.fillText('Zonumental', 22, 42);
  ctx.textAlign = 'right';
  ctx.font = `10px ${police.mono}`;
  ctx.fillStyle = c('--zn-gris-libelle');
  ctx.fillText('CARNET N°1 · PAGE 1', 383, 42);

  if (p.photo) {
    ctx.save();
    ctx.shadowColor = 'rgba(14, 15, 17, 0.55)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = c('--zn-papier');
    ctx.beginPath();
    ctx.roundRect(22, 60, 361, 404, 4);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.clip();
    ctx.drawImage(p.photo, ...cadrer(p.photo, 361, 404), 22, 60, 361, 404);
    ctx.restore();
  }

  // tampon « CAPTURÉ » : ellipse à double filet, encre multipliée, penché de 8°
  ctx.save();
  ctx.translate(294, 468);
  ctx.rotate((-8 * Math.PI) / 180);
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = ctx.fillStyle = c(p.encre);
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 92.4, 64.4, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 82.6, 54.6, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `11px ${police.mono}`;
  ctx.fillText(`${p.ville.toLocaleUpperCase('fr-FR')} · ${p.rarete}`, 0, -23);
  ctx.font = `25px ${police.titre}`;
  ctx.fillText('CAPTURÉ', 0, 11);
  ctx.font = `11px ${police.mono}`;
  ctx.fillText(`N°${n3(p.numero)} · ${jjmmaa(p.iso)}`, 0, 33);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.fillStyle = c('--zn-encre');
  ctx.font = `34px ${police.titre}`;
  lignesNom(p.nom, 220).forEach((l, i) => ctx.fillText(l, 22, 506 + i * 32));
  ctx.font = `14px ${police.ui}`;
  ctx.fillStyle = c('--zn-gris-45');
  ctx.fillText(p.annee ? `${p.ville} · ${p.annee}` : p.ville, 22, 586);

  ctx.fillStyle = c('--zn-encre');
  ctx.font = `13px ${police.ui}`;
  ctx.fillText(`par ${p.pseudo}`, 22, 664);
  ctx.textAlign = 'right';
  ctx.font = `600 13px ${police.ui}`;
  ctx.fillText(`${p.capturesFrance} / ${p.totalFrance} en France`, 383, 664);
  ctx.strokeStyle = c('--zn-encre');
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(22, 675);
  ctx.lineTo(383, 675);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.fillStyle = c('--zn-gris-texte');
  ctx.font = `12.5px ${police.mono}`;
  ctx.letterSpacing = '1.5px';
  ligneMrz(p).forEach((l, i) => ctx.fillText(l, 22, 692 + i * 19));
  ctx.restore();
}

export async function genererImage(p: Page, s: Style): Promise<Blob> {
  await Promise.all(
    [`34px ${s.police.titre}`, `13px ${s.police.ui}`, `12px ${s.police.mono}`].map((f) =>
      document.fonts.load(f),
    ),
  );
  const canvas = document.createElement('canvas');
  canvas.width = LARGEUR;
  canvas.height = HAUTEUR;
  dessiner(canvas.getContext('2d')!, p, s);
  return new Promise((ok, ko) =>
    canvas.toBlob((b) => (b ? ok(b) : ko(new Error('image'))), 'image/png'),
  );
}

/** Partage natif avec fichier si possible ; sinon téléchargement. Renvoie le mode utilisé. */
export async function partager(blob: Blob, nom: string): Promise<'partage' | 'telechargement'> {
  const fichier = new File([blob], `${nom}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: nom });
      return 'partage';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'partage'; // annulé par l'utilisateur
    }
  }
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: `${nom}.png` }).click();
  URL.revokeObjectURL(url);
  return 'telechargement';
}
