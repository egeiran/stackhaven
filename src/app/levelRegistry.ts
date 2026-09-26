import { parseLevel, type Level } from '../core';

// Vite inlines every JSON file in src/levels at build time (and Vitest does the same in tests).
const files = import.meta.glob<unknown>('../levels/*.json', { eager: true, import: 'default' });

/** All levels, ordered by file name (01-…, 02-…). An invalid file fails loudly at startup. */
export const LEVELS: readonly Level[] = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, data]) => parseLevel(data, path));
