import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs: the build works on GitHub Pages (served from /<repo>/)
  // and later inside a Capacitor shell, without knowing the final path.
  base: './',
  plugins: [react()],
  build: {
    rolldownOptions: {
      // Two pages: the game and the level editor.
      input: { game: 'index.html', editor: 'editor.html' },
      output: {
        // Libraries change rarely: separate chunks stay cached between deploys.
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
    // three.js alone is ~650 kB minified (~170 kB gzipped); that is expected.
    chunkSizeWarningLimit: 800,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
