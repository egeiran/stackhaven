import {
  applyMove,
  canUndo,
  computeStars,
  createHistory,
  createInitialState,
  pushHistory,
  STANDARD_RULES,
  undoHistory,
  type ContainerColor,
  type GameEvent,
  type GameState,
  type History,
  type Level,
  type Move,
  type MoveError,
  type Rule,
  type Stars,
} from '../core';
import type { GameRenderer, TapTarget } from './ports';

export type Screen = 'level-select' | 'playing';

/** A short message for the player about their last tap. */
export type Feedback = MoveError | 'select-first';

export interface LevelSummary {
  readonly id: string;
  readonly name: string;
  readonly bestStars: Stars | null;
}

export type Outcome = { readonly kind: 'won'; readonly stars: Stars } | { readonly kind: 'lost' };

/** An immutable snapshot of everything the UI shows. A new object on every change. */
export interface GameView {
  readonly screen: Screen;
  readonly levels: readonly LevelSummary[];
  readonly level: Level | null;
  /** The state on screen: a move is counted here once its animation has finished. */
  readonly state: GameState | null;
  readonly selectedStack: number | null;
  /** True while moves are being animated (more may be queued behind). */
  readonly isAnimating: boolean;
  readonly canUndo: boolean;
  /** Set when the level is over and the last animation has finished. */
  readonly outcome: Outcome | null;
  readonly hasNextLevel: boolean;
  /** `seq` increases on every message, so the UI can show the same message twice. */
  readonly feedback: {
    readonly message: Feedback;
    readonly seq: number;
    /** The order the truck was waiting for when the message was given. */
    readonly nextOrder: ContainerColor | null;
  } | null;
}

/** A move that has been applied to the rules but not yet shown. */
interface QueuedAnimation {
  readonly events: readonly GameEvent[];
  readonly state: GameState;
  readonly done: () => void;
}

/**
 * The glue between input, rules and output. It owns all mutable game state
 * (the only place in the app that does), turns taps into moves, asks core to
 * apply them, sends the resulting events to the renderer and publishes a
 * GameView that React reads with useSyncExternalStore.
 *
 * Input is never blocked by animations. Each tap is checked against the
 * *logical* state (history.present), which runs ahead of the screen: a legal
 * move is applied immediately and its animation is queued behind the ones
 * already playing. Undo and restart cut the queue short and jump straight to
 * the resulting state.
 */
export class GameController {
  private readonly listeners = new Set<() => void>();
  private readonly bestStars = new Map<string, Stars>();
  private screen: Screen = 'level-select';
  private level: Level | null = null;
  /** The logical game: every applied move, including ones still waiting to be animated. */
  private history: History<GameState> | null = null;
  /** What the player currently sees; lags behind history.present while animating. */
  private shown: GameState | null = null;
  private selectedStack: number | null = null;
  private feedback: GameView['feedback'] = null;
  private queue: QueuedAnimation[] = [];
  private isAnimating = false;
  /** Bumped whenever the queue is abandoned, so a stale animation loop knows to stop. */
  private generation = 0;
  private view: GameView;

  constructor(
    private readonly levels: readonly Level[],
    private readonly renderer: GameRenderer,
    private readonly rules: readonly Rule[] = STANDARD_RULES,
  ) {
    this.view = this.buildView();
    renderer.onTap((target) => void this.handleTap(target));
    renderer.showState(null);
  }

