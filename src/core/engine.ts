import { STANDARD_RULES, topOf, type Rule, type RuleEffect } from './rules';
import type { GameEvent, GameState, Move, MoveError, MoveResult } from './types';

/** Returns why `move` is illegal in `state`, or null if it is legal. */
export function validateMove(
  state: GameState,
  move: Move,
  rules: readonly Rule[] = STANDARD_RULES,
): MoveError | null {
  if (state.status !== 'playing') return 'game-over';
  for (const rule of rules) {
    const error = rule.validate?.(state, move) ?? null;
    if (error) return error;
  }
  return null;
}

/**
 * The heart of the game: a pure function from (state, move) to a new state
 * plus the events that describe what happened. It never mutates `state`, never
 * touches the screen and always gives the same answer for the same input.
 */
export function applyMove(
  state: GameState,
  move: Move,
  rules: readonly Rule[] = STANDARD_RULES,
): MoveResult {
  const error = validateMove(state, move, rules);
  if (error) return { ok: false, error };

  const performed = perform(state, move);
  let next = performed.state;
  const events: GameEvent[] = [...performed.events];

  for (const rule of rules) {
    const effect = rule.afterMove?.(next, move);
    if (effect) {
      next = effect.state;
      events.push(...effect.events);
    }
  }

  return { ok: true, state: next, events };
}

/** Every legal move in `state`. Handy for UI hints (and for a solver). */
export function getLegalMoves(state: GameState, rules: readonly Rule[] = STANDARD_RULES): Move[] {
  const candidates: Move[] = [];
  state.stacks.forEach((_, from) => {
    candidates.push({ type: 'deliver', from });
    state.stacks.forEach((_, to) => {
      if (to !== from) candidates.push({ type: 'move', from, to });
    });
  });
  return candidates.filter((move) => validateMove(state, move, rules) === null);
}

export type ReplayResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | {
      readonly ok: false;
      readonly error: MoveError;
      /** Index of the move that failed. */
      readonly index: number;
      /** State just before the failing move. */
      readonly state: GameState;
    };

/** Applies `moves` one by one, stopping at the first illegal move. */
export function replay(
  state: GameState,
  moves: readonly Move[],
  rules: readonly Rule[] = STANDARD_RULES,
): ReplayResult {
  let current = state;
  const events: GameEvent[] = [];
  for (const [index, move] of moves.entries()) {
    const result = applyMove(current, move, rules);
    if (!result.ok) return { ok: false, error: result.error, index, state: current };
    current = result.state;
    events.push(...result.events);
  }
  return { ok: true, state: current, events };
}

/**
 * The physical part of a move: take the top container off one stack and put it
 * on another stack or on the truck. Legality has already been checked by the
 * rules, so a failure here means a rule is missing: that's a bug, so throw.
 */
function perform(state: GameState, move: Move): RuleEffect {
  const source = state.stacks[move.from];
  const container = topOf(source);
  if (!source || !container) {
    throw new Error(`perform: stack ${move.from} has no container to lift`);
  }

  const stacks = [...state.stacks];
  stacks[move.from] = source.slice(0, -1);
  const movesUsed = state.movesUsed + 1;
  const lifted: GameEvent = {
    type: 'ContainerLifted',
    containerId: container.id,
    from: move.from,
    height: source.length - 1,
  };

  switch (move.type) {
    case 'move': {
      const target = stacks[move.to];
      if (!target) throw new Error(`perform: stack ${move.to} does not exist`);
      stacks[move.to] = [...target, container];
      return {
        state: { ...state, stacks, movesUsed },
        events: [
          lifted,
          {
            type: 'ContainerPlaced',
            containerId: container.id,
            to: move.to,
            height: target.length,
          },
        ],
      };
    }
    case 'deliver': {
      const orders = state.orders.slice(1);
      return {
        state: { ...state, stacks, orders, movesUsed },
        events: [
          lifted,
          {
            type: 'ContainerDelivered',
            containerId: container.id,
            color: container.color,
            nextOrder: orders[0] ?? null,
          },
        ],
      };
    }
  }
}
