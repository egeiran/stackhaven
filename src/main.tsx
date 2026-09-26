import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { YardRenderer } from './render/YardRenderer';
import { App } from './ui/App';
import './styles.css';

// Composition root: the only file allowed to wire all layers together.
const sceneHost = document.getElementById('scene');
const uiHost = document.getElementById('ui');
if (!sceneHost || !uiHost) throw new Error('index.html is missing #scene or #ui');

const renderer = new YardRenderer(sceneHost);
import.meta.hot?.dispose(() => renderer.dispose());

createRoot(uiHost).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
