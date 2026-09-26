import type { Box3 } from 'three';
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';

export interface FramingOptions {
  /** Angle above the ground, in degrees. */
  readonly elevation: number;
  /** Rotation around the vertical axis, in degrees (0 = looking straight down -z). */
  readonly azimuth: number;
  /** Pixels at the top and bottom covered by the HUD, which the yard should avoid. */
  readonly insetTop: number;
  readonly insetBottom: number;
  /** Fraction of the width kept free on each side. */
  readonly sideMargin: number;
}

const WORLD_UP = new Vector3(0, 1, 0);

/**
 * Places the camera so that `box` fills the free part of the screen.
 *
 * For every corner of the box we compute how far back the camera must be for
 * that corner to fit inside the field of view, and use the largest distance.
 * A view offset then shifts the picture so it is centred between the HUD bars.
 */
export function frameBox(
  camera: PerspectiveCamera,
  box: Box3,
  width: number,
  height: number,
  options: FramingOptions,
): void {
  const elevation = MathUtils.degToRad(options.elevation);
  const azimuth = MathUtils.degToRad(options.azimuth);
  const target = box.getCenter(new Vector3());
  // Unit vector from the target towards the camera.
  const back = new Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  );
  const right = new Vector3().crossVectors(WORLD_UP, back).normalize();
  const up = new Vector3().crossVectors(back, right);

  // Screen space is -1..1 in both directions; the HUD takes some of it.
  const topFraction = options.insetTop / height;
  const bottomFraction = options.insetBottom / height;
  const halfHeight = Math.max(1 - topFraction - bottomFraction, 0.2);
  const tanV = Math.tan(MathUtils.degToRad(camera.fov) / 2) * halfHeight;
  const tanH =
    Math.tan(MathUtils.degToRad(camera.fov) / 2) * (width / height) * (1 - options.sideMargin);

  let distance = 0;
  const corner = new Vector3();
  for (let i = 0; i < 8; i++) {
    corner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    );
    const v = corner.sub(target);
    const towardsCamera = v.dot(back);
    distance = Math.max(
      distance,
      towardsCamera + Math.abs(v.dot(right)) / tanH,
      towardsCamera + Math.abs(v.dot(up)) / tanV,
    );
  }

  camera.aspect = width / height;
  camera.position.copy(target).addScaledVector(back, distance);
  camera.lookAt(target);
  // Shift the image so the yard is centred in the space between the HUD bars.
  const shift = bottomFraction - topFraction; // in -1..1 screen units
  camera.setViewOffset(width, height, 0, (shift * height) / 2, width, height);
  camera.updateProjectionMatrix();
}
