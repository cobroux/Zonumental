import type { TypeMonument } from './tampon-monument';

/** Silhouettes génériques par type, viewBox 48 × 48 (spec fidélité §3.6) : jamais le monument réel (RG-054). */
export const SILHOUETTE: Record<TypeMonument, string> = {
  CHATEAU: 'M6 42V12h4v3h4v-3h4v12h12V12h4v3h4v-3h4v30zM21 42v-9a3 3 0 0 1 6 0v9z',
  RELIGIEUX: 'M6 42V28l12-8 12 8v14zM30 42V22h12v20zM30 22l6-16 6 16z',
  PONT: 'M2 12h44v30H2zM8 42v-8a4 4 0 0 1 8 0v8zM20 42v-8a4 4 0 0 1 8 0v8zM32 42v-8a4 4 0 0 1 8 0v8z',
  PHARE: 'M18 42 21 18h6l3 24zM20 18V12h8v6zM23 14h2v3h-2zM24 5l6 7H18z',
  PALAIS: 'M4 42V20h40v22zM20 42V32h8v10zM4 20 24 8l20 12z',
  TOUR: 'M24 3l4 15 6 26h-5l-5-14-5 14h-5l6-26z',
  MUSEE:
    'M4 18 24 6l20 12zM6 20h36v3H6zM10 26h4v12h-4zM18 26h4v12h-4zM26 26h4v12h-4zM34 26h4v12h-4zM6 40h36v4H6z',
  AUTRE: 'M24 4 42 24 24 44 6 24zM24 18l6 6-6 6-6-6z',
};
