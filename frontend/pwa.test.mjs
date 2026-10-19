import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));

test("le manifeste rend l'application installable", () => {
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.name && manifest.start_url);
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
});

test('index.html référence le manifeste', () => {
  assert.match(readFileSync('src/index.html', 'utf8'), /rel="manifest"/);
});

test('le service worker ne capture pas /api', () => {
  const ngsw = JSON.parse(readFileSync('ngsw-config.json', 'utf8'));
  assert.ok(ngsw.navigationUrls.includes('!/api/**'));
  assert.equal(ngsw.dataGroups, undefined);
});
