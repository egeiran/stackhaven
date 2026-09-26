import type { Rule } from './rules';
import type { GameState, Move } from './types';

export interface SolveOptions {
  /** Rules to solve under. Defaults to STANDARD_RULES. */
  readonly rules?: readonly Rule[];
  /** Give up after exploring this many distinct states. */
  readonly maxStates?: number;
}

export type SolveResult =
  | {
      readonly status: 'solved';
      /** A shortest winning sequence of moves. */
      readonly moves: readonly Move[];
      readonly statesExplored: number;
    }
  | { readonly status: 'unsolvable'; readonly statesExplored: number }
  | { readonly status: 'gave-up'; readonly statesExplored: number };

/**
 * Finds a shortest sequence of moves that wins from `state`.
 *
 * TODO(M2, Eivind): implement this yourself – first BFS (with state hashing and
 * a visited set), then A* with a heuristic. The skipped tests in
 * solver.test.ts describe the expected behaviour: remove `.skip` to start.
 * Building blocks you can use: applyMove, getLegalMoves (engine.ts).
 */
export function solve(_state: GameState, _options: SolveOptions = {}): SolveResult {
  throw new Error('solve() is not implemented yet – see plan.md, M2');
}
