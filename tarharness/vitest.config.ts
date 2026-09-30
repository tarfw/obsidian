import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { environment: 'node', include: ['test/**/*.test.{ts,js}'], testTimeout: 60_000, hookTimeout: 60_000, fileParallelism: false } });
