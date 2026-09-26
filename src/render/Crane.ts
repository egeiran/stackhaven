import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { CONTAINER_SIZE, STACK_SPACING, type YardLayout } from './layout';
import { THEME } from './theme';

/** Half the distance between the legs along x: they stand in the gaps between stacks. */
const LEG_X = STACK_SPACING / 2;
/** Legs along z stand clear of the containers (and of the truck's lane). */
const LEG_Z = CONTAINER_SIZE.length / 2 + 0.55;
const SPREADER_HEIGHT = 0.12;

const unitBox = new BoxGeometry(1, 1, 1);

function box(material: MeshStandardMaterial, w: number, h: number, d: number): Mesh {
  const mesh = new Mesh(unitBox, material);
  mesh.scale.set(w, h, d);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * A rubber-tyred gantry crane made of boxes. It rolls along x over the stacks
 * and the truck bay; the spreader (the frame that grabs containers) hangs on
 * four cables and moves up and down. `x` and `hookY` are the only moving parts.
 */
export class Crane {
  readonly group = new Group();
  private readonly frame = new Group();
  private readonly spreader: Mesh;
  private readonly cables: Mesh[] = [];
  private readonly bodyMaterial = new MeshStandardMaterial({
    color: THEME.craneBody,
    roughness: 0.6,
  });
  private readonly accentMaterial = new MeshStandardMaterial({
    color: THEME.craneAccent,
    roughness: 0.5,
  });
  private readonly darkMaterial = new MeshStandardMaterial({
    color: THEME.spreader,
    roughness: 0.7,
  });
  private topY = 0;
  private hook = 0;

  constructor() {
    this.spreader = box(
      this.darkMaterial,
      CONTAINER_SIZE.width * 1.02,
      SPREADER_HEIGHT,
      CONTAINER_SIZE.length * 0.97,
    );
    for (const sx of [-0.3, 0.3]) {
      for (const sz of [-0.8, 0.8]) {
        const cable = box(this.darkMaterial, 0.035, 1, 0.035);
        cable.position.set(sx, 0, sz);
        cable.castShadow = false;
        this.cables.push(cable);
      }
    }
    this.group.add(this.frame, this.spreader, ...this.cables);
  }

  get x(): number {
    return this.group.position.x;
  }

  set x(value: number) {
    this.group.position.x = value;
  }

  /** Height of the spreader's underside; a carried container hangs just below it. */
  get hookY(): number {
    return this.hook;
  }

  set hookY(value: number) {
    this.hook = value;
    this.spreader.position.y = value + SPREADER_HEIGHT / 2;
    const cableBottom = value + SPREADER_HEIGHT;
    const length = Math.max(this.topY - 0.15 - cableBottom, 0.01);
    for (const cable of this.cables) {
      cable.scale.y = length;
      cable.position.y = cableBottom + length / 2;
    }
  }

  /** Rebuilds the frame for a new yard size (taller yards need a taller crane). */
  build(layout: YardLayout): void {
    this.frame.clear();
    const top = layout.craneTopY;
    this.topY = top;

    for (const lx of [-LEG_X, LEG_X]) {
      for (const lz of [-LEG_Z, LEG_Z]) {
        const leg = box(this.bodyMaterial, 0.14, top, 0.14);
        leg.position.set(lx, top / 2, lz);
        const bogie = box(this.accentMaterial, 0.2, 0.22, 0.6);
        bogie.position.set(lx, 0.11, lz);
        this.frame.add(leg, bogie);
      }
      const beam = box(this.bodyMaterial, 0.2, 0.26, LEG_Z * 2 + 0.3);
      beam.position.set(lx, top, 0);
      this.frame.add(beam);
    }
    for (const lz of [-LEG_Z, LEG_Z]) {
      const crossBeam = box(this.bodyMaterial, LEG_X * 2 + 0.2, 0.22, 0.18);
      crossBeam.position.set(0, top + 0.02, lz);
      this.frame.add(crossBeam);
    }

    const trolley = box(this.accentMaterial, LEG_X * 2 - 0.1, 0.24, 0.8);
    trolley.position.set(0, top + 0.1, 0);
    // Operator cab under the front of the trolley, clear of the cables.
    const cab = box(this.accentMaterial, 0.45, 0.4, 0.45);
    cab.position.set(0, top - 0.25, LEG_Z - 0.4);
    this.frame.add(trolley, cab);

    this.hookY = layout.travelHookY;
  }

  dispose(): void {
    this.bodyMaterial.dispose();
    this.accentMaterial.dispose();
    this.darkMaterial.dispose();
  }
}
