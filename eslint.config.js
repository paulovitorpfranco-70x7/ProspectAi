const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const boundaries = require('eslint-plugin-boundaries');

module.exports = tseslint.config(
  {
    ignores: ['dist/**/*', 'coverage/**/*', 'node_modules/**/*'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/app/domain/**' },
        { type: 'application', pattern: 'src/app/application/**' },
        { type: 'infrastructure', pattern: 'src/app/infrastructure/**' },
        { type: 'presentation', pattern: 'src/app/presentation/**' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: { type: 'domain' },
              disallow: { to: { type: ['application', 'infrastructure', 'presentation'] } },
            },
            {
              from: { type: 'application' },
              disallow: { to: { type: ['infrastructure', 'presentation'] } },
            },
            {
              from: { type: 'infrastructure' },
              disallow: { to: { type: 'presentation' } },
            },
            {
              from: { type: 'presentation' },
              disallow: { to: { type: 'infrastructure' } },
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['rxjs'],
          patterns: [
            '@application/*',
            '@infrastructure/*',
            '@presentation/*',
            '@angular/*',
            '@supabase/*',
            '@ngrx/*',
            'rxjs/*',
            '../application/*',
            '../infrastructure/*',
            '../presentation/*',
            '../**/application/**',
            '../**/infrastructure/**',
            '../**/presentation/**',
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@infrastructure/*',
            '@presentation/*',
            '@supabase/*',
            '@angular/*',
            '!@angular/core',
            '../infrastructure/*',
            '../presentation/*',
            '../**/infrastructure/**',
            '../**/presentation/**',
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@presentation/*', '../presentation/*', '../**/presentation/**'],
        },
      ],
    },
  },
  {
    files: ['src/app/presentation/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@infrastructure/*', '../infrastructure/*', '../**/infrastructure/**'],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
);
