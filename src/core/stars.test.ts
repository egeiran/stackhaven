import { describe, expect, it } from 'vitest';
import { computeStars } from './stars';

describe('computeStars', () => {
  it.each([
    [3, 5, 3],
    [5, 5, 3],
    [6, 5, 2],
    [7, 5, 2],
    [8, 5, 1],
    [40, 5, 1],
  ] as const)('%i moves with par %i gives %i stars', (moves, par, stars) => {
    expect(computeStars(moves, par)).toBe(stars);
  });
});
