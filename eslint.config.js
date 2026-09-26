import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// ---------------------------------------------------------------------------
// Architecture boundaries (see docs/ARCHITECTURE.md).
//
//   core   -> nothing (pure TypeScript + zod)
//   render -> core, and *types* from app (it implements the GameRenderer port)
//   ui     -> core, app
//   app    -> core
//   editor -> core, app, ui (the level editor page; 2D, no three.js)
//   main.tsx is the composition root and may import everything.
// ---------------------------------------------------------------------------

/** Matches a relative import that climbs out of the current layer into `layers`. */
const intoLayer = (...layers) => `^(\\.\\./)+(${layers.join('|')})(/|$)`;

const noThree = { group: ['three', 'three/*'], message: 'Only src/render may use three.' };
const noReact = {
  group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
  message: 'Only src/ui (and main.tsx) may use React.',
};

/** Builds a config block that forbids the given import patterns inside one layer. */
function layer(name, patterns) {
  return {
    name: `boundaries/${name}`,
    files: [`src/${name}/**/*.{ts,tsx}`],
    rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns }] },
  };
}

export default defineConfig(
  { ignores: ['dist', 'coverage'] },

  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },

  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/editor/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },

  layer('core', [
    noThree,
    noReact,
    {
      regex: intoLayer('render', 'ui', 'app', 'levels', 'editor'),
      message: 'core is the innermost layer and must not import other layers.',
    },
  ]),
  {
    name: 'boundaries/core-purity',
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'location',
          'localStorage',
          'sessionStorage',
          'requestAnimationFrame',
          'setTimeout',
          'setInterval',
          'fetch',
        ].map((name) => ({ name, message: 'core must stay free of DOM/browser APIs.' })),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'core must be deterministic.' },
        { object: 'Date', property: 'now', message: 'core must be deterministic.' },
      ],
    },
  },
  layer('render', [
    noReact,
    { regex: intoLayer('ui', 'editor'), message: 'render must not import ui or the editor.' },
    {
      regex: intoLayer('app'),
      allowTypeImports: true,
      message: 'render may only import *types* from app (use `import type`).',
    },
  ]),
  layer('ui', [
    noThree,
    { regex: intoLayer('render', 'editor'), message: 'ui must not import render or the editor.' },
  ]),
  layer('editor', [
    noThree,
    { regex: intoLayer('render'), message: 'The editor is 2D: it must not import render.' },
  ]),
  layer('app', [
    noThree,
    noReact,
    {
      regex: intoLayer('render', 'ui', 'editor'),
      message: 'app talks to render through the GameRenderer interface, and ui reads app.',
    },
  ]),
);
