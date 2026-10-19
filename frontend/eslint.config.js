// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const boundaries = require('eslint-plugin-boundaries');

const bypass = [
  'bypassSecurityTrustHtml',
  'bypassSecurityTrustScript',
  'bypassSecurityTrustStyle',
  'bypassSecurityTrustUrl',
  'bypassSecurityTrustResourceUrl',
];

module.exports = defineConfig([
  { ignores: ['src/app/core/api/**', 'coverage/**', '.angular/**'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' }, node: true },
      'boundaries/elements': [
        { type: 'feature', pattern: 'src/app/features/*', capture: ['feature'], mode: 'folder' },
        { type: 'shared', pattern: 'src/app/shared', mode: 'folder' },
        { type: 'core', pattern: 'src/app/core', mode: 'folder' },
        { type: 'app', pattern: 'src/app/*.ts', mode: 'file' },
      ],
    },
    rules: {
      // ADR 0012 : une fonctionnalité n'importe jamais une autre ; shared ne dépend pas de core.
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'feature' } },
              allow: {
                to: [
                  {
                    element: { type: 'feature', captured: { feature: '${from.captured.feature}' } },
                  },
                  { element: { types: { anyOf: ['shared', 'core'] } } },
                ],
              },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'core' } },
              allow: { to: { element: { types: { anyOf: ['core', 'shared'] } } } },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: { element: { types: { anyOf: ['app', 'core', 'shared', 'feature'] } } },
              },
            },
          ],
        },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      'no-restricted-properties': [
        'error',
        ...bypass.map((property) => ({ property, message: 'Interdit : risque XSS.' })),
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
