import type { ContainerColor } from './palette';

export interface Container {
  /** Stable for the whole level, so the renderer can track a container across moves. */
  readonly id: string;
  readonly color: ContainerColor;
}

/** Containers in one stack, bottom first: the last element is the top. */
export type Stack = readonly Container[];

export type GameStatus = 'playing' | 'won' | 'lost';

/**
 * Everything that can change while a level is played. It is never mutated:
 * every move produces a new GameState (unchanged stacks are shared).
 */
export interface GameState {
  readonly stacks: readonly Stack[];
  readonly maxHeight: number;
  /** Remaining orders, in delivery order. Only the first can be fulfilled. */
  readonly orders: readonly ContainerColor[];
  readonly movesUsed: number;
  readonly moveLimit: number;
  readonly status: GameStatus;
}

export type Move =
  /** Move the top container of `from` onto `to`. */
  | { readonly type: 'move'; readonly from: number; readonly to: number }
  /** Deliver the top container of `from` to the truck at the front of the order queue. */
  | { readonly type: 'deliver'; readonly from: number };

/**
 * Facts about what happened during a move, in the order they happened.
 * The renderer animates these; it never has to work out the rules itself.
 * `height` is the container's index in its stack (0 = on the ground).
 */
export type GameEvent =
  | {
      readonly type: 'ContainerLifted';
      readonly containerId: string;
      readonly from: number;
      readonly height: number;
    }
  | {
      readonly type: 'ContainerPlaced';
      readonly containerId: string;
      readonly to: number;
      readonly height: number;
    }
  | {
      readonly type: 'ContainerDelivered';
      readonly containerId: string;
      readonly color: ContainerColor;
      /** The order the next truck will carry, or null when the queue is empty. */
      readonly nextOrder: ContainerColor | null;
    }
  | { readonly type: 'LevelWon'; readonly movesUsed: number }
  | { readonly type: 'LevelLost'; readonly movesUsed: number };

/** Why a move was rejected. */
export type MoveError =
  | 'game-over'
  | 'no-such-stack'
  | 'same-stack'
  | 'empty-stack'
  | 'stack-full'
  | 'no-orders'
  | 'wrong-color';

export type MoveResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly error: MoveError };
