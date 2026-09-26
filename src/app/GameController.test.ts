import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState, Level } from '../core';
import { makeLevel } from '../core/testing';
import { GameController } from './GameController';
import type { GameRenderer, Selection, TapTarget } from './ports';

/** Records what the controller asks for. Animations finish immediately unless paused. */
class FakeRenderer implements GameRenderer {
  shown: (GameState | null)[] = [];
  played: (readonly GameEvent[])[] = [];
  selection: Selection | null = null;
  backlog: number[] = [];
  paused = false;
  private tapHandler: ((target: TapTarget) => void) | null = null;
  private pending: (() => void)[] = [];

  showState(state: GameState | null) {
    this.shown.push(state);
    // Like the real renderer: showing a state aborts the running animation.
    this.finishAnimations();
  }
  playEvents(events: readonly GameEvent[]) {
    this.played.push(events);
    return this.paused
      ? new Promise<void>((resolve) => this.pending.push(resolve))
      : Promise.resolve();
  }
  setSelection(selection: Selection | null) {
    this.selection = selection;
  }
  setBacklog(count: number) {
    this.backlog.push(count);
  }
  onTap(handler: (target: TapTarget) => void) {
    this.tapHandler = handler;
    return () => (this.tapHandler = null);
  }
  /** Finishes the animations that are currently playing. */
  finishAnimations() {
    this.pending.splice(0).forEach((resolve) => resolve());
  }
  get hasTapHandler() {
    return this.tapHandler !== null;
  }
}

const stack = (index: number): TapTarget => ({ kind: 'stack', index });
const truck: TapTarget = { kind: 'delivery' };

// Stacks: [red, blue] [green] [] – orders red, green, blue. Par 4 (like level 2).
const level: Level = makeLevel({
  id: 'make-room',
  stacks: [['red', 'blue'], ['green'], []],
  orders: ['red', 'green', 'blue'],
  moveLimit: 6,
  par: 4,
});
const secondLevel: Level = makeLevel({ id: 'second' });

let renderer: FakeRenderer;
let controller: GameController;

beforeEach(() => {
  renderer = new FakeRenderer();
  controller = new GameController([level, secondLevel], renderer);
});

const view = () => controller.getSnapshot();
const colors = () => view().state?.stacks.map((s) => s.map((c) => c.color));

describe('starting', () => {
  it('opens on the level select screen with an empty quay', () => {
    expect(view()).toMatchObject({ screen: 'level-select', level: null, state: null });
    expect(view().levels.map((summary) => summary.bestStars)).toEqual([null, null]);
    expect(renderer.shown).toEqual([null]);
    expect(renderer.hasTapHandler).toBe(true);
  });

  it('shows the initial state when a level starts', () => {
    controller.startLevel('make-room');

    expect(view().screen).toBe('playing');
    expect(colors()).toEqual([['red', 'blue'], ['green'], []]);
    expect(renderer.shown.at(-1)).toBe(view().state);
  });

  it('throws for an unknown level id', () => {
    expect(() => controller.startLevel('nope')).toThrow(/Unknown level/);
  });
});

describe('tapping', () => {
  beforeEach(() => controller.startLevel('make-room'));

  it('selects a stack, and deselects it on a second tap', async () => {
    await controller.handleTap(stack(0));
    expect(view().selectedStack).toBe(0);
    expect(renderer.selection).toEqual({ stack: 0, containerId: 'c1' });

    await controller.handleTap(stack(0));
    expect(view().selectedStack).toBeNull();
    expect(renderer.selection).toBeNull();
  });

  it('explains that an empty stack cannot be picked up', async () => {
    await controller.handleTap(stack(2));
    expect(view().selectedStack).toBeNull();
    expect(view().feedback?.message).toBe('empty-stack');
  });

  it('moves from the selected stack to the tapped stack and animates it', async () => {
    await controller.handleTap(stack(0));
    await controller.handleTap(stack(2));

    expect(colors()).toEqual([['red'], ['green'], ['blue']]);
    expect(view().state?.movesUsed).toBe(1);
    expect(view().selectedStack).toBeNull();
    expect(renderer.played[0]?.map((event) => event.type)).toEqual([
      'ContainerLifted',
      'ContainerPlaced',
    ]);
  });

  it('asks the player to pick a stack before tapping the truck', async () => {
    await controller.handleTap(truck);
    expect(view().feedback?.message).toBe('select-first');
  });

  it('keeps the selection and explains why when the truck wants another colour', async () => {
    await controller.handleTap(stack(1));
    await controller.handleTap(truck);

    expect(view().feedback?.message).toBe('wrong-color');
    expect(view().selectedStack).toBe(1);
    expect(view().state?.movesUsed).toBe(0);
  });

  it('gives each feedback message a new sequence number', async () => {
    await controller.handleTap(truck);
    const first = view().feedback?.seq ?? 0;
    await controller.handleTap(truck);
    expect(view().feedback?.seq).toBe(first + 1);
  });
});

