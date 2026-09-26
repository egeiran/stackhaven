import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameController } from './app/GameController';
import { LEVELS } from './app/levelRegistry';
import { YardRenderer } from './render/YardRenderer';
import { App } from './ui/App';
import './styles.css';

// Composition root: the only file that wires the layers together.
const sceneHost = document.getElementById('scene');
const uiHost = document.getElementById('ui');
if (!sceneHost || !uiHost) throw new Error('index.html is missing #scene or #ui');

// The insets tell the camera how much of the screen the HUD covers (see ui/ui.css).
const renderer = new YardRenderer(sceneHost, { insetTop: 150, insetBottom: 96 });
const controller = new GameController(LEVELS, renderer);

// ?level=03-last-in-first-out opens a level directly (handy for playtesting links).
const startLevel = new URLSearchParams(window.location.search).get('level');
if (startLevel && LEVELS.some((level) => level.id === startLevel)) {
  controller.startLevel(startLevel);
}

// iOS Safari ignores user-scalable=no; block its pinch-zoom gesture explicitly.
const preventZoom = (event: Event) => event.preventDefault();
document.addEventListener('gesturestart', preventZoom);

const root = createRoot(uiHost);
root.render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
);

// During development, Vite re-runs this file on changes: tear the old app down first.
import.meta.hot?.dispose(() => {
  root.unmount();
  renderer.dispose();
  document.removeEventListener('gesturestart', preventZoom);
});
