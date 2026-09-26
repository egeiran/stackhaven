import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  MathUtils,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { GameRenderer, TapTarget } from '../app/ports';
import type { GameEvent, GameState } from '../core';
import { ContainerField } from './ContainerField';
import { Crane } from './Crane';
import { frameBox, type FramingOptions } from './camera';
import { createLayout, type YardLayout } from './layout';
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

/**
 * The three.js implementation of GameRenderer. Used imperatively by the
 * GameController: it shows states, animates events and reports taps, but
 * never decides anything about the game.
 */
export class YardRenderer implements GameRenderer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(35, 1, 0.1, 200);
  private readonly sun = new DirectionalLight(THEME.sun, 2.4);
  private readonly floor = new YardFloor();
  private readonly containers = new ContainerField();
  private readonly crane = new Crane();
  private readonly truck = new Truck();
  private readonly resizeObserver: ResizeObserver;
  private readonly tapHandlers = new Set<(target: TapTarget) => void>();
  private layout: YardLayout = createLayout(EMPTY_QUAY.stacks, EMPTY_QUAY.maxHeight);
  private state: GameState | null = null;
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
    this.scene.add(this.floor.group, this.containers.group, this.crane.group, this.truck.group);
    this.applyLayout(this.layout);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();

    this.renderer.setAnimationLoop(() => this.tick());
  }

  // --- GameRenderer ---

  showState(state: GameState | null): void {
    this.state = state;
    const layout = state
      ? createLayout(state.stacks.length, state.maxHeight)
      : createLayout(EMPTY_QUAY.stacks, EMPTY_QUAY.maxHeight);
    if (
      layout.stackCount !== this.layout.stackCount ||
      layout.maxHeight !== this.layout.maxHeight
    ) {
      this.applyLayout(layout);
    }

    if (state) this.containers.sync(state, this.layout);
    else this.containers.clear();

    const order = state?.orders[0] ?? null;
    this.truck.group.visible = order !== null;
    this.truck.setOrder(order);
    this.truck.z = 0;
    this.requestRender();
  }

  playEvents(_events: readonly GameEvent[], finalState: GameState): Promise<void> {
    this.showState(finalState);
    return Promise.resolve();
  }

  setSelection(stack: number | null): void {
    this.floor.setSelected(stack);
    const top = stack === null ? undefined : this.state?.stacks[stack]?.at(-1);
    this.containers.setHighlighted(top?.id ?? null);
    if (stack !== null) this.crane.x = this.layout.stackX(stack);
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
    this.renderer.setAnimationLoop(null);
    this.floor.dispose();
    this.containers.dispose();
    this.crane.dispose();
    this.truck.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // --- Internals ---

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
    this.truck.group.position.x = layout.bayX;

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
    const framing: FramingOptions = {
      elevation: MathUtils.lerp(30, 46, portrait),
      azimuth: MathUtils.lerp(18, 10, portrait),
      insetTop: this.options.insetTop,
      insetBottom: this.options.insetBottom,
      sideMargin: 0.04,
    };
    frameBox(this.camera, this.frameBoxFor(this.layout), width, height, framing);
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

  private tick(): void {
    if (!this.needsRender) return;
    this.needsRender = false;
    this.renderer.render(this.scene, this.camera);
  }
}
