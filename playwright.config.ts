// @ts-ignore -- Playwright lives in dev-environment/ rather than the root product manifest.
import playwrightTest from '@playwright/test';
import {
    PLAYWRIGHT_APP_ROOT,
    PLAYWRIGHT_GLOBAL_SETUP_PATH,
    PLAYWRIGHT_GLOBAL_TEARDOWN_PATH,
    PLAYWRIGHT_TEST_RESULTS_DIR,
    resolvePlaywrightE2ePath,
} from './e2e/utils/playwrightPaths';

const { defineConfig, devices } = playwrightTest;
const DEV_SERVER_URL = 'http://127.0.0.1:22301';

export default defineConfig({
    testDir: resolvePlaywrightE2ePath(),
    outputDir: PLAYWRIGHT_TEST_RESULTS_DIR,
    timeout: 30_000,
    globalSetup: PLAYWRIGHT_GLOBAL_SETUP_PATH,
    globalTeardown: PLAYWRIGHT_GLOBAL_TEARDOWN_PATH,
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
        command: 'npm run dev -- --host 127.0.0.1 --port 22301',
        cwd: PLAYWRIGHT_APP_ROOT,
        url: DEV_SERVER_URL,
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
