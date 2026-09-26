import { Raycaster, Vector2, type Camera, type Object3D } from 'three';
import type { TapTarget } from '../app/ports';

/** A press that moves further than this is a drag, not a tap. */
const TAP_SLOP_PX = 14;
/** A press held longer than this is not a tap either. */
const TAP_MAX_MS = 700;

/**
 * Turns pointer presses on the canvas into TapTargets. Pointer Events cover
 * mouse, touch and pen with one API, and a tap is detected on release, so
 * nothing depends on hover. Targets are found by raycasting against invisible
 * boxes that carry a `tapTarget` in their userData.
 */
export class TapPicker {
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private press: { id: number; x: number; y: number; time: number } | null = null;

  constructor(
    private readonly element: HTMLElement,
    private readonly camera: Camera,
    private readonly targets: Object3D,
    private readonly onTap: (target: TapTarget) => void,
  ) {
    element.addEventListener('pointerdown', this.handleDown);
    element.addEventListener('pointerup', this.handleUp);
    element.addEventListener('pointercancel', this.handleCancel);
  }

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.handleDown);
    this.element.removeEventListener('pointerup', this.handleUp);
    this.element.removeEventListener('pointercancel', this.handleCancel);
  }

  /** What is under a point on the screen (client coordinates), if anything. */
  pick(clientX: number, clientY: number): TapTarget | null {
    const rect = this.element.getBoundingClientRect();
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    for (const hit of this.raycaster.intersectObject(this.targets, true)) {
      const target = hit.object.userData.tapTarget as TapTarget | undefined;
      if (target) return target;
    }
    return null;
  }

  private readonly handleDown = (event: PointerEvent) => {
    // A second finger means a gesture, not a tap.
    this.press = event.isPrimary
      ? { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp }
      : null;
  };

  private readonly handleUp = (event: PointerEvent) => {
    const press = this.press;
    this.press = null;
    if (!press || press.id !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (moved > TAP_SLOP_PX || event.timeStamp - press.time > TAP_MAX_MS) return;

    const target = this.pick(event.clientX, event.clientY);
    if (target) this.onTap(target);
  };

  private readonly handleCancel = () => {
    this.press = null;
  };
}
