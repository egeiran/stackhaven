import { describe, expect, it } from 'vitest';
import { makeLevel } from '../core/testing';
import { decodeLevel, encodeLevel, withCustomLevel } from './levelLink';

describe('level links', () => {
  it('survive a round trip, including non-ASCII names', () => {
    const level = makeLevel({ id: 'kaia', name: 'Kaia på Ålesund' });
    expect(decodeLevel(encodeLevel(level))).toEqual(level);
  });

  it('only use URL-safe characters', () => {
    expect(encodeLevel(makeLevel({ name: '???>>>~~~' }))).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('reject text that is not a valid level', () => {
    expect(() => decodeLevel(encodeLevel({ ...makeLevel(), par: -1 }))).toThrow(/Invalid/);
    expect(() => decodeLevel('not base64 at all!')).toThrow();
  });
});

describe('withCustomLevel', () => {
  const a = makeLevel({ id: 'a' });
  const b = makeLevel({ id: 'b' });

  it('adds a new level at the end', () => {
    const custom = makeLevel({ id: 'c' });
    expect(withCustomLevel([a, b], custom)).toEqual([a, b, custom]);
  });

  it('replaces a bundled level with the same id', () => {
    const edited = makeLevel({ id: 'a', name: 'Edited' });
    expect(withCustomLevel([a, b], edited)).toEqual([edited, b]);
  });
});
