import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Editor } from './Editor';

// Entry point of editor.html: a separate page, not part of the game bundle.
const host = document.getElementById('editor');
if (!host) throw new Error('editor.html is missing #editor');

createRoot(host).render(
  <StrictMode>
    <Editor />
  </StrictMode>,
);
