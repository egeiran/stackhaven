import * as THREE from 'three';

/**
 * Owns the Three.js scene. Used imperatively: the app layer calls methods on it,
 * it never reaches back into game logic.
 */
export class YardRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Phones report DPR 3+; rendering that many pixels costs a lot for little gain.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#cddfe8');

    const hemi = new THREE.HemisphereLight('#e8f2ff', '#5b5f63', 1.4);
    const sun = new THREE.DirectionalLight('#fff3e0', 2.2);
    sun.position.set(6, 12, 8);
    sun.castShadow = true;
    sun.shadow.radius = 4;
    this.scene.add(hemi, sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: '#8a8f93', roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 2.4),
      new THREE.MeshStandardMaterial({ color: '#2f6db3', roughness: 0.6 }),
    );
    box.position.y = 0.5;
    box.castShadow = true;
    this.scene.add(ground, box);

    this.camera.position.set(4, 6, 9);
    this.camera.lookAt(0, 0.5, 0);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();

    this.renderer.setAnimationLoop(() => this.renderer.render(this.scene, this.camera));
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private resize(): void {
    const { clientWidth: width, clientHeight: height } = this.host;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
