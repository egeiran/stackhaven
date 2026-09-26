import type { ContainerColor, Level, Move } from '../core';

// Editing operations on a draft level. A draft has the Level shape but may be
// invalid while you work on it (e.g. no orders yet); check.ts says what is wrong.
// Every function returns a new draft and leaves its input untouched.

export const MAX_STACKS = 6;
export const MAX_HEIGHT = 6;

export function blankLevel(): Level {
  return {
    id: 'new-level',
    name: 'New level',
    stacks: [[], [], []],
    maxHeight: 3,
    orders: [],
    moveLimit: 10,
    par: 1,
    solution: [],
  };
}

export function setStackCount(level: Level, count: number): Level {
  const clamped = clamp(count, 1, MAX_STACKS);
  const stacks = level.stacks.slice(0, clamped);
  while (stacks.length < clamped) stacks.push([]);
  return { ...level, stacks };
}

/** Changes the height limit, but never below the tallest stack. */
export function setMaxHeight(level: Level, height: number): Level {
  const tallest = Math.max(0, ...level.stacks.map((stack) => stack.length));
  return { ...level, maxHeight: clamp(height, Math.max(tallest, 1), MAX_HEIGHT) };
}

/** Puts a container on top of a stack, if there is room. */
export function addContainer(level: Level, stack: number, color: ContainerColor): Level {
  const target = level.stacks[stack];
  if (!target || target.length >= level.maxHeight) return level;
  return { ...level, stacks: level.stacks.map((s, i) => (i === stack ? [...s, color] : s)) };
}

/** Removes one container; the ones above it drop down. */
export function removeContainer(level: Level, stack: number, height: number): Level {
  return {
    ...level,
    stacks: level.stacks.map((s, i) => (i === stack ? s.filter((_, h) => h !== height) : s)),
  };
}

export function addOrder(level: Level, color: ContainerColor): Level {
  return { ...level, orders: [...level.orders, color] };
}

export function removeOrder(level: Level, index: number): Level {
  return { ...level, orders: level.orders.filter((_, i) => i !== index) };
}

/**
 * Stores a winning sequence as the level's solution and sets par to its
 * length, raising the move limit if it would otherwise be below par.
 */
export function setSolution(level: Level, moves: readonly Move[]): Level {
  const par = moves.length;
  return {
    ...level,
    solution: [...moves],
    par,
    moveLimit: Math.max(level.moveLimit, par + 4),
  };
}

/** Turns a name into a valid level id: "Night Shift" → "night-shift". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}
