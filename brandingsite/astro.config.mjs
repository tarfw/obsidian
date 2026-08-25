// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  outDir: './dist',
  server: {
    host: true,
    port: 4321
  },
  vite: {
    server: {
      watch: {
        usePolling: true,
        interval: 100
      }
    }
  }
});
