import type { Level } from '../core';

const PRINT_WIDTH = 100;
const INDENT = '  ';

/**
 * Formats a level exactly the way Prettier formats our level files, so a level
 * copied from the editor passes `pnpm lint` unchanged:
 * - the top-level object has one property per line;
 * - an array stays on one line when it fits within 100 columns;
 * - an array of two or more multi-entry objects/arrays (e.g. the solution)
 *   always gets one item per line, like Prettier does.
 */
export function formatLevelJson(level: Level): string {
  const entries = Object.entries(level);
  const lines = entries.map(([key, value], index) => {
    const comma = index < entries.length - 1 ? ',' : '';
    const prefix = `${INDENT}${JSON.stringify(key)}: `;
    return prefix + formatValue(value, 1, prefix.length, comma.length) + comma;
  });
  return `{\n${lines.join('\n')}\n}\n`;
}

function formatValue(value: unknown, depth: number, column: number, trailing: number): string {
  const inline = inlineJson(value);
  if (!Array.isArray(value) || value.length === 0) return inline;
  if (!alwaysBreaks(value) && column + inline.length + trailing <= PRINT_WIDTH) return inline;

  const indent = INDENT.repeat(depth + 1);
  const items = value.map((item, index) => {
    const comma = index < value.length - 1 ? ',' : '';
    return indent + formatValue(item, depth + 1, indent.length, comma.length) + comma;
  });
  return `[\n${items.join('\n')}\n${INDENT.repeat(depth)}]`;
}

function inlineJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(inlineJson).join(', ')}]`;
  if (isObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const body = entries.map(([key, item]) => `${JSON.stringify(key)}: ${inlineJson(item)}`);
    return `{ ${body.join(', ')} }`;
  }
  return JSON.stringify(value);
}

/** Prettier always breaks arrays of 2+ objects (or arrays) that each have 2+ entries. */
function alwaysBreaks(items: readonly unknown[]): boolean {
  if (items.length < 2) return false;
  const allArrays = items.every((item) => Array.isArray(item) && item.length > 1);
  const allObjects = items.every((item) => isObject(item) && Object.keys(item).length > 1);
  return allArrays || allObjects;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
