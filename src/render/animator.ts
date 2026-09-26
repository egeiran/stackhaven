// A tiny tween system. Every tween returns a promise, so an animation can be
// written as ordinary sequential code: `await moveCrane(); await lower();`.

export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;
export const easeInCubic: Easing = (t) => t * t * t;
export const easeOutCubic: Easing = (t) => 1 - (1 - t) ** 3;
export const easeInOutCubic: Easing = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

export interface TweenOptions {
  readonly ease?: Easing;
  /** Seconds to wait before starting. */
  readonly delay?: number;
  /** Starting a tween with the same key stops the previous one where it is. */
  readonly key?: string;
}

interface Tween {
  readonly key: string | undefined;
  readonly duration: number;
  readonly ease: Easing;
  readonly apply: (progress: number) => void;
  readonly resolve: () => void;
  elapsed: number;
}

export class Animator {
  private tweens: Tween[] = [];

  get isActive(): boolean {
    return this.tweens.length > 0;
  }

  /**
   * Calls `apply` every frame with the eased progress (0 → 1) for `duration`
   * seconds. Resolves when done, or when cancelled.
   */
  tween(
    duration: number,
    apply: (progress: number) => void,
    options: TweenOptions = {},
  ): Promise<void> {
    if (options.key !== undefined) this.cancel(options.key);
    if (duration <= 0 && !options.delay) {
      apply(1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.tweens.push({
        key: options.key,
        duration: Math.max(duration, 1e-6),
        ease: options.ease ?? easeInOutCubic,
        apply,
        resolve,
        elapsed: -(options.delay ?? 0),
      });
    });
  }

  /** Advances every tween by `dt` seconds. Call once per frame. */
  update(dt: number): void {
    const finished: Tween[] = [];
    for (const tween of this.tweens) {
      tween.elapsed += dt;
      if (tween.elapsed < 0) continue;
      const t = Math.min(tween.elapsed / tween.duration, 1);
      tween.apply(tween.ease(t));
      if (t === 1) finished.push(tween);
    }
    if (finished.length === 0) return;
    this.tweens = this.tweens.filter((tween) => !finished.includes(tween));
    for (const tween of finished) tween.resolve();
  }

  /** Stops tweens where they are (all of them, or those with `key`) and resolves their promises. */
  cancel(key?: string): void {
    const stopped = this.tweens.filter((tween) => key === undefined || tween.key === key);
    this.tweens = this.tweens.filter((tween) => !stopped.includes(tween));
    for (const tween of stopped) tween.resolve();
  }
}
