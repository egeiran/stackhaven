import {
  ACESFilmicToneMapping,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { GameRenderer, TapTarget } from '../app/ports';
import type { ContainerColor, GameEvent, GameState } from '../core';
import { Animator, easeInCubic, easeOutCubic, type Easing } from './animator';
import { frameBox } from './camera';
import { ContainerField } from './ContainerField';
import { Crane } from './Crane';
import {
  CONTAINER_SIZE,
  createLayout,
  STACK_SPACING,
  TRUCK_BED_Y,
  type YardLayout,
} from './layout';
import { TapPicker } from './TapPicker';
import { THEME } from './theme';
import { Truck } from './Truck';
import { YardFloor } from './YardFloor';

export interface YardRendererOptions {
  /** Pixels covered by the HUD at the top and bottom of the screen. */
  readonly insetTop: number;
  readonly insetBottom: number;
}

/** Layout shown before any level is loaded. */
const EMPTY_QUAY = { stacks: 4, maxHeight: 3 };

// Truck positions along z: parked at the bay, off-screen towards the camera, far away in the fog.
const TRUCK_ENTRY_Z = 16;
const TRUCK_EXIT_Z = -30;

// Animation speeds (seconds). Kept short: the player waits for every move.
const craneTravelTime = (distance: number) => Math.min(0.1 + 0.07 * distance, 0.45);
const hookTravelTime = (distance: number) => Math.min(0.08 + 0.06 * distance, 0.3);

/**
 * The three.js implementation of GameRenderer. Used imperatively by the
 * GameController: it shows states, animates events and reports taps, but
 * never decides anything about the game. Everything it knows about a move
 * comes from the events.
 */
export class YardRenderer implements GameRenderer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(35, 1, 0.1, 200);
  private readonly sun = new DirectionalLight(THEME.sun, 2.4);
  private readonly timer = new Timer();
  private readonly animator = new Animator();
  private readonly floor = new YardFloor();
  private readonly containers = new ContainerField();
  private readonly crane = new Crane();
  /** Two trucks, so the next one can drive in while the loaded one drives off. */
  private trucks: [Truck, Truck] = [new Truck(), new Truck()];
  private readonly pickTargets = new Group();
  private readonly picker: TapPicker;
  private readonly resizeObserver: ResizeObserver;
  private readonly tapHandlers = new Set<(target: TapTarget) => void>();
  private layout: YardLayout = createLayout(EMPTY_QUAY.stacks, EMPTY_QUAY.maxHeight);
  private state: GameState | null = null;
  /** Container hanging under the crane's spreader, if any. */
  private carried: string | null = null;
  /** Container riding on each truck, if any. */
  private readonly cargo = new Map<Truck, string>();
  private needsRender = true;

  constructor(
    private readonly host: HTMLElement,
    private readonly options: YardRendererOptions,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true });
    // Phones report DPR 3+; rendering that many pixels costs a lot for little gain.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    host.appendChild(this.renderer.domElement);

    this.scene.background = new Color(THEME.sky);
    this.scene.fog = new Fog(THEME.sky, 30, 70);
    this.setUpLights();
    this.scene.add(
      this.floor.group,
      this.containers.group,
      this.crane.group,
      this.pickTargets,
      ...this.trucks.map((truck) => truck.group),
    );
    this.applyLayout(this.layout);

    this.picker = new TapPicker(
      this.renderer.domElement,
      this.camera,
      this.pickTargets,
      (target) => {
        for (const handler of this.tapHandlers) handler(target);
      },
    );

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();

    this.timer.connect(document);
    this.renderer.setAnimationLoop((time) => this.tick(time));
  }

  // --- GameRenderer ---

  showState(state: GameState | null): void {
    this.animator.cancel();
    this.state = state;
    const layout = createLayout(
      state?.stacks.length ?? EMPTY_QUAY.stacks,
      state?.maxHeight ?? EMPTY_QUAY.maxHeight,
    );
    if (
      layout.stackCount !== this.layout.stackCount ||
      layout.maxHeight !== this.layout.maxHeight
    ) {
      this.applyLayout(layout);
    }

    this.carried = null;
    this.cargo.clear();
    if (state) this.containers.sync(state, this.layout);
    else this.containers.clear();
    this.crane.hookY = this.layout.travelHookY;

    const [parked, spare] = this.trucks;
    const order = state?.orders[0] ?? null;
    parked.setOrder(order);
    parked.z = order ? 0 : TRUCK_EXIT_Z;
    spare.setOrder(null);
    spare.z = TRUCK_ENTRY_Z;
    this.requestRender();
  }

  async playEvents(events: readonly GameEvent[], finalState: GameState): Promise<void> {
    for (const event of events) await this.animate(event);
    // The animations should already match finalState; syncing guards against drift.
    this.state = finalState;
    this.containers.sync(finalState, this.layout);
    this.requestRender();
  }

  setSelection(stack: number | null): void {
    this.floor.setSelected(stack);
    const top = stack === null ? undefined : this.state?.stacks[stack]?.at(-1);
    this.containers.setHighlighted(top?.id ?? null);
    // Roll the crane over the selected stack as feedback (not awaited: purely cosmetic).
    if (stack !== null) void this.moveCraneTo(this.layout.stackX(stack));
    this.requestRender();
  }

  onTap(handler: (target: TapTarget) => void): () => void {
    this.tapHandlers.add(handler);
    return () => {
      this.tapHandlers.delete(handler);
    };
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.picker.dispose();
    this.timer.dispose();
    this.renderer.setAnimationLoop(null);
    this.floor.dispose();
    this.containers.dispose();
    this.crane.dispose();
    for (const truck of this.trucks) truck.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // --- Event animations ---

  private async animate(event: GameEvent): Promise<void> {
    switch (event.type) {
      case 'ContainerLifted':
        await this.moveCraneTo(this.layout.stackX(event.from));
        await this.moveHookTo(this.hookYAbove(event.height));
        this.carried = event.containerId;
        await this.moveHookTo(this.layout.travelHookY);
        return;

      case 'ContainerPlaced':
        await this.moveCraneTo(this.layout.stackX(event.to));
        await this.moveHookTo(this.hookYAbove(event.height));
        this.carried = null;
        await this.moveHookTo(this.layout.travelHookY);
        return;

      case 'ContainerDelivered': {
        const [truck] = this.trucks;
        await this.moveCraneTo(this.layout.bayX);
        await this.moveHookTo(TRUCK_BED_Y + CONTAINER_SIZE.height);
        this.carried = null;
        this.cargo.set(truck, event.containerId);
        truck.loaded = true;
        await Promise.all([
          this.moveHookTo(this.layout.travelHookY),
          this.swapTrucks(event.nextOrder),
        ]);
        this.cargo.delete(truck);
        this.containers.hide(event.containerId);
        return;
      }

      case 'LevelWon':
      case 'LevelLost':
        return;
    }
  }

  /** The loaded truck drives off; if there is another order, the next truck drives in. */
  private async swapTrucks(nextOrder: ContainerColor | null): Promise<void> {
    const [leaving, arriving] = this.trucks;
    this.trucks = [arriving, leaving];
    arriving.setOrder(nextOrder);
    arriving.z = TRUCK_ENTRY_Z;

    const departure = this.tweenTo(leaving.z, TRUCK_EXIT_Z, 0.8, (z) => (leaving.z = z), {
      ease: easeInCubic,
    });
    const arrival = nextOrder
      ? this.tweenTo(TRUCK_ENTRY_Z, 0, 0.55, (z) => (arriving.z = z), {
          ease: easeOutCubic,
          delay: 0.2,
        })
      : Promise.resolve();
    await Promise.all([departure, arrival]);
  }

  private moveCraneTo(x: number): Promise<void> {
    const from = this.crane.x;
    return this.tweenTo(
      from,
      x,
      craneTravelTime(Math.abs(x - from)),
      (value) => (this.crane.x = value),
      {
        key: 'crane-x',
      },
    );
  }

  private moveHookTo(y: number): Promise<void> {
    const from = this.crane.hookY;
    return this.tweenTo(
      from,
      y,
      hookTravelTime(Math.abs(y - from)),
      (value) => (this.crane.hookY = value),
      {
        key: 'crane-hook',
      },
    );
  }

  private tweenTo(
    from: number,
    to: number,
    duration: number,
    set: (value: number) => void,
    options: { key?: string; ease?: Easing; delay?: number } = {},
  ): Promise<void> {
    if (Math.abs(to - from) < 1e-3 && !options.delay) {
      set(to);
      return Promise.resolve();
    }
    return this.animator.tween(duration, (p) => set(MathUtils.lerp(from, to, p)), options);
  }

  /** Hook height that grabs (or sets down) a container at stack position `height`. */
  private hookYAbove(height: number): number {
    return (height + 1) * CONTAINER_SIZE.height;
  }

  // --- Scene setup ---

  private setUpLights(): void {
    const hemi = new HemisphereLight(THEME.hemiSky, THEME.hemiGround, 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.radius = 3;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(hemi, this.sun, this.sun.target);
  }

  private applyLayout(layout: YardLayout): void {
    this.layout = layout;
    this.floor.build(layout);
    this.crane.build(layout);
    this.crane.x = (layout.stackX(0) + layout.bayX) / 2;
    for (const truck of this.trucks) truck.group.position.x = layout.bayX;
    this.buildPickTargets(layout);

    // Keep the shadow camera tight around the yard: sharper shadows for the same map size.
    const halfWidth = (layout.maxX - layout.minX) / 2 + 3;
    const shadow = this.sun.shadow.camera;
    shadow.left = -halfWidth;
    shadow.right = halfWidth;
    shadow.top = halfWidth;
    shadow.bottom = -halfWidth;
    shadow.near = 1;
    shadow.far = 50;
    shadow.updateProjectionMatrix();
    this.sun.position.set(-5, 13, 8);
    this.sun.target.position.set(0, 0, 0);

    this.frame();
  }

  /**
   * Invisible boxes that catch taps: one tall column per stack (so an empty
   * stack is as easy to hit as a full one) and one box over the truck bay.
   */
  private buildPickTargets(layout: YardLayout): void {
    for (const child of this.pickTargets.children) (child as Mesh).geometry.dispose();
    this.pickTargets.clear();
    const material = new MeshBasicMaterial({ visible: false });
    const columnHeight = layout.travelHookY;
    const depth = CONTAINER_SIZE.length + 0.4;

    const add = (target: TapTarget, x: number, width: number, height: number) => {
      const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
      mesh.position.set(x, height / 2, 0);
      mesh.userData.tapTarget = target;
      this.pickTargets.add(mesh);
    };
    for (let index = 0; index < layout.stackCount; index++) {
      add({ kind: 'stack', index }, layout.stackX(index), STACK_SPACING, columnHeight);
    }
    add({ kind: 'delivery' }, layout.bayX, STACK_SPACING + 0.2, TRUCK_BED_Y + 2);
  }

  /** Everything the camera must keep in view: stacks, crane, bay and truck. */
  private frameBoxFor(layout: YardLayout): Box3 {
    return new Box3(
      new Vector3(layout.minX - 0.1, 0, -2.2),
      new Vector3(layout.maxX + 0.1, layout.craneTopY + 0.3, 2.2),
    );
  }

  private frame(): void {
    const { clientWidth: width, clientHeight: height } = this.host;
    if (width === 0 || height === 0) return;
    // Portrait screens have height to spare: look down more steeply so the yard
    // fills it. Landscape screens get a lower, more three-dimensional view.
    const portrait = MathUtils.clamp((1.3 - width / height) / 0.8, 0, 1);
    frameBox(this.camera, this.frameBoxFor(this.layout), width, height, {
      elevation: MathUtils.lerp(30, 46, portrait),
      azimuth: MathUtils.lerp(18, 10, portrait),
      insetTop: this.options.insetTop,
      insetBottom: this.options.insetBottom,
      sideMargin: 0.04,
    });
    this.requestRender();
  }

  private resize(): void {
    const { clientWidth: width, clientHeight: height } = this.host;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.frame();
  }

  private requestRender(): void {
    this.needsRender = true;
  }

  /** Runs every frame, but only renders while something is moving or has changed. */
  private tick(time: number): void {
    this.timer.update(time);
    // Clamp so a backgrounded tab doesn't jump animations to the end in one frame.
    const dt = Math.min(this.timer.getDelta(), 0.1);
    const wasAnimating = this.animator.isActive;
    this.animator.update(dt);
    if (wasAnimating) this.needsRender = true;

    this.followAttachments();
    if (!this.needsRender) return;
    this.needsRender = false;
    this.renderer.render(this.scene, this.camera);
  }

  /** Carried containers follow the crane's spreader or their truck. */
  private followAttachments(): void {
    if (this.carried) {
      this.containers.setPosition(
        this.carried,
        this.crane.x,
        this.crane.hookY - CONTAINER_SIZE.height,
        0,
      );
    }
    for (const [truck, id] of this.cargo) {
      this.containers.setPosition(id, this.layout.bayX, TRUCK_BED_Y, truck.z);
    }
  }
}
