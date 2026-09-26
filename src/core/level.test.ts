import { describe, expect, it } from 'vitest';
import { createInitialState, parseLevel } from './level';
import { makeLevel } from './testing';

describe('parseLevel', () => {
  it('accepts a valid level', () => {
    const level = makeLevel();
    expect(parseLevel(level)).toEqual(level);
  });

  it('rejects colours that are not in the palette', () => {
    expect(() => parseLevel({ ...makeLevel(), stacks: [['pink']] })).toThrow(/stacks/);
  });

  it('rejects unknown keys, so typos in hand-written JSON are caught', () => {
    expect(() => parseLevel({ ...makeLevel(), moveLimt: 5 })).toThrow(/moveLimt/);
  });

  it('rejects a stack taller than maxHeight', () => {
    const level = makeLevel({ stacks: [['red', 'blue', 'green', 'red']], maxHeight: 3 });
    expect(() => parseLevel(level)).toThrow(/stack 0 holds 4 containers/);
  });

  it('rejects par above the move limit', () => {
    expect(() => parseLevel(makeLevel({ par: 11, moveLimit: 10 }))).toThrow(/par cannot exceed/);
  });

  it('rejects orders the yard cannot fulfil', () => {
    const level = makeLevel({ orders: ['blue', 'blue'] });
    expect(() => parseLevel(level)).toThrow(/2 × blue but the yard only has 1/);
  });

  it('rejects solution moves that point at missing stacks', () => {
    const level = makeLevel({ solution: [{ type: 'move', from: 0, to: 7 }] });
    expect(() => parseLevel(level)).toThrow(/does not exist/);
  });

  it('names the source in the error message', () => {
    expect(() => parseLevel({}, '03-example.json')).toThrow(/Invalid 03-example\.json/);
  });
});

describe('createInitialState', () => {
  it('builds stacks bottom first with stable, unique ids', () => {
    const state = createInitialState(makeLevel({ stacks: [['red', 'blue'], ['green'], []] }));

    expect(state.stacks).toEqual([
      [
        { id: 'c0', color: 'red' },
        { id: 'c1', color: 'blue' },
      ],
      [{ id: 'c2', color: 'green' }],
      [],
    ]);
  });

  it('starts a fresh game', () => {
    const state = createInitialState(makeLevel({ orders: ['blue', 'red'], moveLimit: 7 }));

    expect(state).toMatchObject({
      orders: ['blue', 'red'],
      movesUsed: 0,
      moveLimit: 7,
      maxHeight: 3,
      status: 'playing',
    });
  });
});
