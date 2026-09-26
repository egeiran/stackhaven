import { z } from 'zod';
import { CONTAINER_COLORS, type ContainerColor } from './palette';
import type { Container, GameState } from './types';

const colorSchema = z.enum(CONTAINER_COLORS);
const stackIndexSchema = z.number().int().nonnegative();

export const moveSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('move'), from: stackIndexSchema, to: stackIndexSchema }),
  z.strictObject({ type: z.literal('deliver'), from: stackIndexSchema }),
]);

/**
 * The JSON format of a level file. `strictObject` rejects unknown keys, so a
 * typo such as "moveLimt" fails loudly instead of being silently ignored.
 */
export const levelSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9-]+$/, 'use lowercase letters, digits and dashes'),
    name: z.string().min(1),
    /** Each stack lists colours bottom first. */
    stacks: z.array(z.array(colorSchema)).min(1),
    maxHeight: z.number().int().positive(),
    orders: z.array(colorSchema).min(1),
    moveLimit: z.number().int().positive(),
    par: z.number().int().positive(),
    /** A known winning sequence of exactly `par` moves (checked by the level tests). */
    solution: z.array(moveSchema),
  })
  .superRefine((level, ctx) => {
    level.stacks.forEach((stack, i) => {
      if (stack.length > level.maxHeight) {
        ctx.addIssue({
          code: 'custom',
          path: ['stacks', i],
          message: `stack ${i} holds ${stack.length} containers but maxHeight is ${level.maxHeight}`,
        });
      }
    });

    if (level.par > level.moveLimit) {
      ctx.addIssue({ code: 'custom', path: ['par'], message: 'par cannot exceed moveLimit' });
    }

    const available = countColors(level.stacks.flat());
    for (const [color, needed] of countColors(level.orders)) {
      const have = available.get(color) ?? 0;
      if (have < needed) {
        ctx.addIssue({
          code: 'custom',
          path: ['orders'],
          message: `orders need ${needed} × ${color} but the yard only has ${have}`,
        });
      }
    }

    level.solution.forEach((move, i) => {
      const indices = move.type === 'move' ? [move.from, move.to] : [move.from];
      if (indices.some((index) => index >= level.stacks.length)) {
        ctx.addIssue({
          code: 'custom',
          path: ['solution', i],
          message: 'refers to a stack that does not exist',
        });
      }
    });
  });

export type Level = z.infer<typeof levelSchema>;

/** Validates unknown data (e.g. parsed JSON) and returns a typed Level, or throws a readable error. */
export function parseLevel(data: unknown, source = 'level'): Level {
  const result = levelSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid ${source}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Builds the starting GameState. Container ids (c0, c1, …) follow the file order. */
export function createInitialState(level: Level): GameState {
  let next = 0;
  const stacks = level.stacks.map((colors) =>
    colors.map((color): Container => ({ id: `c${next++}`, color })),
  );
  return {
    stacks,
    maxHeight: level.maxHeight,
    orders: [...level.orders],
    movesUsed: 0,
    moveLimit: level.moveLimit,
    status: 'playing',
  };
}

function countColors(colors: readonly ContainerColor[]): Map<ContainerColor, number> {
  const counts = new Map<ContainerColor, number>();
  for (const color of colors) counts.set(color, (counts.get(color) ?? 0) + 1);
  return counts;
}
