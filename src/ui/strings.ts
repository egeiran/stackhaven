import type { Feedback } from '../app/GameController';
import { PALETTE, type ContainerColor } from '../core';

// All player-facing text in one place, so translating later is one file.

export const STRINGS = {
  title: 'Stackhaven',
  tagline: 'Container yard puzzles',
  levels: 'Levels',
  moves: 'Moves',
  next: 'Next',
  undo: 'Undo',
  restart: 'Restart',
  hintPick: 'Tap a stack to pick up its top container.',
  hintPlace: 'Tap another stack to move it there, or the truck to deliver it.',
  wonTitle: 'Shift complete!',
  lostTitle: 'Out of moves',
  lostBody: 'Some trucks are still waiting. Undo a move or start over.',
  nextLevel: 'Next shift',
  replay: 'Play again',
  tryAgain: 'Try again',
  undoLast: 'Undo last move',
} as const;

export function colorName(color: ContainerColor): string {
  return PALETTE[color].label.toLowerCase();
}

export function feedbackText(feedback: Feedback, nextOrder: ContainerColor | undefined): string {
  switch (feedback) {
    case 'empty-stack':
      return 'That stack is empty.';
    case 'stack-full':
      return 'That stack is full.';
    case 'wrong-color':
      return nextOrder ? `The truck is waiting for ${colorName(nextOrder)}.` : 'Wrong container.';
    case 'select-first':
      return 'Pick a stack first, then tap the truck.';
    case 'no-orders':
      return 'No trucks are waiting.';
    case 'same-stack':
      return 'Pick a different stack.';
    case 'no-such-stack':
      return 'There is no stack there.';
    case 'game-over':
      return 'This shift is over.';
  }
}

export function movesSummary(moves: number, par: number): string {
  return `${moves} moves · par ${par}`;
}
