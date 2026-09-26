import type { LevelSummary } from '../app/GameController';
import { Stars } from './Stars';
import { STRINGS } from './strings';

interface LevelSelectProps {
  readonly levels: readonly LevelSummary[];
  readonly onPick: (id: string) => void;
}

export function LevelSelect({ levels, onPick }: LevelSelectProps) {
  return (
    <div className="screen">
      <div className="level-select panel">
        <h1 className="level-select__title">{STRINGS.title}</h1>
        <p className="level-select__tagline">{STRINGS.tagline}</p>
        <ol className="level-grid">
          {levels.map((level, index) => (
            <li key={level.id}>
              <button className="level-card" onClick={() => onPick(level.id)}>
                <span className="level-card__number">{index + 1}</span>
                <span className="level-card__name">{level.name}</span>
                <Stars lit={level.bestStars ?? 0} />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
