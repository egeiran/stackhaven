import { describe, expect, it } from 'vitest';
import { makeLevel } from '../core/testing';
import {
  addContainer,
  addOrder,
  MAX_STACKS,
  removeContainer,
  removeOrder,
  setMaxHeight,
  setSolution,
  setStackCount,
  slugify,
} from './draft';

describe('draft editing', () => {
  const level = makeLevel({ stacks: [['red', 'blue'], ['green'], []], maxHeight: 3 });

  it('adds and removes stacks at the end', () => {
    expect(setStackCount(level, 4).stacks).toEqual([['red', 'blue'], ['green'], [], []]);
    expect(setStackCount(level, 1).stacks).toEqual([['red', 'blue']]);
    expect(setStackCount(level, 99).stacks).toHaveLength(MAX_STACKS);
  });

  it('never lowers the height limit below the tallest stack', () => {
    expect(setMaxHeight(level, 1).maxHeight).toBe(2);
    expect(setMaxHeight(level, 5).maxHeight).toBe(5);
  });

  it('puts containers on top, but not above the height limit', () => {
    expect(addContainer(level, 1, 'yellow').stacks[1]).toEqual(['green', 'yellow']);
    const full = addContainer(level, 0, 'yellow');
    expect(addContainer(full, 0, 'purple')).toBe(full);
  });

  it('removes a container and lets the ones above drop down', () => {
    expect(removeContainer(level, 0, 0).stacks[0]).toEqual(['blue']);
  });

  it('edits the order queue', () => {
    const withOrder = addOrder(level, 'green');
    expect(withOrder.orders).toEqual([...level.orders, 'green']);
    expect(removeOrder(withOrder, 0).orders).toEqual([...level.orders.slice(1), 'green']);
  });

  it('stores a solution and sets par to its length', () => {
    const moves = [
      { type: 'deliver', from: 0 },
      { type: 'deliver', from: 0 },
    ] as const;
    const solved = setSolution(makeLevel({ moveLimit: 1, par: 1 }), moves);
    expect(solved).toMatchObject({ solution: moves, par: 2, moveLimit: 6 });
  });

  it('never changes the draft it was given', () => {
    const snapshot = structuredClone(level);
    addContainer(level, 1, 'red');
    removeContainer(level, 0, 1);
    setStackCount(level, 5);
    expect(level).toEqual(snapshot);
  });
});

describe('slugify', () => {
  it.each([
    ['Night Shift', 'night-shift'],
    ['  Kaia på Ålesund! ', 'kaia-pa-alesund'],
    ['Første bølge', 'forste-bolge'],
  ])('%s → %s', (name, id) => {
    expect(slugify(name)).toBe(id);
  });
});
