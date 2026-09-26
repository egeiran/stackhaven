import type { GameEvent, GameState } from '../core';

/** Something the player tapped in the 3D scene. */
export type TapTarget =
  { readonly kind: 'stack'; readonly index: number } | { readonly kind: 'delivery' };

/** The selected stack and the container that will be moved from it. */
export interface Selection {
  readonly stack: number;
  readonly containerId: string;
}

/**
 * Everything GameController needs from a renderer. The three.js YardRenderer
 * implements it in the app; tests use a fake. This keeps app free of three.js
 * and lets the controller be tested without WebGL.
 */
export interface GameRenderer {
  /**
   * Show a state immediately, without animation (level start, undo, restart).
   * Aborts any running animation. null = empty quay.
   */
  showState(state: GameState | null): void;
  /**
   * Animate the events of one move. Resolves when the animation has finished
   * (or was aborted by showState); after that the scene matches `finalState`.
   */
  playEvents(events: readonly GameEvent[], finalState: GameState): Promise<void>;
  /** Highlight the selected stack and container, or clear the highlight with null. */
  setSelection(selection: Selection | null): void;
  /** How many moves are queued behind the one being animated, so the renderer can hurry. */
  setBacklog(count: number): void;
  /** Register the handler for taps in the scene. Returns an unsubscribe function. */
  onTap(handler: (target: TapTarget) => void): () => void;
}
