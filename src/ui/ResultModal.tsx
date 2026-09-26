import type { GameController, Outcome } from '../app/GameController';
import { Stars } from './Stars';
import { movesSummary, STRINGS } from './strings';

interface ResultModalProps {
  readonly controller: GameController;
  readonly outcome: Outcome;
  readonly movesUsed: number;
  readonly par: number;
  readonly hasNextLevel: boolean;
}

export function ResultModal({
  controller,
  outcome,
  movesUsed,
  par,
  hasNextLevel,
}: ResultModalProps) {
  const won = outcome.kind === 'won';
  return (
    <div className="screen screen--dim">
      <div className="modal panel" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title" className="modal__title">
          {won ? STRINGS.wonTitle : STRINGS.lostTitle}
        </h2>
        {won ? (
          <>
            <Stars lit={outcome.stars} size="large" />
            <p className="modal__body">{movesSummary(movesUsed, par)}</p>
          </>
        ) : (
          <p className="modal__body">{STRINGS.lostBody}</p>
        )}
        <div className="modal__actions">
          {won && hasNextLevel && (
            <button className="button button--primary" onClick={() => controller.nextLevel()}>
              {STRINGS.nextLevel}
            </button>
          )}
          {!won && (
            <button className="button button--primary" onClick={() => controller.undo()}>
              {STRINGS.undoLast}
            </button>
          )}
          <button className="button" onClick={() => controller.restart()}>
            {won ? STRINGS.replay : STRINGS.tryAgain}
          </button>
          <button className="button button--quiet" onClick={() => controller.openLevelSelect()}>
            {STRINGS.levels}
          </button>
        </div>
      </div>
    </div>
  );
}
