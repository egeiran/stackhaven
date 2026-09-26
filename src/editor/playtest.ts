import {
  applyMove,
  canUndo,
  createHistory,
  createInitialState,
  pushHistory,
  undoHistory,
  type GameState,
  type History,
  type Level,
  type Move,
} from '../core';
import type { Feedback } from '../app/GameController';

/** Playing a draft inside the editor, recording the moves so they can become its solution. */
export interface Playtest {
  readonly history: History<GameState>;
  /** The moves that led to history.present, in order. */
  readonly moves: readonly Move[];
  readonly selected: number | null;
  readonly feedback: Feedback | null;
}

export type PlaytestAction =
  | { readonly type: 'tap-stack'; readonly index: number }
  | { readonly type: 'tap-truck' }
  | { readonly type: 'undo' };

export function startPlaytest(level: Level): Playtest {
  return {
    history: createHistory(createInitialState(level)),
    moves: [],
    selected: null,
    feedback: null,
  };
}

/** Same controls as the game: tap a stack, then another stack or the truck. */
export function playtestReducer(playtest: Playtest, action: PlaytestAction): Playtest {
  const state = playtest.history.present;

  if (action.type === 'undo') {
    if (!canUndo(playtest.history)) return playtest;
    return {
      history: undoHistory(playtest.history),
      moves: playtest.moves.slice(0, -1),
      selected: null,
      feedback: null,
    };
  }
  if (state.status !== 'playing') return playtest;

  const selected = playtest.selected;
  if (action.type === 'tap-truck') {
    if (selected === null) return { ...playtest, feedback: 'select-first' };
    return play(playtest, { type: 'deliver', from: selected });
  }
  if (selected === null) {
    if (!state.stacks[action.index]?.length) return { ...playtest, feedback: 'empty-stack' };
    return { ...playtest, selected: action.index, feedback: null };
  }
  if (selected === action.index) return { ...playtest, selected: null, feedback: null };
  return play(playtest, { type: 'move', from: selected, to: action.index });
}

function play(playtest: Playtest, move: Move): Playtest {
  const result = applyMove(playtest.history.present, move);
  if (!result.ok) return { ...playtest, feedback: result.error };
  return {
    history: pushHistory(playtest.history, result.state),
    moves: [...playtest.moves, move],
    selected: null,
    feedback: null,
  };
}
