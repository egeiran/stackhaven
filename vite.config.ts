import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs: the build works on GitHub Pages (served from /<repo>/)
  // and later inside a Capacitor shell, without knowing the final path.
  base: './',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
