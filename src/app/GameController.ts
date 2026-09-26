import {
  applyMove,
  canUndo,
  computeStars,
  createHistory,
  createInitialState,
  pushHistory,
  STANDARD_RULES,
  undoHistory,
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
  readonly state: GameState | null;
  readonly selectedStack: number | null;
  /** True while the renderer animates a move; input is ignored meanwhile. */
  readonly isAnimating: boolean;
  readonly canUndo: boolean;
  /** Set when the level is over and its last animation has finished. */
  readonly outcome: Outcome | null;
  readonly hasNextLevel: boolean;
  /** `seq` increases on every message, so the UI can show the same message twice. */
  readonly feedback: { readonly message: Feedback; readonly seq: number } | null;
}

/**
 * The glue between input, rules and output. It owns all mutable game state
 * (the only place in the app that does), turns taps into moves, asks core to
 * apply them, sends the resulting events to the renderer and publishes a
 * GameView that React reads with useSyncExternalStore.
 */
export class GameController {
  private readonly listeners = new Set<() => void>();
  private readonly bestStars = new Map<string, Stars>();
  private screen: Screen = 'level-select';
  private level: Level | null = null;
  private history: History<GameState> | null = null;
  private selectedStack: number | null = null;
  private isAnimating = false;
  private feedback: GameView['feedback'] = null;
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
    if (this.isAnimating) return;
    const level = this.levels.find((candidate) => candidate.id === id);
    if (!level) throw new Error(`Unknown level "${id}"`);

    this.level = level;
    this.history = createHistory(createInitialState(level));
    this.screen = 'playing';
    this.resetSelection();
    this.feedback = null;
    this.renderer.showState(this.history.present);
    this.publish();
  }

  restart(): void {
    if (this.level) this.startLevel(this.level.id);
  }

  nextLevel(): void {
    const next = this.levels[this.currentLevelIndex() + 1];
    if (next) this.startLevel(next.id);
  }

  openLevelSelect(): void {
    if (this.isAnimating) return;
    this.screen = 'level-select';
    this.resetSelection();
    this.publish();
  }

  undo(): void {
    if (this.isAnimating || !this.history || !canUndo(this.history)) return;
    this.history = undoHistory(this.history);
    this.resetSelection();
    this.feedback = null;
    this.renderer.showState(this.history.present);
    this.publish();
  }

  // --- Input from the renderer ---

  /**
   * Tap a stack to select it, tap another stack to move there, tap the truck
   * to deliver. Returns a promise that settles when any resulting animation
   * has finished (useful in tests; the renderer ignores it).
   */
  async handleTap(target: TapTarget): Promise<void> {
    const state = this.history?.present;
    if (this.screen !== 'playing' || !state || this.isAnimating || state.status !== 'playing') {
      return;
    }
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

  private async commit(move: Move): Promise<void> {
    if (!this.history || !this.level) return;
    const result = applyMove(this.history.present, move, this.rules);
    if (!result.ok) return this.showFeedback(result.error);

    this.history = pushHistory(this.history, result.state);
    this.resetSelection();
    this.feedback = null;
    this.isAnimating = true;
    this.publish();

    try {
      await this.renderer.playEvents(result.events, result.state);
    } finally {
      this.isAnimating = false;
      if (result.state.status === 'won') {
        this.recordStars(this.level.id, computeStars(result.state.movesUsed, this.level.par));
      }
      this.publish();
    }
  }

  private select(stack: number | null): void {
    this.selectedStack = stack;
    this.feedback = null;
    this.renderer.setSelection(stack);
    this.publish();
  }

  private resetSelection(): void {
    this.selectedStack = null;
    this.renderer.setSelection(null);
  }

  private showFeedback(message: Feedback): void {
    this.feedback = { message, seq: (this.feedback?.seq ?? 0) + 1 };
    this.publish();
  }

  private recordStars(levelId: string, stars: Stars): void {
    const best = this.bestStars.get(levelId) ?? 0;
    if (stars > best) this.bestStars.set(levelId, stars);
  }

  private currentLevelIndex(): number {
    return this.levels.findIndex((level) => level.id === this.level?.id);
  }

  private publish(): void {
    this.view = this.buildView();
    for (const listener of this.listeners) listener();
  }

  private buildView(): GameView {
    const state = this.history?.present ?? null;
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
