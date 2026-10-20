/** Validation de confort côté client : le back refait tous les contrôles (RG-002 à RG-006). */
export type Champ = 'pseudo' | 'email' | 'motDePasse' | 'dateNaissance' | 'cgu';
export type Erreurs = Partial<Record<Champ, string>>;
export interface Naissance {
  jour: string;
  mois: string;
  annee: string;
}

export const AGE_MINIMUM = 15;
const PSEUDO = /^[A-Za-z0-9_-]{3,20}$/;

const MESSAGES: Record<Champ, Record<string, string>> = {
  pseudo: {
    obligatoire: 'Choisis un pseudo.',
    format: '3 à 20 caractères : lettres sans accent, chiffres, tiret et tiret bas.',
    'trop-court': 'Le pseudo doit faire au moins 3 caractères.',
    'trop-long': 'Le pseudo doit faire 20 caractères au plus.',
    'pseudo-deja-pris': 'Ce pseudo est déjà pris, choisis-en un autre.',
  },
  email: {
    obligatoire: 'Indique ton adresse e-mail.',
    format: 'Cette adresse e-mail ne semble pas valide.',
    'trop-long': 'Cette adresse e-mail est trop longue.',
  },
  motDePasse: {
    obligatoire: 'Choisis un mot de passe.',
    'trop-court': 'Le mot de passe doit faire au moins 12 caractères.',
    'trop-long': 'Le mot de passe doit faire 128 caractères au plus.',
  },
  dateNaissance: {
    obligatoire: 'Indique ta date de naissance.',
    'date-invalide': 'Cette date n’existe pas ou est dans le futur.',
    'age-minimum': `Il faut avoir au moins ${AGE_MINIMUM} ans pour créer un carnet.`,
  },
  cgu: {
    obligatoire: 'Accepte les CGU et la politique de confidentialité pour continuer.',
    'consentement-obligatoire':
      'Accepte les CGU et la politique de confidentialité pour continuer.',
  },
};

export function messageDe(champ: Champ, code: string): string {
  return MESSAGES[champ][code] ?? 'Cette valeur n’est pas valide.';
}

export function erreursEtape1(v: { pseudo: string; email: string; motDePasse: string }): Erreurs {
  const e: Erreurs = {};
  if (!PSEUDO.test(v.pseudo)) e.pseudo = messageDe('pseudo', 'format');
  const email = v.email.trim();
  if (!email) e.email = messageDe('email', 'obligatoire');
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    e.email = messageDe('email', 'format');
  if (v.motDePasse.length < 12) e.motDePasse = messageDe('motDePasse', 'trop-court');
  else if (v.motDePasse.length > 128) e.motDePasse = messageDe('motDePasse', 'trop-long');
  return e;
}

/** `AAAA-MM-JJ` si la date existe, sinon `null`. */
export function dateIso({ jour, mois, annee }: Naissance): string | null {
  if (!/^\d{1,2}$/.test(jour) || !/^\d{1,2}$/.test(mois) || !/^\d{4}$/.test(annee)) return null;
  const [j, m, a] = [Number(jour), Number(mois), Number(annee)];
  const d = new Date(Date.UTC(a, m - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null;
  return `${annee}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
}

/** Jour courant à Europe/Paris, comme le back (RG-002) : le fuseau du téléphone ne compte pas. */
export function aujourdhuiParis(maintenant = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(maintenant);
}

function age(naissance: string, aujourdhui: string): number {
  const [an, mn] = [Number(naissance.slice(0, 4)), naissance.slice(5)];
  const [a, m] = [Number(aujourdhui.slice(0, 4)), aujourdhui.slice(5)];
  return a - an - (m < mn ? 1 : 0);
}

export function erreursEtape2(
  v: { naissance: Naissance; cgu: boolean },
  aujourdhui = aujourdhuiParis(),
): Erreurs {
  const e: Erreurs = {};
  const iso = dateIso(v.naissance);
  if (!iso || iso > aujourdhui) e.dateNaissance = messageDe('dateNaissance', 'date-invalide');
  else if (age(iso, aujourdhui) < AGE_MINIMUM)
    e.dateNaissance = messageDe('dateNaissance', 'age-minimum');
  if (!v.cgu) e.cgu = messageDe('cgu', 'obligatoire');
  return e;
}
