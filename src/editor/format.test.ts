import { describe, expect, it } from 'vitest';
import { parseLevel } from '../core';
import { makeLevel } from '../core/testing';
import { formatLevelJson } from './format';

const files = import.meta.glob<string>('../levels/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('formatLevelJson', () => {
  it.each(Object.entries(files))('reproduces %s byte for byte', (path, raw) => {
    expect(formatLevelJson(parseLevel(JSON.parse(raw), path))).toBe(raw);
  });

  it('puts one stack per line when every stack holds two or more containers', () => {
    const json = formatLevelJson(
      makeLevel({
        stacks: [
          ['red', 'blue'],
          ['green', 'red'],
        ],
      }),
    );
    expect(json).toContain('"stacks": [\n    ["red", "blue"],\n    ["green", "red"]\n  ],');
  });

  it('writes an empty solution as []', () => {
    expect(formatLevelJson(makeLevel({ solution: [] }))).toContain('"solution": []');
  });
});
