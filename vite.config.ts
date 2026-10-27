import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: ['chrome100', 'edge100', 'firefox100', 'safari15.4'],
    rollupOptions: { output: { manualChunks: id => /node_modules\/(world-atlas|topojson|d3-geo|d3-array|internmap)/.test(id) ? 'geography' : undefined } },
  },
  test: { include: ['src/**/*.test.ts'] },
});
