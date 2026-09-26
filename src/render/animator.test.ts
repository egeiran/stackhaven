import { describe, expect, it } from 'vitest';
import { Animator, easeInOutCubic, easeOutCubic, linear } from './animator';

describe('easings', () => {
  it.each([linear, easeOutCubic, easeInOutCubic])('start at 0 and end at 1', (ease) => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });
});

describe('Animator', () => {
  it('drives a value from 0 to 1 and resolves when done', async () => {
    const animator = new Animator();
    const values: number[] = [];
    const done = animator.tween(1, (p) => values.push(p), { ease: linear });

    animator.update(0.5);
    animator.update(0.5);
    await done;

    expect(values).toEqual([0.5, 1]);
    expect(animator.isActive).toBe(false);
  });

  it('runs tweens one after another when awaited in sequence', async () => {
    const animator = new Animator();
    const order: string[] = [];
    const sequence = (async () => {
      await animator.tween(0.1, () => order.push('first'), { ease: linear });
      await animator.tween(0.1, () => order.push('second'), { ease: linear });
    })();

    animator.update(0.1);
    await Promise.resolve(); // let the first await continue
    animator.update(0.1);
    await sequence;

    expect(order).toEqual(['first', 'second']);
  });

  it('waits for the delay before starting', () => {
    const animator = new Animator();
    const values: number[] = [];
    void animator.tween(1, (p) => values.push(p), { ease: linear, delay: 0.5 });

    animator.update(0.25);
    animator.update(0.5);

    expect(values).toEqual([0.25]);
  });

  it('replaces a running tween that has the same key', async () => {
    const animator = new Animator();
    const first = animator.tween(1, () => {}, { key: 'crane' });
    void animator.tween(1, () => {}, { key: 'crane' });

    await first; // resolved by the replacement
    expect(animator.isActive).toBe(true);
  });
});
