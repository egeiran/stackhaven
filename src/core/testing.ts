import { createInitialState, type Level } from './level';
import type { GameState } from './types';

// Helpers for tests only. Not exported from core/index.ts.

export function makeLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: 'test-level',
    name: 'Test level',
    stacks: [['red', 'blue'], ['green'], []],
    maxHeight: 3,
    orders: ['blue', 'red'],
    moveLimit: 10,
    par: 2,
    solution: [
      { type: 'deliver', from: 0 },
      { type: 'deliver', from: 0 },
    ],
    ...overrides,
  };
}

export function makeState(overrides: Partial<Level> = {}): GameState {
  return createInitialState(makeLevel(overrides));
}
