// @ts-ignore -- Playwright lives in dev-environment/ rather than the root product manifest.
import pkg from '@playwright/test';
// @ts-ignore
const { defineConfig, devices } = pkg;
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import {
    PLAYWRIGHT_APP_ROOT,
    PLAYWRIGHT_OUTPUT_DIR,
    PLAYWRIGHT_TEST_RESULTS_DIR,
    resolvePlaywrightE2ePath,
} from './e2e/utils/playwrightPaths';

if (existsSync(PLAYWRIGHT_OUTPUT_DIR)) {
    rmSync(PLAYWRIGHT_OUTPUT_DIR, { recursive: true, force: true });
}
mkdirSync(PLAYWRIGHT_OUTPUT_DIR, { recursive: true });

const DEV_SERVER_URL = 'http://127.0.0.1:22301';

export default defineConfig({
    testDir: resolvePlaywrightE2ePath(),
    outputDir: PLAYWRIGHT_TEST_RESULTS_DIR,
    timeout: 30_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: false,
    use: {
        baseURL: DEV_SERVER_URL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run dev -- --host 127.0.0.1 --port 22301 --mode test',
        cwd: PLAYWRIGHT_APP_ROOT,
        url: DEV_SERVER_URL,
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
