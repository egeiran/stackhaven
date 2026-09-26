import {
  BoxGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { PALETTE, type ContainerColor } from '../core';
import { CONTAINER_SIZE, TRUCK_BED_Y } from './layout';
import { THEME } from './theme';

const BED_LENGTH = CONTAINER_SIZE.length + 0.25;
const unitBox = new BoxGeometry(1, 1, 1);
const unitEdges = new EdgesGeometry(unitBox);
const wheelGeometry = new CylinderGeometry(0.22, 0.22, 0.16, 14).rotateZ(Math.PI / 2);

/**
 * A container truck facing away from the camera (-z). Its cab and a ghost
 * container on the flatbed show the colour of the order it has come to collect.
 * The group's origin is the centre of the flatbed at ground level.
 */
export class Truck {
  readonly group = new Group();
  private readonly cabMaterial = new MeshStandardMaterial({
    color: THEME.truckCabIdle,
    roughness: 0.45,
  });
  private readonly chassisMaterial = new MeshStandardMaterial({
    color: THEME.truckChassis,
    roughness: 0.8,
  });
  private readonly tyreMaterial = new MeshStandardMaterial({ color: THEME.tyre, roughness: 0.9 });
  private readonly ghostMaterial = new MeshStandardMaterial({
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    roughness: 0.4,
  });
  private readonly ghostEdgeMaterial = new LineBasicMaterial();
  /** Outline + faint fill on the flatbed: "a container of this colour goes here". */
  private readonly ghost = new Group();

  constructor() {
    const part = (material: MeshStandardMaterial, w: number, h: number, d: number) => {
      const mesh = new Mesh(unitBox, material);
      mesh.scale.set(w, h, d);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      return mesh;
    };

    part(this.chassisMaterial, 0.95, 0.22, BED_LENGTH).position.set(0, TRUCK_BED_Y - 0.11, 0);
    part(this.chassisMaterial, 0.5, 0.3, BED_LENGTH + 0.9).position.set(0, 0.5, -0.45);
    part(this.cabMaterial, 1.05, 1.1, 0.9).position.set(0, 0.95, -BED_LENGTH / 2 - 0.55);
    part(this.chassisMaterial, 0.9, 0.35, 0.05).position.set(0, 1.2, -BED_LENGTH / 2 - 0.08);

    for (const z of [BED_LENGTH / 2 - 0.35, BED_LENGTH / 2 - 0.85, -BED_LENGTH / 2 - 0.6]) {
      for (const x of [-0.42, 0.42]) {
        const wheel = new Mesh(wheelGeometry, this.tyreMaterial);
        wheel.position.set(x, 0.22, z);
        wheel.castShadow = true;
        this.group.add(wheel);
      }
    }

    this.ghost.add(
      new Mesh(unitBox, this.ghostMaterial),
      new LineSegments(unitEdges, this.ghostEdgeMaterial),
    );
    this.ghost.scale.set(
      CONTAINER_SIZE.width * 0.96,
      CONTAINER_SIZE.height * 0.96,
      CONTAINER_SIZE.length * 0.98,
    );
    this.ghost.position.set(0, TRUCK_BED_Y + CONTAINER_SIZE.height * 0.48, 0);
    this.group.add(this.ghost);
  }

  get z(): number {
    return this.group.position.z;
  }

  set z(value: number) {
    this.group.position.z = value;
  }

  /** Paints the truck for an order, or makes it neutral (null). */
  setOrder(color: ContainerColor | null): void {
    this.cabMaterial.color.set(color ? PALETTE[color].hex : THEME.truckCabIdle);
    if (color) {
      this.ghostMaterial.color.set(PALETTE[color].hex);
      this.ghostEdgeMaterial.color.set(PALETTE[color].hex);
    }
    this.ghost.visible = color !== null;
  }

  /** Hides the ghost once the real container is on the flatbed. */
  set loaded(value: boolean) {
    this.ghost.visible = !value;
  }

  dispose(): void {
    for (const material of [
      this.cabMaterial,
      this.chassisMaterial,
      this.tyreMaterial,
      this.ghostMaterial,
    ]) {
      material.dispose();
    }
  }
}