/** Lets queued promise callbacks run (the controller moves on to the next animation). */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('input queue', () => {
  beforeEach(() => {
    controller.startLevel('make-room');
    renderer.paused = true;
  });

  it('accepts taps while a move is animating and plays the moves in order', async () => {
    await controller.handleTap(stack(0));
    const first = controller.handleTap(stack(2)); // blue out of the way
    await controller.handleTap(stack(0));
    const second = controller.handleTap(truck); // red

    expect(renderer.played).toHaveLength(1);
    expect(view().isAnimating).toBe(true);

    renderer.finishAnimations();
    await first;
    await flush();
    expect(renderer.played).toHaveLength(2);
    expect(renderer.played[1]?.map((event) => event.type)).toEqual([
      'ContainerLifted',
      'ContainerDelivered',
    ]);

    renderer.finishAnimations();
    await second;
    await flush();
    expect(view().isAnimating).toBe(false);
    expect(view().state?.movesUsed).toBe(2);
  });

  it('checks queued taps against the state after the queued moves', async () => {
    await controller.handleTap(stack(0));
    void controller.handleTap(stack(2)); // blue is on its way to stack 2

    // On screen stack 2 is still empty, but after the queued move it holds blue.
    await controller.handleTap(stack(2));

    expect(view().feedback).toBeNull();
    expect(view().selectedStack).toBe(2);
    expect(renderer.selection).toEqual({ stack: 2, containerId: 'c1' });
  });

  it('gives feedback immediately for an illegal queued move', async () => {
    await controller.handleTap(stack(0));
    void controller.handleTap(stack(2));
    await controller.handleTap(stack(1));
    await controller.handleTap(truck); // green, but the truck wants red

    expect(view().feedback).toMatchObject({ message: 'wrong-color', nextOrder: 'red' });
  });

  it('shows a move on screen only once its animation has finished', async () => {
    await controller.handleTap(stack(0));
    const moving = controller.handleTap(stack(2));

    expect(view().state?.movesUsed).toBe(0);
    expect(view().canUndo).toBe(true);

    renderer.finishAnimations();
    await moving;
    expect(view().state?.movesUsed).toBe(1);
  });

  it('tells the renderer how many moves are waiting, so it can hurry', async () => {
    await controller.handleTap(stack(0));
    void controller.handleTap(stack(2));
    await controller.handleTap(stack(0));
    void controller.handleTap(truck);

    expect(renderer.backlog.at(-1)).toBe(1);
  });

  it('undo during an animation drops the latest move and jumps to the result', async () => {
    await controller.handleTap(stack(0));
    void controller.handleTap(stack(2)); // move 1: blue to stack 2
    await controller.handleTap(stack(0));
    void controller.handleTap(truck); // move 2: deliver red (queued)

    controller.undo();
    await flush();

    expect(view().isAnimating).toBe(false);
    expect(view().state?.movesUsed).toBe(1);
    expect(colors()).toEqual([['red'], ['green'], ['blue']]);
    expect(renderer.shown.at(-1)).toBe(view().state);
    expect(renderer.played).toHaveLength(1); // the delivery was never animated
  });

  it('restart during an animation starts over cleanly', async () => {
    await controller.handleTap(stack(0));
    void controller.handleTap(stack(2));

    controller.restart();
    await flush();

    expect(view()).toMatchObject({ isAnimating: false, canUndo: false });
    expect(view().state?.movesUsed).toBe(0);
  });

  it('ignores taps once the queued moves have finished the level', async () => {
    renderer.paused = false;
    await controller.handleTap(stack(0));
    await controller.handleTap(stack(2));
    await controller.handleTap(stack(0));
    await controller.handleTap(truck);
    await controller.handleTap(stack(1));
    await controller.handleTap(truck);
    renderer.paused = true;
    await controller.handleTap(stack(2));
    void controller.handleTap(truck); // wins (logically)

    await controller.handleTap(stack(0));
    expect(view().selectedStack).toBeNull();
    expect(view().outcome).toBeNull(); // not until the animation has played
  });
});

