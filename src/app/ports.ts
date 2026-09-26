import type { GameEvent, GameState } from '../core';

/** Something the player tapped in the 3D scene. */
export type TapTarget =
  { readonly kind: 'stack'; readonly index: number } | { readonly kind: 'delivery' };

/**
 * Everything GameController needs from a renderer. The three.js YardRenderer
 * implements it in the app; tests use a fake. This keeps app free of three.js
 * and lets the controller be tested without WebGL.
 */
export interface GameRenderer {
  /** Show a state immediately, without animation (level start, undo, restart). null = empty quay. */
  showState(state: GameState | null): void;
  /**
   * Animate the events of one move. Resolves when the animation has finished,
   * after which the scene must match `finalState`.
   */
  playEvents(events: readonly GameEvent[], finalState: GameState): Promise<void>;
  /** Highlight the selected stack, or clear the highlight with null. */
  setSelection(stack: number | null): void;
  /** Register the handler for taps in the scene. Returns an unsubscribe function. */
  onTap(handler: (target: TapTarget) => void): () => void;
}
