// World-space layout of the yard. One unit ≈ the height of a container.
// Stacks stand in a row along x with their long side along z; the truck bay
// is at the right-hand end of the row. Everything is centred on x = 0.

export const CONTAINER_SIZE = { width: 1, height: 1, length: 2.4 } as const;

/** Distance between neighbouring stack centres (leaves room for the crane legs). */
export const STACK_SPACING = 1.4;

/** Distance from the last stack centre to the truck bay centre. */
const BAY_OFFSET = 1.9;

/** Height of the truck's flatbed, where delivered containers are put down. */
export const TRUCK_BED_Y = 0.95;

/** Clearance between the tallest possible stack and a carried container. */
const TRAVEL_CLEARANCE = 0.35;

export interface YardLayout {
  readonly stackCount: number;
  readonly maxHeight: number;
  /** x of the truck bay centre. */
  readonly bayX: number;
  /** Hook (spreader underside) height while travelling: carried containers clear every stack. */
  readonly travelHookY: number;
  /** Height of the crane's top beams. */
  readonly craneTopY: number;
  /** Horizontal extent of everything the camera must show. */
  readonly minX: number;
  readonly maxX: number;
  stackX(index: number): number;
}

export function createLayout(stackCount: number, maxHeight: number): YardLayout {
  const firstX = -((stackCount - 1) * STACK_SPACING + BAY_OFFSET) / 2;
  const bayX = firstX + (stackCount - 1) * STACK_SPACING + BAY_OFFSET;
  const travelHookY = (maxHeight + 1) * CONTAINER_SIZE.height + TRAVEL_CLEARANCE;

  return {
    stackCount,
    maxHeight,
    bayX,
    travelHookY,
    craneTopY: travelHookY + 0.9,
    minX: firstX - STACK_SPACING / 2,
    maxX: bayX + STACK_SPACING / 2,
    stackX: (index) => firstX + index * STACK_SPACING,
  };
}

/** Height of a container's underside at position `height` in a stack (0 = ground). */
export function slotY(height: number): number {
  return height * CONTAINER_SIZE.height;
}
