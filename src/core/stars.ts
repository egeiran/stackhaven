export type Stars = 1 | 2 | 3;

/** Moves above par that still give two stars. */
export const TWO_STAR_MARGIN = 2;

/** 3 stars at ≤ par moves, 2 at ≤ par + 2, otherwise 1. */
export function computeStars(movesUsed: number, par: number): Stars {
  if (movesUsed <= par) return 3;
  if (movesUsed <= par + TWO_STAR_MARGIN) return 2;
  return 1;
}
