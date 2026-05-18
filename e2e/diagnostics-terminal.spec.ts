// @ts-nocheck -- Local Playwright specs resolve runtime tooling from dev-environment/ rather than the root product manifest.
import playwrightTest from '@playwright/test';

const { expect, test } = playwrightTest;

const composer = (page) => page.locator('.nbu-composer-dock-textarea textarea').first();
const generateButton = (page) => page.getByTestId('composer-generate-card').locator('button').first();

const mockImageUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRWQAAAAASUVORK5CYII=';

const buildMockGenerateStreamBody = (responsePayload, sessionId) =>
    [
        JSON.stringify({ type: 'start', sessionId }),
        JSON.stringify({
            type: 'complete',
            sessionId,
            response: responsePayload,
            summary: {
                transportOpened: true,
                orderingStable: true,
                preCompletionArtifactCount: 0,
                firstPreCompletionArtifactKind: null,
                thoughtSignatureObserved: false,
                finalRenderArrived: true,
                truthfulnessOutcome: 'final-only',
            },
        }),
    ].join('\n');

test.describe('diagnostics terminal', () => {
    test('captures a correlated generate request and response', async ({ page }) => {
        let usedRoute = '';
        let capturedRequestId = '';

        const responsePayload = {
            imageUrl: mockImageUrl,
            text: 'Diagnostics terminal smoke reply',
            thoughts: null,
            sessionHints: null,
            grounding: null,
            metadata: null,
        };

        await page.addInitScript(() => {
            window.localStorage.removeItem('nbu_ultra_debug_terminal_events');
        });

        await page.route('**/api/runtime-config', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ hasApiKey: true }),
            });
        });

        await page.route('**/api/health', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    ok: true,
                    hasApiKey: true,
                    outputDir: 'playwright-output',
                    timestamp: new Date().toISOString(),
                }),
            });
        });

        await page.route('**/api/images/generate', async (route) => {
            usedRoute = '/api/images/generate';
            capturedRequestId = route.request().headers()['x-nbu-debug-request-id'] || '';

            await route.fulfill({
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...(capturedRequestId ? { 'X-NBU-Debug-Request-ID': capturedRequestId } : {}),
                },
                body: JSON.stringify(responsePayload),
            });
        });

        await page.route('**/api/images/generate-stream', async (route) => {
            usedRoute = '/api/images/generate-stream';
            capturedRequestId = route.request().headers()['x-nbu-debug-request-id'] || '';

            await route.fulfill({
                status: 200,
                headers: {
                    'Content-Type': 'application/x-ndjson; charset=utf-8',
                    ...(capturedRequestId ? { 'X-NBU-Debug-Request-ID': capturedRequestId } : {}),
                },
                body: `${buildMockGenerateStreamBody(responsePayload, 'diagnostics-terminal-smoke-session')}\n`,
            });
        });

        await page.goto('/');
        await expect(page.getByTestId('debug-terminal-toggle')).toBeVisible();

        await composer(page).fill('Diagnostics terminal smoke prompt');
        await generateButton(page).click();

        await expect.poll(() => capturedRequestId).not.toBe('');
        await expect(page.getByTestId('generated-image-stage-frame')).toBeVisible();

        await page.getByTestId('debug-terminal-toggle').click();
        await expect(page.getByTestId('debug-terminal-panel')).toBeVisible();

        await page.getByTestId('debug-terminal-search').fill(capturedRequestId);

        const requestEvent = page.getByTestId('debug-terminal-event-request').first();
        await expect(requestEvent).toBeVisible();

        const responseEvents = page.getByTestId('debug-terminal-event-response');
        const streamEvents = page.getByTestId('debug-terminal-event-stream');
        const detailEvent = (await responseEvents.count()) > 0 ? responseEvents.first() : streamEvents.first();
        await expect(detailEvent).toBeVisible();
        await detailEvent.click();

        await expect(page.getByTestId('debug-terminal-selected-json')).toContainText(capturedRequestId);
        await expect(page.getByTestId('debug-terminal-selected-json')).toContainText(usedRoute);
        expect(capturedRequestId).toMatch(/[a-z0-9-]{8,}/i);
    });
});
