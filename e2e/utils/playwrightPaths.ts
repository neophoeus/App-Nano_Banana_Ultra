import path from 'path';
import { fileURLToPath } from 'url';

const currentFileDir = path.dirname(fileURLToPath(import.meta.url));

export const PLAYWRIGHT_E2E_ROOT = path.resolve(currentFileDir, '..');
export const PLAYWRIGHT_APP_ROOT = path.resolve(PLAYWRIGHT_E2E_ROOT, '..');
export const PLAYWRIGHT_OUTPUT_DIR = path.join(PLAYWRIGHT_APP_ROOT, 'output');
export const PLAYWRIGHT_TEST_RESULTS_DIR = path.join(PLAYWRIGHT_APP_ROOT, 'test-results');
export const PLAYWRIGHT_GLOBAL_SETUP_PATH = path.join(PLAYWRIGHT_E2E_ROOT, 'globalSetup.ts');
export const PLAYWRIGHT_GLOBAL_TEARDOWN_PATH = path.join(PLAYWRIGHT_E2E_ROOT, 'globalTeardown.ts');
export const PLAYWRIGHT_OUTPUT_STATE_MANIFEST_PATH = path.join(
    PLAYWRIGHT_TEST_RESULTS_DIR,
    '.playwright-output-state-manifest.json',
);

export const resolvePlaywrightAppPath = (...segments: string[]) => path.resolve(PLAYWRIGHT_APP_ROOT, ...segments);

export const resolvePlaywrightE2ePath = (...segments: string[]) => path.resolve(PLAYWRIGHT_E2E_ROOT, ...segments);