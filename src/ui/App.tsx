import type { GameController } from '../app/GameController';
import { Hud } from './Hud';
import { LevelSelect } from './LevelSelect';
import { ResultModal } from './ResultModal';
import { useGameView } from './useGameView';
import './ui.css';

export function App({ controller }: { readonly controller: GameController }) {
  const view = useGameView(controller);
  const { level, state, outcome } = view;

  if (view.screen === 'level-select' || !level || !state) {
    return <LevelSelect levels={view.levels} onPick={(id) => controller.startLevel(id)} />;
  }

  return (
    <>
      <Hud controller={controller} view={view} level={level} state={state} />
      {outcome && (
        <ResultModal
          controller={controller}
          outcome={outcome}
          movesUsed={state.movesUsed}
          par={level.par}
          hasNextLevel={view.hasNextLevel}
        />
      )}
    </>
  );
}
