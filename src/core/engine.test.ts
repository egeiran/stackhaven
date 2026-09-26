import { describe, expect, it } from 'vitest';
import { applyMove, getLegalMoves, replay, validateMove } from './engine';
import { STANDARD_RULES, type Rule } from './rules';
import { makeState } from './testing';
import type { GameState, Move, MoveResult } from './types';

function expectOk(result: MoveResult) {
  if (!result.ok) throw new Error(`expected a legal move, got "${result.error}"`);
  return result;
}

function colors(state: GameState) {
  return state.stacks.map((stack) => stack.map((container) => container.color));
}

describe('move', () => {
  it('moves the top container to another stack and counts one move', () => {
    const state = makeState({ stacks: [['red', 'blue'], ['green'], []] });

    const result = expectOk(applyMove(state, { type: 'move', from: 0, to: 2 }));

    expect(colors(result.state)).toEqual([['red'], ['green'], ['blue']]);
    expect(result.state.movesUsed).toBe(1);
    expect(result.events).toEqual([
      { type: 'ContainerLifted', containerId: 'c1', from: 0, height: 1 },
      { type: 'ContainerPlaced', containerId: 'c1', to: 2, height: 0 },
    ]);
  });

  it('never mutates the state it was given', () => {
    const state = makeState({ stacks: [['red', 'blue'], ['green'], []] });
    const snapshot = structuredClone(state);

    applyMove(state, { type: 'move', from: 0, to: 1 });

    expect(state).toEqual(snapshot);
  });

  it('shares stacks that did not change (structural sharing)', () => {
    const state = makeState({ stacks: [['red', 'blue'], ['green'], []] });

    const result = expectOk(applyMove(state, { type: 'move', from: 0, to: 2 }));

    expect(result.state.stacks[1]).toBe(state.stacks[1]);
  });

  it('rejects moving onto a full stack', () => {
    const state = makeState({ stacks: [['red'], ['green', 'blue']], maxHeight: 2 });
    expect(applyMove(state, { type: 'move', from: 0, to: 1 })).toEqual({
      ok: false,
      error: 'stack-full',
    });
  });

  it('rejects moving from an empty stack', () => {
    const state = makeState({ stacks: [['red', 'blue'], []] });
    expect(validateMove(state, { type: 'move', from: 1, to: 0 })).toBe('empty-stack');
  });

  it('rejects moving a container onto its own stack', () => {
    const state = makeState();
    expect(validateMove(state, { type: 'move', from: 0, to: 0 })).toBe('same-stack');
  });

  it.each<Move>([
    { type: 'move', from: 0, to: 9 },
    { type: 'move', from: -1, to: 0 },
    { type: 'deliver', from: 3 },
    { type: 'deliver', from: 0.5 },
  ])('rejects stacks that do not exist: %o', (move) => {
    expect(validateMove(makeState(), move)).toBe('no-such-stack');
  });
});

describe('deliver', () => {
  it('delivers the top container when it matches the first order', () => {
    const state = makeState({ stacks: [['red', 'blue'], ['green']], orders: ['blue', 'red'] });

    const result = expectOk(applyMove(state, { type: 'deliver', from: 0 }));

    expect(colors(result.state)).toEqual([['red'], ['green']]);
    expect(result.state.orders).toEqual(['red']);
    expect(result.state.movesUsed).toBe(1);
    expect(result.events).toEqual([
      { type: 'ContainerLifted', containerId: 'c1', from: 0, height: 1 },
      { type: 'ContainerDelivered', containerId: 'c1', color: 'blue', nextOrder: 'red' },
    ]);
  });

  it('rejects a container that is not the first order', () => {
    const state = makeState({ stacks: [['red', 'blue'], ['green']], orders: ['red', 'blue'] });
    expect(validateMove(state, { type: 'deliver', from: 0 })).toBe('wrong-color');
  });

  it('rejects delivery when there are no orders left', () => {
    const state: GameState = { ...makeState(), orders: [] };
    expect(validateMove(state, { type: 'deliver', from: 0 })).toBe('no-orders');
  });
});