describe('undo', () => {
  beforeEach(() => controller.startLevel('make-room'));

  it('has nothing to undo at the start', () => {
    expect(view().canUndo).toBe(false);
  });

  it('restores the previous state and shows it without animation', async () => {
    const initial = view().state;
    await controller.handleTap(stack(0));
    await controller.handleTap(stack(2));

    controller.undo();

    expect(view().state).toBe(initial);
    expect(renderer.shown.at(-1)).toBe(initial);
    expect(view().canUndo).toBe(false);
  });

  it('can take back the move that lost the level', async () => {
    // Waste moves by shuffling blue back and forth until the limit (6) is hit.
    for (let i = 0; i < 3; i++) {
      await controller.handleTap(stack(0));
      await controller.handleTap(stack(2));
      await controller.handleTap(stack(2));
      await controller.handleTap(stack(0));
    }
    expect(view().outcome).toEqual({ kind: 'lost' });

    controller.undo();

    expect(view().state?.status).toBe('playing');
    expect(view().outcome).toBeNull();
  });
});

describe('winning', () => {
  beforeEach(() => controller.startLevel('make-room'));

  /** Plays the par-4 solution up to (not including) the final delivery. */
  async function playAllButLastMove() {
    await controller.handleTap(stack(0));
    await controller.handleTap(stack(2)); // blue out of the way
    await controller.handleTap(stack(0));
    await controller.handleTap(truck); // red
    await controller.handleTap(stack(1));
    await controller.handleTap(truck); // green
    await controller.handleTap(stack(2));
  }

  async function playSolution() {
    await playAllButLastMove();
    await controller.handleTap(truck); // blue
  }

  it('reports the outcome only after the last animation has finished', async () => {
    await playAllButLastMove();
    renderer.paused = true;

    const finalMove = controller.handleTap(truck);
    expect(view().isAnimating).toBe(true);
    expect(view().outcome).toBeNull();

    renderer.finishAnimations();
    await finalMove;
    expect(view().outcome).toEqual({ kind: 'won', stars: 3 });
  });

  it('remembers the best stars per level', async () => {
    await playSolution();
    controller.restart();
    // A clumsy second run (6 moves = 2 stars) must not lower the record.
    await controller.handleTap(stack(0));
    await controller.handleTap(stack(1));
    await controller.handleTap(stack(1));
    await controller.handleTap(stack(2));
    await controller.handleTap(stack(0));
    await controller.handleTap(truck);
    await controller.handleTap(stack(2));
    await controller.handleTap(stack(0));
    await controller.handleTap(stack(1));
    await controller.handleTap(truck);
    await controller.handleTap(stack(0));
    await controller.handleTap(truck);

    expect(view().outcome).toEqual({ kind: 'won', stars: 2 });
    expect(view().levels[0]?.bestStars).toBe(3);
  });

  it('moves on to the next level', async () => {
    await playSolution();
    expect(view().hasNextLevel).toBe(true);

    controller.nextLevel();

    expect(view().level?.id).toBe('second');
    expect(view().hasNextLevel).toBe(false);
  });
});

describe('subscribe', () => {
  it('notifies listeners and keeps the snapshot stable between changes', () => {
    let calls = 0;
    const unsubscribe = controller.subscribe(() => calls++);
    const before = view();
    expect(view()).toBe(before);

    controller.startLevel('make-room');
    expect(calls).toBe(1);
    expect(view()).not.toBe(before);

    unsubscribe();
    controller.openLevelSelect();
    expect(calls).toBe(1);
  });
});
