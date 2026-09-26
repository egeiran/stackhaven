import type { GameEvent, GameState, Move, MoveError, Stack } from './types';

/** What a rule may do after a legal move has been performed. */
export interface RuleEffect {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

/**
 * A rule is one small, independent piece of the game logic.
 *
 * - `validate` runs before a move and can forbid it.
 * - `afterMove` runs after the move has been performed and can change the
 *   state and emit extra events (e.g. "the level is won").
 *
 * New mechanics (reefer containers, locked stacks, storms, …) are added as new
 * rules in a rule list, instead of by editing applyMove.
 */
export interface Rule {
  readonly name: string;
  validate?(state: GameState, move: Move): MoveError | null;
  afterMove?(state: GameState, move: Move): RuleEffect | null;
}

export function topOf(stack: Stack | undefined) {
  return stack?.at(-1);
}

export const stackExistsRule: Rule = {
  name: 'stack-exists',
  validate(state, move) {
    const exists = (index: number) =>
      Number.isInteger(index) && index >= 0 && index < state.stacks.length;
    if (!exists(move.from)) return 'no-such-stack';
    if (move.type === 'move' && !exists(move.to)) return 'no-such-stack';
    return null;
  },
};

export const differentStacksRule: Rule = {
  name: 'different-stacks',
  validate: (_state, move) => (move.type === 'move' && move.from === move.to ? 'same-stack' : null),
};

export const sourceNotEmptyRule: Rule = {
  name: 'source-not-empty',
  validate: (state, move) => (topOf(state.stacks[move.from]) ? null : 'empty-stack'),
};

export const capacityRule: Rule = {
  name: 'capacity',
  validate(state, move) {
    if (move.type !== 'move') return null;
    const target = state.stacks[move.to] ?? [];
    return target.length >= state.maxHeight ? 'stack-full' : null;
  },
};

export const deliveryOrderRule: Rule = {
  name: 'delivery-order',
  validate(state, move) {
    if (move.type !== 'deliver') return null;
    const wanted = state.orders[0];
    if (wanted === undefined) return 'no-orders';
    return topOf(state.stacks[move.from])?.color === wanted ? null : 'wrong-color';
  },
};

export const winRule: Rule = {
  name: 'win',
  afterMove(state) {
    if (state.status !== 'playing' || state.orders.length > 0) return null;
    return {
      state: { ...state, status: 'won' },
      events: [{ type: 'LevelWon', movesUsed: state.movesUsed }],
    };
  },
};

export const moveLimitRule: Rule = {
  name: 'move-limit',
  afterMove(state) {
    if (state.status !== 'playing' || state.movesUsed < state.moveLimit) return null;
    return {
      state: { ...state, status: 'lost' },
      events: [{ type: 'LevelLost', movesUsed: state.movesUsed }],
    };
  },
};

/**
 * The version 1 rules, in evaluation order. Order matters: stackExists runs
 * first so later rules can index safely, and win runs before moveLimit so that
 * winning on the very last allowed move counts as a win.
 */
export const STANDARD_RULES: readonly Rule[] = [
  stackExistsRule,
  differentStacksRule,
  sourceNotEmptyRule,
  capacityRule,
  deliveryOrderRule,
  winRule,
  moveLimitRule,
];
