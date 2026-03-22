/// <reference types="vitest/config" />
import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

import pkg from './package.json';

const external = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
  ...Object.keys(pkg.dependencies ?? {}),
]);

function cliShebangPlugin() {
  return {
    name: 'versionguard-cli-shebang',
    generateBundle(_: unknown, bundle: Record<string, { type: string; code?: string }>) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName === 'cli.js' && chunk.type === 'chunk' && typeof chunk.code === 'string') {
          if (!chunk.code.startsWith('#!/usr/bin/env node')) {
            chunk.code = `#!/usr/bin/env node\n${chunk.code}`;
          }
        }
      }
    },
  };
}

export default defineConfig({
  build: {
    target: 'node18',
    sourcemap: true,
    minify: false,
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/cli.ts'),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: (id) => external.has(id),
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
  plugins: [cliShebangPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/__tests__/**', 'src/types.ts'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
});
