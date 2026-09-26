import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import { CONTAINER_SIZE, STACK_SPACING, type YardLayout } from './layout';
import { THEME } from './theme';

const unitBox = new BoxGeometry(1, 1, 1);

/** The ground: asphalt, a concrete yard pad, slot markings, the truck lane and the quay edge. */
export class YardFloor {
  readonly group = new Group();
  /** The slot markings on the ground: tappable, so an empty stack can be picked. */
  readonly slotGroup = new Group();
  private readonly materials = {
    ground: new MeshStandardMaterial({ color: THEME.ground, roughness: 0.95 }),
    pad: new MeshStandardMaterial({ color: THEME.yardPad, roughness: 0.9 }),
    slot: new MeshStandardMaterial({ color: THEME.slot, roughness: 0.85 }),
    slotSelected: new MeshStandardMaterial({
      color: THEME.slotSelected,
      emissive: THEME.slotSelected,
      emissiveIntensity: 0.35,
      roughness: 0.6,
    }),
    marking: new MeshStandardMaterial({ color: THEME.laneMarking, roughness: 0.8 }),
    water: new MeshStandardMaterial({ color: THEME.water, roughness: 0.25, metalness: 0.1 }),
    quay: new MeshStandardMaterial({ color: THEME.quay, roughness: 0.9 }),
    bollard: new MeshStandardMaterial({ color: THEME.bollard, roughness: 0.6 }),
  };
  private slots: Mesh[] = [];
  private selected: number | null = null;

  build(layout: YardLayout): void {
    this.group.clear();
    this.slotGroup.clear();
    this.slots = [];
    const m = this.materials;
    const flat = (
      material: MeshStandardMaterial,
      w: number,
      d: number,
      x: number,
      y: number,
      z: number,
    ) => {
      const mesh = new Mesh(unitBox, material);
      mesh.scale.set(w, 0.02, d);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      this.group.add(mesh);
      return mesh;
    };

    // The quay edge sits a little left of the yard; water beyond it.
    const quayX = layout.minX - 2.2;
    const ground = new Mesh(new PlaneGeometry(80, 80), m.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(quayX + 40, 0, 0);
    ground.receiveShadow = true;
    const water = new Mesh(new PlaneGeometry(80, 80), m.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(quayX - 40, -0.55, 0);
    const edge = new Mesh(unitBox, m.quay);
    edge.scale.set(0.35, 0.6, 80);
    edge.position.set(quayX + 0.175, -0.28, 0);
    edge.receiveShadow = true;
    this.group.add(ground, water, edge);

    for (let z = -12; z <= 12; z += 4) {
      const bollard = new Mesh(new CylinderGeometry(0.1, 0.13, 0.3, 10), m.bollard);
      bollard.position.set(quayX + 0.4, 0.15, z);
      bollard.castShadow = true;
      this.group.add(bollard);
    }

    const padDepth = CONTAINER_SIZE.length + 1.6;
    flat(
      m.pad,
      layout.maxX - layout.minX + 0.6,
      padDepth,
      (layout.minX + layout.maxX) / 2,
      0.01,
      0,
    );

    this.group.add(this.slotGroup);
    for (let i = 0; i < layout.stackCount; i++) {
      const slot = flat(
        m.slot,
        CONTAINER_SIZE.width + 0.2,
        CONTAINER_SIZE.length + 0.2,
        layout.stackX(i),
        0.02,
        0,
      );
      this.slotGroup.add(slot);
      this.slots.push(slot);
    }

    // Truck lane: two solid lines running along z through the bay.
    for (const side of [-1, 1]) {
      flat(m.marking, 0.06, 60, layout.bayX + side * (STACK_SPACING / 2 - 0.12), 0.025, 0);
    }

    this.setSelected(this.selected);
  }

  setSelected(index: number | null): void {
    this.selected = index;
    this.slots.forEach((slot, i) => {
      slot.material = i === index ? this.materials.slotSelected : this.materials.slot;
    });
  }

  dispose(): void {
    Object.values(this.materials).forEach((material) => material.dispose());
  }
}
