import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const lire = (f) => readFileSync(f, 'utf8');
const tokensCss = lire('src/app/shared/styles/tokens.css');

function listerCss(dir) {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return listerCss(chemin);
    return chemin.endsWith('.css') ? [chemin] : [];
  });
}

const variables = {};
for (const [, nom, valeur] of tokensCss.matchAll(/(--zn-[\w-]+)\s*:\s*([^;]+);/g)) {
  variables[nom] = valeur.trim();
}
const resoudre = (nom) => {
  const v = variables[nom];
  assert.ok(v, `${nom} manquant`);
  const alias = v.match(/^var\((--zn-[\w-]+)\)$/);
  return alias ? resoudre(alias[1]) : v;
};

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contraste(a, b) {
  const [x, y] = [luminance(resoudre(a)), luminance(resoudre(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test('la palette validée est définie une seule fois dans tokens.css', () => {
  const attendu = {
    '--zn-papier': '#F4F1EA',
    '--zn-encre': '#1A1C20',
    '--zn-marine': '#1F3A5F',
    '--zn-bordeaux': '#8C2F39',
    '--zn-sapin': '#2F5D4A',
    '--zn-ocre': '#B07A2A',
    '--zn-ocre-texte': '#8A5E1E',
    '--zn-papier-clair': '#FBF9F4',
    // gris et nuit des maquettes v4 à v6
    '--zn-gris-libelle': '#5B5F66',
    '--zn-gris-texte': '#2C2F34',
    '--zn-gris-45': '#45494F',
    '--zn-gris-6b': '#6B6F75',
    '--zn-nuit': '#0E0F11',
  };
  for (const [nom, hex] of Object.entries(attendu)) {
    assert.equal(variables[nom]?.toUpperCase(), hex, nom);
  }
  assert.equal(variables['--zn-encre-douce'], undefined);
});

test('arrondis des maquettes v4–v6 : 12, 14, 16, 22, 26 px et pastille ; plus de 2 px', () => {
  const attendu = { 12: '12px', 14: '14px', 16: '16px', 22: '22px', 26: '26px' };
  for (const [n, px] of Object.entries(attendu)) {
    assert.equal(variables[`--zn-rayon-${n}`], px);
  }
  assert.equal(variables['--zn-rayon-pastille'], '999px');
  assert.equal(variables['--zn-rayon'], undefined);
});

test('mouvement : appui 160 ms, coup de tampon 460 ms, courbe des maquettes', () => {
  assert.equal(variables['--zn-duree-appui'], '160ms');
  assert.equal(variables['--zn-duree-tampon'], '460ms');
  assert.equal(variables['--zn-courbe'], 'cubic-bezier(0.23, 1, 0.32, 1)');
  const controles = lire('src/app/shared/ui/controles.css');
  assert.match(controles, /\[znBouton\]:active\s*{\s*transform:\s*scale\(0\.97\)/);
});

test('bouton principal : encre, 54 px, 14 px ; pas de double filet', () => {
  const css = lire('src/app/shared/ui/controles.css');
  assert.match(css, /min-block-size:\s*3\.375rem/);
  assert.match(css, /border-radius:\s*var\(--zn-rayon-14\)/);
  assert.equal(variables['--zn-action'], 'var(--zn-encre)');
  assert.doesNotMatch(css, /inset 0 0 0 3px/);
});

test('aucune couleur hexadécimale en dehors de tokens.css', () => {
  const fautifs = listerCss('src').filter(
    (f) => !f.endsWith('tokens.css') && /#[0-9a-fA-F]{3,8}\b/.test(lire(f)),
  );
  assert.deepEqual(fautifs, []);
});

test('les rôles utilisés par les composants respectent WCAG AA', () => {
  const texte = [
    ['--zn-texte', '--zn-fond'],
    ['--zn-texte', '--zn-fond-clair'],
    ['--zn-texte-doux', '--zn-fond'],
    ['--zn-texte-doux', '--zn-fond-clair'],
    ['--zn-fond-clair', '--zn-action'],
    ['--zn-gris-texte', '--zn-fond'],
    ['--zn-gris-45', '--zn-fond'],
    ['--zn-gris-6b', '--zn-fond-clair'], // sur papier (#F4F1EA) : 4,48:1, donc interdit en texte courant
    ['--zn-fond-clair', '--zn-marine'], // pastille Rare
    ['--zn-texte', '--zn-ocre'], // pastille Légendaire
    ['--zn-lien', '--zn-fond'],
    ['--zn-fond', '--zn-nuit'],
    ['--zn-erreur', '--zn-fond'],
    ['--zn-erreur', '--zn-fond-clair'],
    ['--zn-succes', '--zn-fond'],
    ['--zn-succes', '--zn-fond-clair'],
    ['--zn-action', '--zn-fond'],
    ['--zn-lien', '--zn-fond'],
    ['--zn-ocre-texte', '--zn-fond'],
  ];
  for (const [fg, bg] of texte) {
    assert.ok(contraste(fg, bg) >= 4.5, `${fg} sur ${bg} : ${contraste(fg, bg).toFixed(2)}`);
  }
  // éléments d'interface : 3:1 (1.4.11), dont la bordure de champ au repos
  for (const [fg, bg] of [
    ['--zn-focus', '--zn-fond'],
    ['--zn-focus', '--zn-fond-clair'],
    ['--zn-erreur', '--zn-fond-clair'],
    ['--zn-bordure-champ', '--zn-fond'],
    ['--zn-bordure-champ', '--zn-fond-clair'],
    ['--zn-bordure-controle', '--zn-fond-clair'],
    ['--zn-bordure-controle', '--zn-fond'],
  ]) {
    assert.ok(contraste(fg, bg) >= 3, `${fg} sur ${bg} : ${contraste(fg, bg).toFixed(2)}`);
  }
});

test('Gloock, Geist et Geist Mono sont chargées depuis nos fichiers (pas de CDN)', () => {
  const polices = lire('src/app/shared/styles/polices.css');
  assert.match(polices, /@fontsource\/gloock/);
  assert.match(polices, /@fontsource-variable\/geist\/files\//);
  assert.match(polices, /@fontsource-variable\/geist-mono\/files\//);
  assert.doesNotMatch(polices + lire('src/index.html'), /https?:\/\/(fonts|cdn)/);
  assert.match(tokensCss, /--zn-police-titre:\s*'Gloock'/);
  assert.match(tokensCss, /--zn-police-ui:\s*'Geist Variable'/);
  assert.match(tokensCss, /--zn-police-mono:\s*'Geist Mono Variable'/);
});

test('le focus est un outline de 3 px, jamais retiré', () => {
  const base = lire('src/app/shared/styles/base.css');
  assert.match(base, /:focus-visible\s*{[^}]*outline:\s*3px solid var\(--zn-focus\)/);
  assert.match(base, /outline-offset:\s*2px/);
});

test('prefers-reduced-motion ramène les animations à une durée quasi nulle', () => {
  const base = lire('src/app/shared/styles/base.css');
  assert.match(
    base,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration:\s*0\.01ms/,
  );
  assert.match(base, /@media \(forced-colors: active\)/);
});

test('pas de dégradé ni de typographie Material dans les styles', () => {
  for (const f of listerCss('src')) {
    assert.doesNotMatch(lire(f), /gradient\(|Roboto/i, f);
  }
});
