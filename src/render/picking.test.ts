import { PerspectiveCamera, Vector2, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../core';
import { makeLevel } from '../core/testing';
import { frameBox, yardBounds, yardFraming } from './camera';
import { ContainerField } from './ContainerField';
import { CONTAINER_SIZE, createLayout, TRUCK_BED_Y, type YardLayout } from './layout';
import { pickTarget, targetAtX, type PickScene } from './picking';
import { Truck } from './Truck';
import { YardFloor } from './YardFloor';

// These tests build the real scene objects (no WebGL needed for raycasting)
// and tap on points of the visible geometry, projected to the screen.

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
] as const;

// Level 5's yard: tall stacks next to short ones (where taps used to go astray).
const state: GameState = createInitialState(
  makeLevel({
    stacks: [
      ['yellow', 'red', 'purple'],
      ['yellow', 'blue', 'orange'],
      ['white'],
      ['green', 'white'],
      [],
    ],
    orders: ['red'],
  }),
);

function buildScene(width: number, height: number) {
  const layout = createLayout(state.stacks.length, state.maxHeight);
  const camera = new PerspectiveCamera(35, 1, 0.1, 200);
  frameBox(camera, yardBounds(layout), width, height, yardFraming(width, height, 150, 96));

  const containers = new ContainerField();
  containers.sync(state, layout);
  const floor = new YardFloor();
  floor.build(layout);
  const truck = new Truck();
  truck.group.position.x = layout.bayX;
  truck.setOrder('red');
  for (const object of [containers.group, floor.group, truck.group]) object.updateMatrixWorld(true);

  const scene: PickScene = {
    camera,
    surfaces: [containers.group, floor.slotGroup, truck.group],
    layout,
    stackHeights: state.stacks.map((stack) => stack.length),
    width,
    height,
  };
  return { scene, layout, camera };
}

/** The screen point (as NDC) where a world point is drawn. */
function ndcOf(camera: PerspectiveCamera, point: Vector3): Vector2 {
  const projected = point.clone().project(camera);
  return new Vector2(projected.x, projected.y);
}

/** Points spread over the top face of the top container (or the slot, if empty). */
function topFacePoints(layout: YardLayout, index: number): Vector3[] {
  const height = state.stacks[index]?.length ?? 0;
  const y = height === 0 ? 0.03 : height * CONTAINER_SIZE.height - 0.05;
  const points: Vector3[] = [];
  for (const dx of [-0.35, 0, 0.35]) {
    for (const dz of [-1.05, -0.5, 0, 0.5, 1.05]) {
      points.push(new Vector3(layout.stackX(index) + dx, y, dz));
    }
  }
  return points;
}

describe.each(VIEWPORTS)('picking on $name', ({ width, height }) => {
  const { scene, layout, camera } = buildScene(width, height);

  it.each(state.stacks.map((_, index) => index))(
    'a tap anywhere on top of stack %i picks that stack',
    (index) => {
      for (const point of topFacePoints(layout, index)) {
        expect(pickTarget(scene, ndcOf(camera, point))).toEqual({ kind: 'stack', index });
      }
    },
  );

  it('a tap on the front of a container picks its stack', () => {
    for (const [index, stack] of state.stacks.entries()) {
      if (stack.length === 0) continue;
      const front = new Vector3(layout.stackX(index), 0.5, CONTAINER_SIZE.length / 2 - 0.02);
      expect(pickTarget(scene, ndcOf(camera, front))).toEqual({ kind: 'stack', index });
    }
  });

  it('a tap on the truck picks delivery', () => {
    const bed = new Vector3(layout.bayX, TRUCK_BED_Y + 0.5, 0);
    expect(pickTarget(scene, ndcOf(camera, bed))).toEqual({ kind: 'delivery' });
  });

  it('a tap just above a short stack still picks it', () => {
    const above = ndcOf(camera, new Vector3(layout.stackX(2), 1.6, -0.6));
    expect(pickTarget(scene, above)).toEqual({ kind: 'stack', index: 2 });
  });

  it('a tap in the empty sky picks nothing', () => {
    expect(pickTarget(scene, new Vector2(0, 0.95))).toBeNull();
  });
});

describe('targetAtX', () => {
  const layout = createLayout(3, 3);

  it('maps x positions to columns', () => {
    expect(targetAtX(layout.stackX(1) + 0.4, layout)).toEqual({ kind: 'stack', index: 1 });
    expect(targetAtX(layout.bayX - 0.3, layout)).toEqual({ kind: 'delivery' });
    expect(targetAtX(layout.minX - 5, layout)).toBeNull();
  });
});
