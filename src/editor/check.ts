import { createInitialState, levelSchema, replay, type Level } from '../core';

export interface DraftCheck {
  /** The validated level, or null if the draft breaks the level schema. */
  readonly level: Level | null;
  /** Everything that stops the draft from being a finished level file. */
  readonly problems: readonly string[];
}

/**
 * The same checks as src/app/levels.test.ts, for a draft: it must match the
 * schema, and its solution must win in exactly `par` moves. A draft that
 * passes can be saved to src/levels as it is.
 */
export function checkDraft(draft: Level): DraftCheck {
  const parsed = levelSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      level: null,
      problems: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || 'level'}: ${issue.message}`,
      ),
    };
  }

  const level = parsed.data;
  return { level, problems: solutionProblems(level) };
}

function solutionProblems(level: Level): string[] {
  if (level.solution.length === 0) {
    return ['No solution yet: playtest the level and save your winning moves.'];
  }
  const result = replay(createInitialState(level), level.solution);
  if (!result.ok) {
    return [`Solution move ${result.index + 1} is not allowed (${result.error}).`];
  }
  if (result.state.status !== 'won') return ['The solution does not win the level.'];
  if (level.solution.length !== level.par) {
    return [`The solution takes ${level.solution.length} moves, but par is ${level.par}.`];
  }
  return [];
}
