import { describe, expect, it } from 'vitest';
import { makeLevel } from '../core/testing';
import { checkDraft } from './check';

describe('checkDraft', () => {
  it('accepts a finished level', () => {
    expect(checkDraft(makeLevel())).toMatchObject({ problems: [] });
  });

  it('reports schema problems with their path', () => {
    const check = checkDraft(makeLevel({ orders: [] }));
    expect(check.level).toBeNull();
    expect(check.problems[0]).toMatch(/^orders:/);
  });

  it('asks for a solution when there is none', () => {
    const check = checkDraft(makeLevel({ solution: [] }));
    expect(check.level).not.toBeNull();
    expect(check.problems[0]).toMatch(/No solution yet/);
  });

  it('points at the first illegal solution move', () => {
    const check = checkDraft(makeLevel({ solution: [{ type: 'deliver', from: 1 }] }));
    expect(check.problems[0]).toMatch(/move 1 is not allowed \(wrong-color\)/);
  });

  it('notices when par does not match the solution', () => {
    expect(checkDraft(makeLevel({ par: 3 })).problems[0]).toMatch(/takes 2 moves, but par is 3/);
  });
});
