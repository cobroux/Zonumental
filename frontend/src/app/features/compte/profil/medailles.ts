import type { MesSucces } from '../../../core/api/models/mes-succes';
import { styleMedaille } from '../../../shared/ui/medaille-catalogue';
import type { Encre } from '../../../shared/ui/tampon';

/** Niveau = 1 + ⌊tampons ÷ 3⌋ (valeur par défaut retenue, spec fidélité §7.3). */
export const niveau = (tampons: number) => 1 + Math.floor(tampons / 3);

/** Nombre de succès configurés (RG-R2-01) : l'API ne renvoie ni les masqués ni le total. */
export const TOTAL_SUCCES = 11;

export interface Medaille {
  code: string;
  nom: string;
  etat: 'obtenue' | 'en-cours' | 'a-decouvrir';
  encre: Encre;
  glyphe: string;
  texte: string;
  rotation: number;
  valeur: number;
  seuil: number;
}

/** 4 médailles : jusqu'à 2 obtenues (récentes), puis en cours les plus avancées, puis « à découvrir ». */
export function medailles(s: MesSucces): Medaille[] {
  const base = (code: string, nom: string) => ({
    code,
    nom,
    ...styleMedaille(code),
    valeur: 0,
    seuil: 0,
  });
  const obtenues = [...s.obtenus]
    .sort((a, b) => b.obtenuLe.localeCompare(a.obtenuLe))
    .slice(0, 2)
    .map((o): Medaille => ({ ...base(o.code, o.libelle), etat: 'obtenue' }));
  const enCours = [...s.enCours]
    .sort((a, b) => b.valeur / b.seuil - a.valeur / a.seuil)
    .map((e): Medaille => ({
      ...base(e.code, e.libelle),
      etat: 'en-cours',
      valeur: e.valeur,
      seuil: e.seuil,
    }));
  const choix = [...obtenues, ...enCours].slice(0, 4);
  while (choix.length < 4)
    choix.push({ ...base(`?${choix.length}`, 'À découvrir'), etat: 'a-decouvrir' });
  return choix;
}
