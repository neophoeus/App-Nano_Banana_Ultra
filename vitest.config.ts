/// <reference types="vitest/config" />

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@': appDirectory,
        },
    },
    test: {
        dir: path.resolve(appDirectory, 'tests'),
        include: ['**/*.{test,spec}.{ts,tsx}'],
        exclude: [
            'e2e/**',
            'dev-environment/**',
            'dist/**',
            'dist-ssr/**',
            'output/**',
            'test-results/**',
            'playwright-report/**',
            'coverage/**',
        ],
    },
});