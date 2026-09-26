import type { GameController, GameView } from '../app/GameController';
import { computeStars, TWO_STAR_MARGIN, type GameState, type Level } from '../core';
import { OrderQueue } from './OrderQueue';
import { Stars } from './Stars';
import { feedbackText, STRINGS } from './strings';

interface HudProps {
  readonly controller: GameController;
  readonly view: GameView;
  readonly level: Level;
  readonly state: GameState;
}

export function Hud({ controller, view, level, state }: HudProps) {
  const levelNumber = view.levels.findIndex((summary) => summary.id === level.id) + 1;
  const movesLeft = state.moveLimit - state.movesUsed;
  // Every remaining order needs at least one more move, so this is the best the player can still get.
  const bestPossible = computeStars(state.movesUsed + state.orders.length, level.par);

  return (
    <div className="hud">
      <header className="hud__top panel">
        <div className="hud__row">
          <button className="button button--quiet" onClick={() => controller.openLevelSelect()}>
            ‹ {STRINGS.levels}
          </button>
          <h1 className="hud__title">
            <span className="hud__number">{levelNumber}</span> {level.name}
          </h1>
          <div className={movesLeft <= 2 ? 'moves moves--low' : 'moves'}>
            <span className="moves__value">
              {state.movesUsed}/{state.moveLimit}
            </span>
            <span className="moves__label">{STRINGS.moves}</span>
          </div>
        </div>
        <div className="hud__row hud__row--sub">
          <OrderQueue orders={state.orders} />
          <div className="par" title="Moves for three and two stars">
            <Stars lit={bestPossible} />
            <span className="par__text">
              ★★★ ≤{level.par} · ★★ ≤{level.par + TWO_STAR_MARGIN}
            </span>
          </div>
        </div>
      </header>

      <footer className="hud__bottom">
        <p className="hint" aria-live="polite">
          {view.feedback ? (
            <span key={view.feedback.seq} className="hint__feedback">
              {feedbackText(view.feedback.message, view.feedback.nextOrder)}
            </span>
          ) : view.selectedStack === null ? (
            STRINGS.hintPick
          ) : (
            STRINGS.hintPlace
          )}
        </p>
        <div className="hud__actions">
          <button className="button" onClick={() => controller.undo()} disabled={!view.canUndo}>
            ↶ {STRINGS.undo}
          </button>
          <button className="button" onClick={() => controller.restart()} disabled={!view.canUndo}>
            ⟲ {STRINGS.restart}
          </button>
        </div>
      </footer>
    </div>
  );
}
