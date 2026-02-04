import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Relative paths for itch.io iframe deployment
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Optimize for production
    minify: 'esbuild',
    target: 'es2020',
  },
  server: {
    port: 5173,
  },
});
