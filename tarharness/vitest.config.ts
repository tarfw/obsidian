import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { environment: 'node', include: ['test/**/*.test.{ts,js}'], testTimeout: 15_000 } });
