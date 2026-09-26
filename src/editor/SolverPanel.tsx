import { useState } from 'react';
import { createInitialState, solve, type Level, type Move } from '../core';

interface SolverPanelProps {
  readonly level: Level | null;
  readonly onUseSolution: (moves: readonly Move[]) => void;
}

type SolverOutput =
  | { readonly kind: 'solved'; readonly moves: readonly Move[]; readonly states: number }
  | { readonly kind: 'message'; readonly text: string };

const MAX_STATES = 500_000;

/**
 * Runs the solver from core/solver.ts on the draft. Until solve() is written
 * (milestone 2) it shows the "not implemented" error instead.
 */
export function SolverPanel({ level, onUseSolution }: SolverPanelProps) {
  const [output, setOutput] = useState<SolverOutput | null>(null);

  const run = () => {
    if (!level) return;
    try {
      const result = solve(createInitialState(level), { maxStates: MAX_STATES });
      if (result.status === 'solved') {
        setOutput({ kind: 'solved', moves: result.moves, states: result.statesExplored });
      } else if (result.status === 'unsolvable') {
        setOutput({ kind: 'message', text: `No solution (${result.statesExplored} states).` });
      } else {
        setOutput({
          kind: 'message',
          text: `Gave up after ${result.statesExplored} states.`,
        });
      }
    } catch (error) {
      setOutput({ kind: 'message', text: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="solver">
      <button className="button" onClick={run} disabled={!level}>
        Solve
      </button>
      {output?.kind === 'message' && <p className="solver__text">{output.text}</p>}
      {output?.kind === 'solved' && (
        <div className="solver__text">
          <p>
            Optimal: <strong>{output.moves.length} moves</strong> · difficulty:{' '}
            {output.states.toLocaleString('en')} states explored
          </p>
          {level && output.moves.length !== level.par && (
            <p className="warn">
              Par is {level.par}, so it should be {output.moves.length}.
            </p>
          )}
          <button className="button" onClick={() => onUseSolution(output.moves)}>
            Use as solution
          </button>
        </div>
      )}
    </div>
  );
}
