import { Mesh, Raycaster, Vector2, Vector3, type Camera, type Object3D } from 'three';
import type { TapTarget } from '../app/ports';
import { CONTAINER_SIZE, STACK_SPACING, TRUCK_BED_Y, type YardLayout } from './layout';

/** A tap that hits nothing still counts if it lands this close (CSS px) to a stack or the truck. */
export const TAP_TOLERANCE_PX = 44;

/** Hits further than this from the stack row are ignored (e.g. a truck driving away). */
const YARD_HALF_DEPTH = 2.6;

export interface PickScene {
  readonly camera: Camera;
  /** What is actually drawn and can be tapped: containers, slot markings, trucks. */
  readonly surfaces: readonly Object3D[];
  readonly layout: YardLayout;
  /** Current number of containers in each stack. */
  readonly stackHeights: readonly number[];
  /** Canvas size in CSS pixels. */
  readonly width: number;
  readonly height: number;
}

/**
 * Finds what the player tapped, in two passes:
 *
 * 1. Precise: raycast against what is actually drawn and see which column the
 *    hit is in. The first thing the ray hits is what the player sees under
 *    their finger, so a tall neighbour can never "steal" the tap.
 * 2. Forgiving: if the ray hits nothing (empty air above a short stack, the
 *    gap between stacks), take the stack or truck closest on screen, as long
 *    as it is within a finger's width.
 *
 * `ndc` is the tap in normalised device coordinates (-1..1).
 */
export function pickTarget(
  scene: PickScene,
  ndc: Vector2,
  raycaster = new Raycaster(),
): TapTarget | null {
  raycaster.setFromCamera(ndc, scene.camera);
  for (const hit of raycaster.intersectObjects([...scene.surfaces], true)) {
    // Only solid surfaces count: three "hits" lines anywhere within a whole
    // world unit of the ray, so the truck's outline would steal nearby taps.
    if (!(hit.object instanceof Mesh)) continue;
    if (Math.abs(hit.point.z) > YARD_HALF_DEPTH) continue;
    const target = targetAtX(hit.point.x, scene.layout);
    if (target) return target;
  }
  return nearestOnScreen(scene, ndc);
}

/** Which column (a stack or the truck bay) a world x coordinate belongs to. */
export function targetAtX(x: number, layout: YardLayout): TapTarget | null {
  if (Math.abs(x - layout.bayX) <= STACK_SPACING / 2) return { kind: 'delivery' };
  for (let index = 0; index < layout.stackCount; index++) {
    if (Math.abs(x - layout.stackX(index)) <= STACK_SPACING / 2) return { kind: 'stack', index };
  }
  return null;
}

function nearestOnScreen(scene: PickScene, ndc: Vector2): TapTarget | null {
  const { camera, layout, width, height } = scene;
  const toScreen = (x: number, y: number, z: number) => {
    const p = new Vector3(x, y, z).project(camera);
    return new Vector2(((p.x + 1) / 2) * width, ((1 - p.y) / 2) * height);
  };
  const tap = new Vector2(((ndc.x + 1) / 2) * width, ((1 - ndc.y) / 2) * height);
  const halfLength = CONTAINER_SIZE.length / 2;

  // Each target is a line through the middle of what the player sees: from
  // the front of its footprint on the ground to the back of its top.
  const candidates: { target: TapTarget; a: Vector2; b: Vector2 }[] = [];
  for (let index = 0; index < layout.stackCount; index++) {
    const x = layout.stackX(index);
    const top = Math.max(scene.stackHeights[index] ?? 0, 0.5) * CONTAINER_SIZE.height;
    candidates.push({
      target: { kind: 'stack', index },
      a: toScreen(x, 0, halfLength),
      b: toScreen(x, top, -halfLength),
    });
  }
  candidates.push({
    target: { kind: 'delivery' },
    a: toScreen(layout.bayX, 0, halfLength),
    b: toScreen(layout.bayX, TRUCK_BED_Y + CONTAINER_SIZE.height, -halfLength),
  });

  let best: TapTarget | null = null;
  let bestDistance = TAP_TOLERANCE_PX;
  for (const { target, a, b } of candidates) {
    const distance = distanceToSegment(tap, a, b);
    if (distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}

function distanceToSegment(p: Vector2, a: Vector2, b: Vector2): number {
  const ab = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-9)));
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}
