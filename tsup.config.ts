import { defineConfig } from 'tsup';

export default defineConfig([
  // Library build (ESM + TypeScript declaration files)
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node18',
    outDir: 'dist',
  },
  // CLI executable build
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    banner: {
      js: '#!/usr/bin/env node',
    },
    sourcemap: true,
    target: 'node18',
    outDir: 'dist',
  },
]);
