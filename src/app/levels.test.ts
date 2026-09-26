import { describe, expect, it } from 'vitest';
import { createInitialState, replay } from '../core';
import { LEVELS } from './levelRegistry';

const files = import.meta.glob('../levels/*.json');

describe('level files', () => {
  it('has five levels with unique ids', () => {
    expect(LEVELS).toHaveLength(5);
    expect(new Set(LEVELS.map((level) => level.id)).size).toBe(LEVELS.length);
  });

  it('names each file after the level id', () => {
    const fileIds = Object.keys(files).map((path) => path.replace(/^.*\/(.+)\.json$/, '$1'));
    expect(fileIds.sort()).toEqual(LEVELS.map((level) => level.id));
  });
});

// Every level is validated by zod when LEVELS is built (parseLevel throws on
// a bad file). Here we replay each stored solution to prove the level can be
// won in exactly `par` moves. Proving that `par` is *optimal* needs a solver
// (milestone 2).
describe.each(LEVELS)('level $id', (level) => {
  it('is won by its solution', () => {
    const result = replay(createInitialState(level), level.solution);

    if (!result.ok) {
      throw new Error(`move ${result.index} of the solution is illegal: ${result.error}`);
    }
    expect(result.state.status).toBe('won');
  });

  it('has a solution of exactly par moves', () => {
    expect(level.solution).toHaveLength(level.par);
  });
});
