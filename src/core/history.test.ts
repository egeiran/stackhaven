import { describe, expect, it } from 'vitest';
import { canUndo, createHistory, pushHistory, undoHistory } from './history';

describe('history', () => {
  it('starts with nothing to undo', () => {
    const history = createHistory('a');
    expect(history.present).toBe('a');
    expect(canUndo(history)).toBe(false);
  });

  it('undoes back through every pushed value', () => {
    let history = createHistory('a');
    history = pushHistory(history, 'b');
    history = pushHistory(history, 'c');

    history = undoHistory(history);
    expect(history.present).toBe('b');
    history = undoHistory(history);
    expect(history.present).toBe('a');
    expect(canUndo(history)).toBe(false);
  });

  it('ignores undo when there is no past', () => {
    const history = createHistory('a');
    expect(undoHistory(history)).toBe(history);
  });

  it('does not change the history it was given', () => {
    const before = pushHistory(createHistory('a'), 'b');
    undoHistory(before);
    pushHistory(before, 'c');
    expect(before).toEqual({ past: ['a'], present: 'b' });
  });
});
