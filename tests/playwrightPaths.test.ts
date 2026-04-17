import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
    PLAYWRIGHT_APP_ROOT,
    PLAYWRIGHT_E2E_ROOT,
    PLAYWRIGHT_GLOBAL_SETUP_PATH,
    PLAYWRIGHT_GLOBAL_TEARDOWN_PATH,
    PLAYWRIGHT_OUTPUT_DIR,
    PLAYWRIGHT_OUTPUT_STATE_MANIFEST_PATH,
    PLAYWRIGHT_TEST_RESULTS_DIR,
    resolvePlaywrightAppPath,
    resolvePlaywrightE2ePath,
} from '../e2e/utils/playwrightPaths';

describe('playwrightPaths', () => {
    it('anchors Playwright helper paths to the app and e2e directories', () => {
        expect(path.basename(PLAYWRIGHT_APP_ROOT)).toBe('App-Nano_Banana_Ultra');
        expect(PLAYWRIGHT_E2E_ROOT).toBe(path.join(PLAYWRIGHT_APP_ROOT, 'e2e'));
        expect(PLAYWRIGHT_OUTPUT_DIR).toBe(path.join(PLAYWRIGHT_APP_ROOT, 'output'));
        expect(PLAYWRIGHT_TEST_RESULTS_DIR).toBe(path.join(PLAYWRIGHT_APP_ROOT, 'test-results'));
        expect(PLAYWRIGHT_GLOBAL_SETUP_PATH).toBe(path.join(PLAYWRIGHT_E2E_ROOT, 'globalSetup.ts'));
        expect(PLAYWRIGHT_GLOBAL_TEARDOWN_PATH).toBe(path.join(PLAYWRIGHT_E2E_ROOT, 'globalTeardown.ts'));
        expect(PLAYWRIGHT_OUTPUT_STATE_MANIFEST_PATH).toBe(
            path.join(PLAYWRIGHT_TEST_RESULTS_DIR, '.playwright-output-state-manifest.json'),
        );
    });

    it('resolves app-local Playwright files from file location instead of shell cwd', () => {
        expect(resolvePlaywrightAppPath('playwright.config.ts')).toBe(path.join(PLAYWRIGHT_APP_ROOT, 'playwright.config.ts'));
        expect(resolvePlaywrightE2ePath('utils')).toBe(path.join(PLAYWRIGHT_E2E_ROOT, 'utils'));
        expect(fs.existsSync(resolvePlaywrightAppPath('playwright.config.ts'))).toBe(true);
        expect(fs.existsSync(PLAYWRIGHT_GLOBAL_SETUP_PATH)).toBe(true);
        expect(fs.existsSync(PLAYWRIGHT_GLOBAL_TEARDOWN_PATH)).toBe(true);
    });
});