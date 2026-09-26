import { describe, expect, it } from 'vitest';
import { replay } from './engine';
import { STANDARD_RULES, type Rule } from './rules';
import { solve, type SolveResult } from './solver';
import { makeState } from './testing';
import type { GameState } from './types';

// Specification for the solver Eivind writes in milestone 2.
// Remove `.skip` when you start implementing solve().

function expectSolved(result: SolveResult) {
  if (result.status !== 'solved') throw new Error(`expected "solved", got "${result.status}"`);
  return result;
}

describe.skip('solve', () => {
  it('returns no moves for a state that is already won', () => {
    const state: GameState = { ...makeState(), orders: [], status: 'won' };
    expect(expectSolved(solve(state)).moves).toEqual([]);
  });

  it('solves a level that only needs deliveries', () => {
    const state = makeState({ stacks: [['red', 'blue'], ['green']], orders: ['blue', 'green'] });

    expect(expectSolved(solve(state)).moves).toEqual([
      { type: 'deliver', from: 0 },
      { type: 'deliver', from: 1 },
    ]);
  });

  it('returns a sequence that really wins', () => {
    const state = makeState({
      stacks: [['red', 'blue', 'green'], ['yellow'], []],
      orders: ['red', 'yellow', 'blue', 'green'],
    });

    const { moves } = expectSolved(solve(state));
    const result = replay(state, moves);

    expect(result.ok && result.state.status).toBe('won');
  });

  it('finds the shortest solution, not just any solution', () => {
    // Moving blue onto green works too, but costs two extra moves later.
    const state = makeState({
      stacks: [['red', 'blue'], ['green'], []],
      orders: ['red', 'green', 'blue'],
    });

    expect(expectSolved(solve(state)).moves).toHaveLength(4);
  });

  it('reports "unsolvable" when no sequence wins', () => {
    // Blue is buried under red and there is nowhere to put red.
    const state = makeState({ stacks: [['blue', 'red']], maxHeight: 2, orders: ['blue'] });
    expect(solve(state).status).toBe('unsolvable');
  });

  it('respects the move limit', () => {
    // Needs 4 moves, but only 3 are allowed.
    const state = makeState({
      stacks: [['red', 'blue'], ['green'], []],
      orders: ['red', 'green', 'blue'],
      moveLimit: 3,
    });
    expect(solve(state).status).toBe('unsolvable');
  });

  it('gives up after maxStates', () => {
    const state = makeState({
      stacks: [['red', 'blue', 'green'], ['yellow'], []],
      orders: ['red', 'yellow', 'blue', 'green'],
    });
    expect(solve(state, { maxStates: 2 }).status).toBe('gave-up');
  });

  it('solves under custom rules', () => {
    // Stack 2 may never be used, so blue has to go onto green and move again:
    // blue 0→1, deliver red, blue 1→0, deliver green, deliver blue.
    const noStackTwo: Rule = {
      name: 'no-stack-two',
      validate: (_state, move) => (move.type === 'move' && move.to === 2 ? 'stack-full' : null),
    };
    const state = makeState({
      stacks: [['red', 'blue'], ['green'], []],
      orders: ['red', 'green', 'blue'],
    });

    const result = expectSolved(solve(state, { rules: [...STANDARD_RULES, noStackTwo] }));

    expect(result.moves).toHaveLength(5);
  });

  it('counts the states it explored', () => {
    const state = makeState({
      stacks: [['red', 'blue'], ['green'], []],
      orders: ['red', 'green', 'blue'],
    });
    expect(solve(state).statesExplored).toBeGreaterThan(1);
  });
});