  // --- Subscribe API for React (arrow functions so they can be passed around unbound) ---

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): GameView => this.view;

  // --- Commands from the UI ---

  startLevel(id: string): void {
    const level = this.levels.find((candidate) => candidate.id === id);
    if (!level) throw new Error(`Unknown level "${id}"`);

    this.level = level;
    this.screen = 'playing';
    this.feedback = null;
    this.jumpTo(createHistory(createInitialState(level)));
  }

  restart(): void {
    if (this.level) this.startLevel(this.level.id);
  }

  nextLevel(): void {
    const next = this.levels[this.currentLevelIndex() + 1];
    if (next) this.startLevel(next.id);
  }

  openLevelSelect(): void {
    // Finish instantly so the scene behind the menu is up to date.
    if (this.history) this.jumpTo(this.history);
    this.screen = 'level-select';
    this.publish();
  }

  /** Takes back the latest move, even one that is still waiting to be animated. */
  undo(): void {
    if (!this.history || !canUndo(this.history)) return;
    this.feedback = null;
    this.jumpTo(undoHistory(this.history));
  }

  // --- Input from the renderer ---

  /**
   * Tap a stack to select it, tap another stack to move there, tap the truck
   * to deliver. Returns a promise that settles when the resulting move has
   * been animated (useful in tests; the renderer ignores it).
   */
  async handleTap(target: TapTarget): Promise<void> {
    const state = this.history?.present;
    if (this.screen !== 'playing' || !state || state.status !== 'playing') return;
    const selected = this.selectedStack;

    if (target.kind === 'delivery') {
      if (selected === null) return this.showFeedback('select-first');
      return this.commit({ type: 'deliver', from: selected });
    }

    if (selected === null) {
      if (!state.stacks[target.index]?.length) return this.showFeedback('empty-stack');
      return this.select(target.index);
    }
    if (selected === target.index) return this.select(null);
    return this.commit({ type: 'move', from: selected, to: target.index });
  }

  // --- Internals ---

  private commit(move: Move): Promise<void> {
    if (!this.history) return Promise.resolve();
    const result = applyMove(this.history.present, move, this.rules);
    if (!result.ok) {
      this.showFeedback(result.error);
      return Promise.resolve();
    }

    this.history = pushHistory(this.history, result.state);
    this.clearSelection();
    this.feedback = null;
    const animated = new Promise<void>((done) => {
      this.queue.push({ events: result.events, state: result.state, done });
    });
    this.renderer.setBacklog(this.queue.length - 1);
    if (!this.isAnimating) void this.playQueue();
    this.publish();
    return animated;
  }

  /** Plays queued animations one after another until the queue is empty. */
  private async playQueue(): Promise<void> {
    const generation = this.generation;
    this.isAnimating = true;
    this.publish();

    for (let next = this.queue[0]; next; next = this.queue[0]) {
      this.renderer.setBacklog(this.queue.length - 1);
      await this.renderer.playEvents(next.events, next.state);
      // Undo/restart abandoned this queue while we waited; they have cleaned up.
      if (generation !== this.generation) return;

      this.queue.shift();
      this.shown = next.state;
      this.recordStarsIfWon(next.state);
      next.done();
      this.publish();
    }

    this.isAnimating = false;
    this.renderer.setBacklog(0);
    this.publish();
  }

  /** Abandons all queued animations and shows `history.present` immediately. */
  private jumpTo(history: History<GameState>): void {
    this.generation++;
    for (const queued of this.queue) queued.done();
    this.queue = [];
    this.isAnimating = false;
    this.renderer.setBacklog(0);

    this.history = history;
    this.shown = history.present;
    this.clearSelection();
    this.renderer.showState(history.present);
    this.publish();
  }

  private select(stack: number | null): void {
    const container = stack === null ? undefined : this.history?.present.stacks[stack]?.at(-1);
    this.selectedStack = container ? stack : null;
    this.feedback = null;
    this.renderer.setSelection(
      container && stack !== null ? { stack, containerId: container.id } : null,
    );
    this.publish();
  }

  private clearSelection(): void {
    this.selectedStack = null;
    this.renderer.setSelection(null);
  }

  private showFeedback(message: Feedback): void {
    this.feedback = {
      message,
      seq: (this.feedback?.seq ?? 0) + 1,
      nextOrder: this.history?.present.orders[0] ?? null,
    };
    this.publish();
  }

  private recordStarsIfWon(state: GameState): void {
    if (state.status !== 'won' || !this.level) return;
    const stars = computeStars(state.movesUsed, this.level.par);
    if (stars > (this.bestStars.get(this.level.id) ?? 0)) this.bestStars.set(this.level.id, stars);
  }

  private currentLevelIndex(): number {
    return this.levels.findIndex((level) => level.id === this.level?.id);
  }

  private publish(): void {
    this.view = this.buildView();
    for (const listener of this.listeners) listener();
  }

  private buildView(): GameView {
    const state = this.shown;
    return {
      screen: this.screen,
      levels: this.levels.map((level) => ({
        id: level.id,
        name: level.name,
        bestStars: this.bestStars.get(level.id) ?? null,
      })),
      level: this.level,
      state,
      selectedStack: this.selectedStack,
      isAnimating: this.isAnimating,
      canUndo: this.history !== null && canUndo(this.history),
      outcome: this.isAnimating ? null : this.outcomeOf(state),
      hasNextLevel: this.level !== null && this.currentLevelIndex() < this.levels.length - 1,
      feedback: this.feedback,
    };
  }

  private outcomeOf(state: GameState | null): Outcome | null {
    if (state?.status === 'won' && this.level) {
      return { kind: 'won', stars: computeStars(state.movesUsed, this.level.par) };
    }
    if (state?.status === 'lost') return { kind: 'lost' };
    return null;
  }
}
