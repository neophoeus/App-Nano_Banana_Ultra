// @ts-nocheck -- Local Playwright specs resolve runtime tooling from dev-environment/ rather than the root product manifest.
import type { Page } from '@playwright/test';
import playwrightTest from '@playwright/test';

const { expect, test } = playwrightTest;

const setComposerBatchSize = async (page: Page, batchSize: number) => {
    await page.getByTestId('composer-settings-button').click();
    await expect(page.getByTestId('workspace-picker-sheet')).toBeVisible();
    await page
        .getByTestId('workspace-generation-settings-controls-pane')
        .getByRole('button', { name: String(batchSize), exact: true })
        .click();
    await page.getByTestId('generation-settings-apply').click();
    await expect(page.getByTestId('workspace-picker-sheet')).toHaveCount(0);
};

const installBrowserOnlyBatchCancelOverride = async (page: Page, options?: { postAbortDelayMs?: number }) => {
    await page.addInitScript(() => {
        localStorage.setItem('nbu_geminiApiKey', 'playwright-lite-key');
        localStorage.setItem('nbu_execution_mode_setting', 'direct');
        window.aistudio = {
            hasSelectedApiKey: async () => true,
            openSelectKey: async () => {},
        };

        const firstImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

        window.__NBU_TEST_SERVICE_OVERRIDES__ = {
            generateImageWithGemini: async (_options, context) => {
                const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));
                const waitForAbort = (abortSignal) =>
                    new Promise((resolve) => {
                        if (!abortSignal || abortSignal.aborted) {
                            resolve();
                            return;
                        }

                        abortSignal.addEventListener('abort', () => resolve(), { once: true });
                    });

                const firstReceived = context.onImageReceived
                    ? await context.onImageReceived(firstImage, 0)
                    : undefined;
                const firstResult = {
                    slotIndex: 0,
                    status: 'success',
                    url: firstImage,
                    displayUrl: firstReceived?.displayUrl ?? firstImage,
                    savedFilename: firstReceived?.savedFilename ?? 'lite-playwright-cancel-slot-1.png',
                    text: 'Lite playwright cancel slot 1',
                    metadata: {
                        actualOutput: { width: 1, height: 1 },
                    },
                };

                context.onProgress?.(1, context.batchSize);

                await wait(250);
                await waitForAbort(context.abortSignal);
                if ((window.__NBU_LITE_PLAYWRIGHT_POST_ABORT_DELAY__ || 0) > 0) {
                    await wait(window.__NBU_LITE_PLAYWRIGHT_POST_ABORT_DELAY__);
                }

                context.onProgress?.(context.batchSize, context.batchSize);

                return [
                    firstResult,
                    {
                        slotIndex: 1,
                        status: 'failed',
                        error: 'ABORTED',
                    },
                ];
            },
        };
    });

    await page.addInitScript(
        ({ postAbortDelayMs }) => {
            window.__NBU_LITE_PLAYWRIGHT_POST_ABORT_DELAY__ = postAbortDelayMs || 0;
        },
        { postAbortDelayMs: options?.postAbortDelayMs || 0 },
    );
};

const installBrowserOnlyCancelBeforeFirstPreviewOverride = async (page: Page) => {
    await page.addInitScript(() => {
        localStorage.setItem('nbu_geminiApiKey', 'playwright-lite-key');
        localStorage.setItem('nbu_execution_mode_setting', 'direct');
        window.aistudio = {
            hasSelectedApiKey: async () => true,
            openSelectKey: async () => {},
        };

        window.__NBU_TEST_SERVICE_OVERRIDES__ = {
            generateImageWithGemini: async (_options, context) => {
                const waitForAbort = (abortSignal) =>
                    new Promise((resolve) => {
                        if (!abortSignal || abortSignal.aborted) {
                            resolve();
                            return;
                        }

                        abortSignal.addEventListener('abort', () => resolve(), { once: true });
                    });

                await waitForAbort(context.abortSignal);
                context.onProgress?.(context.batchSize, context.batchSize);

                return Array.from({ length: context.batchSize }, (_, slotIndex) => ({
                    slotIndex,
                    status: 'failed',
                    error: 'ABORTED',
                }));
            },
        };
    });
};

