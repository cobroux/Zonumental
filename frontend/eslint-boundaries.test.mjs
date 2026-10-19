import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

const lint = async (filePath, code) => {
  const [r] = await new ESLint().lintText(code, { filePath });
  return r.messages.filter((m) => m.ruleId === 'boundaries/dependencies');
};

test('une fonctionnalité ne peut pas importer une autre fonctionnalité', async () => {
  const m = await lint(
    'src/app/features/compte/a.ts',
    "import { x } from '../legal/b';\nexport const y = x;\n",
  );
  assert.equal(m.length, 1);
});

test('un import dynamique entre fonctionnalités est refusé', async () => {
  const m = await lint(
    'src/app/features/compte/a.ts',
    "export const y = import('../legal/legal.routes');\n",
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
