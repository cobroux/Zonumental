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
  };
  for (const [nom, hex] of Object.entries(attendu)) {
    assert.equal(variables[nom]?.toUpperCase(), hex, nom);
  }
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
    ['--zn-fond', '--zn-action'],
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
  // éléments d'interface (focus, bordure de champ) : 3:1 (1.4.11)
  for (const [fg, bg] of [
    ['--zn-focus', '--zn-fond'],
    ['--zn-focus', '--zn-fond-clair'],
    ['--zn-bordure-champ', '--zn-fond-clair'],
    ['--zn-bordure-champ', '--zn-fond'],
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