test.describe('workspace generation smoke', () => {
    test('ready preview stays preview-only until cancel commits the completed result', async ({ page }) => {
        await installBrowserOnlyBatchCancelOverride(page, { postAbortDelayMs: 1500 });

        await page.goto('/');
        await expect(page.locator('.nbu-composer-dock-textarea textarea').first()).toBeVisible();
        const initialVisibleHistoryCardCount = await page
            .locator('[data-testid^="history-card-"]:visible:not([data-testid$="-image"])')
            .count();

        await setComposerBatchSize(page, 2);

        await page.locator('.nbu-composer-dock-textarea textarea').first().fill('Lite playwright cancel smoke prompt');
        await page.getByTestId('composer-generate-card').getByRole('button').first().click();

        await expect(page.getByTestId('history-preview-tile-0')).toBeVisible();
        await page.getByTestId('history-preview-tile-0').click();
        await expect(page.getByTestId('history-preview-selected-0')).toBeVisible();
        await expect(page.locator('[data-testid="stage-top-right-action-open-viewer"]:visible')).toHaveCount(0);

        await page.getByTestId('composer-generate-card').getByRole('button').first().click();

        const composerTextarea = page.locator('.nbu-composer-dock-textarea textarea').first();
        await expect(page.getByTestId('composer-cancel-finalizing-button')).toBeVisible();
        await expect(page.getByTestId('composer-cancel-finalizing-note')).toBeVisible();
        await expect(page.locator('[data-testid="stage-top-right-action-open-viewer"]:visible')).toHaveCount(0);
        await composerTextarea.fill('Lite prompt while finalizing');
        await expect(composerTextarea).toHaveValue('Lite prompt while finalizing');
        await page.getByTestId('composer-settings-button').click();
        await expect(page.getByTestId('workspace-picker-sheet')).toBeVisible();
        await page
            .getByTestId('workspace-generation-settings-controls-pane')
            .getByRole('button', { name: '1', exact: true })
            .click();
        await page.getByTestId('generation-settings-apply').click();
        await expect(page.getByTestId('workspace-picker-sheet')).toHaveCount(0);

        await expect(page.locator('[data-testid^="history-card-"]:visible:not([data-testid$="-image"])')).toHaveCount(
            initialVisibleHistoryCardCount + 1,
        );
        await expect(page.locator('[data-testid^="history-preview-tile-"]:visible')).toHaveCount(0);
        await expect(page.getByTestId('composer-cancel-finalizing-button')).toHaveCount(0);
        await expect(page.getByTestId('stage-top-right-action-open-viewer')).toBeVisible();

        await page.getByTestId('stage-top-right-action-open-viewer').click();
        await expect(page.getByTestId('workspace-viewer-overlay')).toBeVisible();
    });

    test('cancel before the first preview is ready leaves no preview or committed history behind', async ({ page }) => {
        await installBrowserOnlyCancelBeforeFirstPreviewOverride(page);

        await page.goto('/');
        await expect(page.locator('.nbu-composer-dock-textarea textarea').first()).toBeVisible();
        const initialVisibleHistoryCardCount = await page
            .locator('[data-testid^="history-card-"]:visible:not([data-testid$="-image"])')
            .count();

        await setComposerBatchSize(page, 2);

        await page.locator('.nbu-composer-dock-textarea textarea').first().fill('Lite early cancel smoke prompt');
        await page.getByTestId('composer-generate-card').getByRole('button').first().click();
        await expect(page.getByTestId('composer-generate-card').getByRole('button', { name: /cancel/i })).toBeVisible();

        await page
            .getByTestId('composer-generate-card')
            .getByRole('button', { name: /cancel/i })
            .click();
        await expect(
            page.getByTestId('composer-generate-card').getByRole('button', { name: /generate/i }),
        ).toBeVisible();

        await page.waitForTimeout(1000);

        await expect(page.locator('[data-testid^="history-preview-tile-"]:visible')).toHaveCount(0);
        await expect(page.locator('[data-testid^="history-card-"]:visible:not([data-testid$="-image"])')).toHaveCount(
            initialVisibleHistoryCardCount,
        );
        await expect(page.locator('[data-testid="stage-top-right-action-open-viewer"]:visible')).toHaveCount(0);
    });
});