describe('winning and losing', () => {
  it('wins when the last order is delivered', () => {
    const state = makeState({ stacks: [['blue']], orders: ['blue'] });

    const result = expectOk(applyMove(state, { type: 'deliver', from: 0 }));

    expect(result.state.status).toBe('won');
    expect(result.events.at(-1)).toEqual({ type: 'LevelWon', movesUsed: 1 });
  });

  it('loses when the move limit is used up without winning', () => {
    const state = makeState({ stacks: [['red', 'blue'], []], orders: ['red'], moveLimit: 1 });

    const result = expectOk(applyMove(state, { type: 'move', from: 0, to: 1 }));

    expect(result.state.status).toBe('lost');
    expect(result.events.at(-1)).toEqual({ type: 'LevelLost', movesUsed: 1 });
  });

  it('counts a win on the very last allowed move as a win', () => {
    const state = makeState({ stacks: [['blue']], orders: ['blue'], moveLimit: 1 });

    const result = expectOk(applyMove(state, { type: 'deliver', from: 0 }));

    expect(result.state.status).toBe('won');
    expect(result.events.map((event) => event.type)).not.toContain('LevelLost');
  });

  it('rejects every move once the game is over', () => {
    const state: GameState = { ...makeState(), status: 'won' };
    expect(validateMove(state, { type: 'move', from: 0, to: 2 })).toBe('game-over');
  });
});

describe('getLegalMoves', () => {
  it('lists exactly the legal moves', () => {
    const state = makeState({
      stacks: [['red', 'blue'], ['green', 'red'], []],
      maxHeight: 2,
      orders: ['blue'],
    });

    expect(getLegalMoves(state)).toEqual([
      { type: 'deliver', from: 0 },
      { type: 'move', from: 0, to: 2 },
      { type: 'move', from: 1, to: 2 },
    ]);
  });
});

describe('replay', () => {
  it('applies a list of moves and collects all events', () => {
    const state = makeState({ stacks: [['red', 'blue'], []], orders: ['red', 'blue'] });

    const result = replay(state, [
      { type: 'move', from: 0, to: 1 },
      { type: 'deliver', from: 0 },
      { type: 'deliver', from: 1 },
    ]);

    expect(result.ok && result.state.status).toBe('won');
    expect(result.ok && result.events.length).toBe(7);
  });

  it('reports the index of the first illegal move', () => {
    const state = makeState({ stacks: [['red', 'blue'], []], orders: ['red', 'blue'] });

    const result = replay(state, [
      { type: 'move', from: 0, to: 1 },
      { type: 'deliver', from: 1 },
    ]);

    expect(result).toMatchObject({ ok: false, error: 'wrong-color', index: 1 });
  });
});

describe('custom rules (how new mechanics plug in)', () => {
  // A "locked stack" mechanic, written the way a future rule would be. It needs
  // no changes to applyMove: it only adds itself to the rule list. (A real
  // mechanic would also add its own MoveError, e.g. 'stack-locked'.)
  const lockedStacks = new Set([1]);
  const lockedStackRule: Rule = {
    name: 'locked-stack',
    validate(_state, move) {
      const touched = move.type === 'move' ? [move.from, move.to] : [move.from];
      return touched.some((index) => lockedStacks.has(index)) ? 'no-such-stack' : null;
    },
  };

  it('lets an extra rule forbid moves', () => {
    const rules = [...STANDARD_RULES, lockedStackRule];
    const state = makeState({ stacks: [['red', 'blue'], ['green'], []] });

    expect(validateMove(state, { type: 'move', from: 0, to: 1 }, rules)).toBe('no-such-stack');
    expect(validateMove(state, { type: 'move', from: 0, to: 2 }, rules)).toBeNull();
  });

  it('lets an extra rule change the state after a move', () => {
    // A (silly) rule that refunds every delivery, to show that afterMove can
    // transform the state produced by the move.
    const refundRule: Rule = {
      name: 'refund-deliveries',
      afterMove: (state, move) =>
        move.type === 'deliver'
          ? { state: { ...state, movesUsed: state.movesUsed - 1 }, events: [] }
          : null,
    };
    const state = makeState({ stacks: [['red', 'blue']], orders: ['blue', 'red'] });

    const result = expectOk(
      applyMove(state, { type: 'deliver', from: 0 }, [...STANDARD_RULES, refundRule]),
    );

    expect(result.state.movesUsed).toBe(0);
  });
});
