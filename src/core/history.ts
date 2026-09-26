/**
 * Undo history as an immutable value: the present plus every earlier value.
 * Because game states are immutable and share unchanged stacks, keeping all of
 * them is cheap, and undo is just "step back to the previous value".
 */
export interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
}

export function createHistory<T>(present: T): History<T> {
  return { past: [], present };
}

export function pushHistory<T>(history: History<T>, next: T): History<T> {
  return { past: [...history.past, history.present], present: next };
}

/** Steps back one value. Undoing with no past returns the same history. */
export function undoHistory<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return { past: history.past.slice(0, -1), present: previous };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}
