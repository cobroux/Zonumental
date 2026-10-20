/**
 * Source unique des versions des textes légaux. `cgu` et `confidentialite` doivent égaler
 * `zonumental.legal.version-cgu` / `-confidentialite` du back (docs/rgpd/README.md) : le
 * formulaire d'inscription les enverra pour dater les consentements (RG-003).
 */
export const VERSIONS_LEGALES = {
  cgu: { version: '0.1-provisoire', date: '2026-10-20' },
  confidentialite: { version: '0.1-provisoire', date: '2026-10-20' },
  mentions: { version: '0.1-provisoire', date: '2026-10-20' },
} as const;
