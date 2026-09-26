import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameController } from './app/GameController';
import { decodeLevel, withCustomLevel } from './app/levelLink';
import { LEVELS } from './app/levelRegistry';
import type { Level } from './core';
import { YardRenderer } from './render/YardRenderer';
import { App } from './ui/App';
import './styles.css';

// Composition root: the only file that wires the layers together.
const sceneHost = document.getElementById('scene');
const uiHost = document.getElementById('ui');
if (!sceneHost || !uiHost) throw new Error('index.html is missing #scene or #ui');

// The insets tell the camera how much of the screen the HUD covers (see ui/ui.css).
// ?level=03-last-in-first-out opens a bundled level directly (handy for playtesting links);
// ?custom=… carries a whole level, e.g. a draft from the level editor.
const params = new URLSearchParams(window.location.search);
const custom = readCustomLevel(params.get('custom'));
const levels = custom ? withCustomLevel(LEVELS, custom) : LEVELS;

const renderer = new YardRenderer(sceneHost, { insetTop: 150, insetBottom: 96 });
const controller = new GameController(levels, renderer);

const startLevel = custom?.id ?? params.get('level');
if (startLevel && levels.some((level) => level.id === startLevel)) {
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

function readCustomLevel(encoded: string | null): Level | null {
  if (!encoded) return null;
  try {
    return decodeLevel(encoded);
  } catch (error) {
    console.error('Ignoring ?custom level:', error);
    return null;
  }
}
