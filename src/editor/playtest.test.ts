import { describe, expect, it } from 'vitest';
import { makeLevel } from '../core/testing';
import { playtestReducer, startPlaytest, type Playtest, type PlaytestAction } from './playtest';

// Stacks [red, blue] [green] [] with orders red, green, blue (par 4).
const level = makeLevel({
  stacks: [['red', 'blue'], ['green'], []],
  orders: ['red', 'green', 'blue'],
});

function run(...actions: PlaytestAction[]): Playtest {
  return actions.reduce(playtestReducer, startPlaytest(level));
}
const tap = (index: number): PlaytestAction => ({ type: 'tap-stack', index });
const truck: PlaytestAction = { type: 'tap-truck' };

describe('playtest', () => {
  it('records the moves of a winning run', () => {
    const playtest = run(tap(0), tap(2), tap(0), truck, tap(1), truck, tap(2), truck);

    expect(playtest.history.present.status).toBe('won');
    expect(playtest.moves).toEqual([
      { type: 'move', from: 0, to: 2 },
      { type: 'deliver', from: 0 },
      { type: 'deliver', from: 1 },
      { type: 'deliver', from: 2 },
    ]);
  });

  it('explains illegal taps without recording anything', () => {
    expect(run(truck).feedback).toBe('select-first');
    expect(run(tap(2)).feedback).toBe('empty-stack');
    expect(run(tap(1), truck)).toMatchObject({ feedback: 'wrong-color', moves: [] });
  });

  it('undo also removes the last recorded move', () => {
    const playtest = run(tap(0), tap(2), tap(0), truck, { type: 'undo' });
    expect(playtest.moves).toEqual([{ type: 'move', from: 0, to: 2 }]);
    expect(playtest.history.present.movesUsed).toBe(1);
  });
});
