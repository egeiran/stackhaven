import {
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PALETTE, type ContainerColor, type GameState } from '../core';
import { CONTAINER_SIZE, slotY, type YardLayout } from './layout';

const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const HIGHLIGHT = new Color('#ffffff');

/**
 * All containers, drawn with a single InstancedMesh: one draw call no matter
 * how many containers there are. Each container id gets a fixed instance index;
 * moving a container means writing a new matrix for that index.
 */
export class ContainerField {
  readonly group = new Group();
  private readonly geometry: RoundedBoxGeometry;
  private readonly material = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
  private mesh: InstancedMesh | null = null;
  private capacity = 0;
  /** Instance index per container id. */
  private readonly indices = new Map<string, number>();
  private readonly colors = new Map<string, ContainerColor>();
  /** Where each container is (its underside centre), or null when hidden. */
  private readonly positions = new Map<string, Vector3 | null>();
  private highlighted: string | null = null;
  private readonly matrix = new Matrix4();

  constructor() {
    const { width, height, length } = CONTAINER_SIZE;
    // Slightly smaller than the slot so neighbouring containers read as separate boxes.
    this.geometry = new RoundedBoxGeometry(width * 0.96, height * 0.96, length * 0.985, 2, 0.05);
    // Put the origin on the underside so a container's y is simply where it stands.
    this.geometry.translate(0, (height * 0.96) / 2, 0);
  }

  /**
   * Places every container of `state` in its stack and hides all others,
   * except those in `keep` (e.g. delivered containers still driving away).
   */
  sync(state: GameState, layout: YardLayout, keep: ReadonlySet<string> = new Set()): void {
    const present = new Set<string>();
    state.stacks.forEach((stack, stackIndex) => {
      stack.forEach((container, height) => {
        this.register(container.id, container.color);
        this.positions.set(container.id, new Vector3(layout.stackX(stackIndex), slotY(height), 0));
        present.add(container.id);
      });
    });
    for (const id of this.indices.keys()) {
      if (!present.has(id) && !keep.has(id)) this.positions.set(id, null);
    }
    this.highlighted = null;
    this.writeAll();
  }

  /** Hides every container (the empty quay before a level starts). */
  clear(): void {
    for (const id of this.indices.keys()) this.positions.set(id, null);
    this.highlighted = null;
    this.writeAll();
  }

  setPosition(id: string, x: number, y: number, z: number): void {
    const position = this.positions.get(id);
    if (position) position.set(x, y, z);
    else this.positions.set(id, new Vector3(x, y, z));
    this.writeMatrix(id);
  }

  getPosition(id: string): Vector3 | null {
    return this.positions.get(id)?.clone() ?? null;
  }

  hide(id: string): void {
    this.positions.set(id, null);
    this.writeMatrix(id);
  }

  /** Brightens one container (the top of the selected stack), or none. */
  setHighlighted(id: string | null): void {
    const previous = this.highlighted;
    this.highlighted = id;
    if (previous) this.writeColor(previous);
    if (id) this.writeColor(id);
  }

  dispose(): void {
    this.mesh?.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }

  private register(id: string, color: ContainerColor): void {
    this.colors.set(id, color);
    if (this.indices.has(id)) return;
    this.indices.set(id, this.indices.size);
    if (this.indices.size > this.capacity) this.grow(Math.max(16, this.capacity * 2));
  }

  /** InstancedMesh has a fixed size, so a bigger level needs a bigger mesh. */
  private grow(capacity: number): void {
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.dispose();
    }
    const mesh = new InstancedMesh(this.geometry, this.material, capacity);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Instances move far (onto trucks and away), so skip bounding-sphere culling.
    mesh.frustumCulled = false;
    for (let i = 0; i < capacity; i++) {
      mesh.setMatrixAt(i, HIDDEN);
      // Creating the colour attribute up front makes three compile the right shader.
      mesh.setColorAt(i, HIGHLIGHT);
    }
    this.mesh = mesh;
    this.capacity = capacity;
    this.group.add(mesh);
  }

  private writeAll(): void {
    for (const id of this.indices.keys()) {
      this.writeMatrix(id);
      this.writeColor(id);
    }
  }

  private writeMatrix(id: string): void {
    const index = this.indices.get(id);
    if (!this.mesh || index === undefined) return;
    const position = this.positions.get(id);
    this.mesh.setMatrixAt(index, position ? this.matrix.makeTranslation(position) : HIDDEN);
    this.mesh.instanceMatrix.needsUpdate = true;
    // Raycasting checks a cached bounding sphere first; recompute it lazily after moves.
    this.mesh.boundingSphere = null;
  }

  private writeColor(id: string): void {
    const index = this.indices.get(id);
    const key = this.colors.get(id);
    if (!this.mesh || index === undefined || !key) return;
    const color = new Color(PALETTE[key].hex);
    if (id === this.highlighted) color.lerp(HIGHLIGHT, 0.35);
    this.mesh.setColorAt(index, color);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
