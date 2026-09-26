import { useEffect, useMemo, useState } from 'react';
import { encodeLevel } from '../app/levelLink';
import { LEVELS } from '../app/levelRegistry';
import { CONTAINER_COLORS, PALETTE, type ContainerColor, type Level } from '../core';
import { feedbackText } from '../ui/strings';
import { checkDraft } from './check';
import * as edit from './draft';
import { formatLevelJson } from './format';
import { playtestReducer, startPlaytest, type Playtest, type PlaytestAction } from './playtest';
import { SolverPanel } from './SolverPanel';
import { YardView } from './YardView';
import './editor.css';

const STORAGE_KEY = 'stackhaven.editor.draft';

/**
 * The level editor (editor.html): build a yard, set the orders, playtest it
 * to record a solution, check it and export the JSON for src/levels.
 */
export function Editor() {
  const [draft, setDraft] = useState<Level>(loadDraft);
  const [brush, setBrush] = useState<ContainerColor>('red');
  const [playtest, setPlaytest] = useState<Playtest | null>(null);
  const check = useMemo(() => checkDraft(draft), [draft]);
  const json = useMemo(() => formatLevelJson(draft), [draft]);

  useEffect(() => saveDraft(draft), [draft]);

  /** Any edit ends a running playtest, since the level it played has changed. */
  const update = (next: Level) => {
    setDraft(next);
    setPlaytest(null);
  };
  const dispatch = (action: PlaytestAction) =>
    setPlaytest((current) => current && playtestReducer(current, action));

  const setName = (name: string) =>
    update({
      ...draft,
      name,
      // The id follows the name until it is edited by hand.
      id: draft.id === edit.slugify(draft.name) ? edit.slugify(name) : draft.id,
    });

  const load = (id: string) => {
    const level = LEVELS.find((candidate) => candidate.id === id);
    if (level) update(structuredClone(level));
    else if (id === 'blank') update(edit.blankLevel());
  };

  const state = playtest?.history.present ?? null;

  return (
    <div className="editor">
      <header className="editor__header">
        <h1>Stackhaven level editor</h1>
        <select value="" onChange={(event) => load(event.target.value)} aria-label="Load">
          <option value="">Load a level…</option>
          <option value="blank">Blank level</option>
          {LEVELS.map((level) => (
            <option key={level.id} value={level.id}>
              {level.id}
            </option>
          ))}
        </select>
      </header>

      <main className="editor__main">
        <section className="card editor__yard">
          <div className="card__title">
            <h2>{playtest ? 'Playtest' : 'Yard'}</h2>
            {playtest ? (
              <button className="button" onClick={() => setPlaytest(null)}>
                ■ Back to editing
              </button>
            ) : (
              <button
                className="button button--primary"
                onClick={() => check.level && setPlaytest(startPlaytest(check.level))}
                disabled={!check.level}
                title={check.level ? undefined : 'Fix the problems first'}
              >
                ▶ Playtest
              </button>
            )}
          </div>

          {state && playtest ? (
            <>
              <YardView
                stacks={state.stacks.map((stack) => stack.map((container) => container.color))}
                maxHeight={state.maxHeight}
                nextOrder={state.orders[0]}
                selected={playtest.selected}
                onStack={(index) => dispatch({ type: 'tap-stack', index })}
                onTruck={() => dispatch({ type: 'tap-truck' })}
              />
              <OrderChips orders={state.orders} />
              <div className="playtest">
                <span>
                  Moves: <strong>{state.movesUsed}</strong> / {state.moveLimit}
                </span>
                <button
                  className="button"
                  onClick={() => dispatch({ type: 'undo' })}
                  disabled={playtest.moves.length === 0}
                >
                  ↶ Undo
                </button>
                <button
                  className="button"
                  onClick={() => check.level && setPlaytest(startPlaytest(check.level))}
                >
                  ⟲ Restart
                </button>
              </div>
              {playtest.feedback && (
                <p className="warn">{feedbackText(playtest.feedback, state.orders[0] ?? null)}</p>
              )}
              {state.status === 'won' && (
                <div className="playtest__result">
                  <p>
                    Won in <strong>{playtest.moves.length} moves</strong>
                    {check.level &&
                      playtest.moves.length < check.level.par &&
                      ' – better than par!'}
                  </p>
                  <button
                    className="button button--primary"
                    onClick={() => update(edit.setSolution(draft, playtest.moves))}
                  >
                    Save as solution (par {playtest.moves.length})
                  </button>
                </div>
              )}
              {state.status === 'lost' && <p className="warn">Out of moves. Undo or restart.</p>}
            </>
          ) : (
            <>
              <Palette brush={brush} onPick={setBrush} />
              <p className="hint">
                Click a stack to put a {PALETTE[brush].label.toLowerCase()} container on top. Click
                a container to remove it.
              </p>
              <YardView
                stacks={draft.stacks}
                maxHeight={draft.maxHeight}
                nextOrder={draft.orders[0]}
                selected={null}
                onStack={(index) => update(edit.addContainer(draft, index, brush))}
                onContainer={(stack, height) => update(edit.removeContainer(draft, stack, height))}
              />
              <h3>Orders</h3>
              <OrderChips
                orders={draft.orders}
                onRemove={(index) => update(edit.removeOrder(draft, index))}
              />
              <button className="button" onClick={() => update(edit.addOrder(draft, brush))}>
                + Add {PALETTE[brush].label.toLowerCase()} order
              </button>
            </>
          )}
        </section>

        <section className="card">
          <h2>Settings</h2>
          <div className="fields">
            <label>
              Name
              <input value={draft.name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              Id (file name)
              <input
                value={draft.id}
                onChange={(event) => update({ ...draft, id: event.target.value })}
              />
            </label>
            <Stepper
              label="Stacks"
              value={draft.stacks.length}
              onChange={(value) => update(edit.setStackCount(draft, value))}
            />
            <Stepper
              label="Max height"
              value={draft.maxHeight}
              onChange={(value) => update(edit.setMaxHeight(draft, value))}
            />
            <NumberField
              label="Move limit"
              value={draft.moveLimit}
              onChange={(moveLimit) => update({ ...draft, moveLimit })}
            />
            <NumberField
              label="Par"
              value={draft.par}
              onChange={(par) => update({ ...draft, par })}
            />
          </div>
        </section>

        <section className="card">
          <h2>Check</h2>
          {check.problems.length === 0 ? (
            <p className="ok">
              ✓ Ready: the solution wins in {draft.par} moves. Save it as src/levels/{draft.id}.json
            </p>
          ) : (
            <ul className="problems">
              {check.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
          <SolverPanel
            key={json}
            level={check.level}
            onUseSolution={(moves) => update(edit.setSolution(draft, moves))}
          />
        </section>

        <section className="card">
          <div className="card__title">
            <h2>JSON</h2>
            <div className="buttons">
              <button className="button" onClick={() => void navigator.clipboard.writeText(json)}>
                Copy
              </button>
              <button className="button" onClick={() => download(`${draft.id}.json`, json)}>
                Download
              </button>
              {check.level && (
                <a
                  className="button"
                  href={`./?custom=${encodeLevel(check.level)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Play in 3D ↗
                </a>
              )}
            </div>
          </div>
          <pre className="json">{json}</pre>
        </section>
      </main>
    </div>
  );
}

function Palette({
  brush,
  onPick,
}: {
  readonly brush: ContainerColor;
  readonly onPick: (color: ContainerColor) => void;
}) {
  return (
    <div className="palette" role="radiogroup" aria-label="Container colour">
      {CONTAINER_COLORS.map((color) => (
        <button
          key={color}
          className={color === brush ? 'swatch swatch--active' : 'swatch'}
          style={{ background: PALETTE[color].hex }}
          onClick={() => onPick(color)}
          role="radio"
          aria-checked={color === brush}
          aria-label={PALETTE[color].label}
        />
      ))}
    </div>
  );
}

function OrderChips({
  orders,
  onRemove,
}: {
  readonly orders: readonly ContainerColor[];
  readonly onRemove?: (index: number) => void;
}) {
  if (orders.length === 0) return <p className="hint">No orders.</p>;
  return (
    <ol className="chips">
      {orders.map((color, index) => (
        <li key={index}>
          <button
            className="chip"
            style={{ background: PALETTE[color].hex }}
            onClick={onRemove && (() => onRemove(index))}
            disabled={!onRemove}
            title={onRemove ? 'Remove' : undefined}
          >
            {index + 1}
          </button>
        </li>
      ))}
    </ol>
  );
}

function Stepper(props: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
}) {
  return (
    <div className="stepper">
      <span>{props.label}</span>
      <button className="button" onClick={() => props.onChange(props.value - 1)}>
        −
      </button>
      <strong>{props.value}</strong>
      <button className="button" onClick={() => props.onChange(props.value + 1)}>
        +
      </button>
    </div>
  );
}

function NumberField(props: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
}) {
  return (
    <label>
      {props.label}
      <input
        type="number"
        min={1}
        value={props.value}
        onChange={(event) => {
          const value = Number.parseInt(event.target.value, 10);
          if (Number.isFinite(value)) props.onChange(value);
        }}
      />
    </label>
  );
}

function download(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** The draft from last time, if the browser kept it (drafts may be unfinished). */
function loadDraft(): Level {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (isDraft(saved)) return saved;
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
  return edit.blankLevel();
}

function saveDraft(draft: Level): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable (private mode): the editor still works, it just forgets.
  }
}

function isDraft(value: unknown): value is Level {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Record<string, unknown>;
  const isColor = (color: unknown) => CONTAINER_COLORS.some((known) => known === color);
  return (
    typeof draft.id === 'string' &&
    typeof draft.name === 'string' &&
    Array.isArray(draft.stacks) &&
    draft.stacks.every((stack) => Array.isArray(stack) && stack.every(isColor)) &&
    Array.isArray(draft.orders) &&
    draft.orders.every(isColor) &&
    Array.isArray(draft.solution) &&
    typeof draft.maxHeight === 'number' &&
    typeof draft.moveLimit === 'number' &&
    typeof draft.par === 'number'
  );
}
