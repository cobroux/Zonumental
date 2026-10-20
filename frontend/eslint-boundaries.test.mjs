import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

// Le plugin ne classe que des cibles existantes : on crée des fichiers jetables.
const targets = [
  'src/app/features/fictive/b.ts',
  'src/app/features/fictive/fictive.routes.ts',
  'src/app/features/compte/connexion/b.ts',
  'src/app/shared/b.ts',
  'src/app/core/b.ts',
];
before(() =>
  targets.forEach((f) => {
    mkdirSync(f.replace(/\/[^/]+$/, ''), { recursive: true });
    writeFileSync(f, 'export const x = 1;\n');
  }),
);
after(() => {
  rmSync('src/app/features/fictive', { recursive: true, force: true });
  rmSync('src/app/features/compte', { recursive: true, force: true });
  rmSync('src/app/shared/b.ts');
  rmSync('src/app/core/b.ts');
});

const lint = async (filePath, code) => {
  const [r] = await new ESLint().lintText(code, { filePath });
  return r.messages.filter((m) => m.ruleId === 'boundaries/dependencies');
};

test('une fonctionnalité ne peut pas importer une autre fonctionnalité', async () => {
  const m = await lint(
    'src/app/features/compte/a.ts',
    "import { x } from '../fictive/b';\nexport const y = x;\n",
  );
  assert.equal(m.length, 1);
});

test('un import dynamique entre fonctionnalités est refusé', async () => {
  const m = await lint(
    'src/app/features/compte/a.ts',
    "export const y = import('../fictive/fictive.routes');\n",
  );
  assert.equal(m.length, 1);
});

test('une fonctionnalité peut importer shared et sa propre arborescence', async () => {
  assert.equal(
    (
      await lint(
        'src/app/features/compte/a.ts',
        "import { x } from '../../shared/b';\nexport const y = x;\n",
      )
    ).length,
    0,
  );
  assert.equal(
    (
      await lint(
        'src/app/features/compte/a.ts',
        "import { x } from './connexion/b';\nexport const y = x;\n",
      )
    ).length,
    0,
  );
});

test('shared ne peut pas importer core', async () => {
  const m = await lint(
    'src/app/shared/a.ts',
    "import { x } from '../core/b';\nexport const y = x;\n",
  );
  assert.equal(m.length, 1);
});
