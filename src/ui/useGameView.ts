import { useSyncExternalStore } from 'react';
import type { GameController, GameView } from '../app/GameController';

/**
 * Subscribes a component to the controller. React re-renders whenever the
 * controller publishes a new GameView snapshot.
 */
export function useGameView(controller: GameController): GameView {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot);
}
