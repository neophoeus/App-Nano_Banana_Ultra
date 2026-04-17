// @ts-nocheck -- Local Playwright specs resolve runtime tooling from dev-environment/ rather than the root product manifest.
import type { Page } from '@playwright/test';
import playwrightTest from '@playwright/test';

const { expect, test } = playwrightTest;

const legacySharedSnapshot = {
    history: [
        {
            id: 'legacy-turn',
            url: 'https://example.com/legacy.png',
            prompt: 'Legacy restore should not win',
            aspectRatio: '1:1',
            size: '2K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 10,
            status: 'success',
        },
    ],
    stagedAssets: [],
    workflowLogs: [],
    queuedJobs: [],
    workspaceSession: {
        activeResult: null,
        continuityGrounding: null,
        continuitySessionHints: null,
        provenanceMode: null,
        provenanceSourceHistoryId: null,
        conversationId: null,
        conversationBranchOriginId: null,
        conversationActiveSourceHistoryId: null,
        conversationTurnIds: [],
        source: null,
        sourceHistoryId: null,
        sourceLineageAction: null,
        updatedAt: null,
    },
    branchState: {
        nameOverrides: {},
        continuationSourceByBranchOriginId: {},
    },
    conversationState: {
        byBranchOriginId: {},
    },
    viewState: {
        generatedImageUrls: [],
        selectedImageIndex: 0,
        selectedHistoryId: null,
    },
    composerState: {
        prompt: 'Legacy restore should not win',
        aspectRatio: '1:1',
        imageSize: '2K',
        imageStyle: 'None',
        imageModel: 'gemini-3.1-flash-image-preview',
        batchSize: 1,
        outputFormat: 'images-only',
        temperature: 1,
        thinkingLevel: 'minimal',
        includeThoughts: true,
        googleSearch: false,
        imageSearch: false,
        generationMode: 'Text to Image',
        executionMode: 'single-turn',
    },
};

const legacySharedSupportSnapshot = {
    ...legacySharedSnapshot,
    history: [
        {
            ...legacySharedSnapshot.history[0],
            text: 'Restored result text from the shared backup.',
            thoughts: null,
            sessionHints: {
                groundingMetadataReturned: true,
            },
        },
    ],
    workspaceSession: {
        ...legacySharedSnapshot.workspaceSession,
        activeResult: {
            text: 'Restored result text from the shared backup.',
            thoughts: null,
            grounding: null,
            metadata: null,
            sessionHints: {
                groundingMetadataReturned: true,
            },
            historyId: 'legacy-turn',
        },
    },
    viewState: {
        generatedImageUrls: ['https://example.com/legacy.png'],
        selectedImageIndex: 0,
        selectedHistoryId: 'legacy-turn',
    },
};

const getSignalState = async (testId: string, page: Page) => {
    const signal = page.getByTestId(testId);
    await expect(signal).toBeVisible();
    const outerClassName = (await signal.locator('span').first().getAttribute('class')) || '';

    return {
        isActive: outerClassName.includes('animate-pulse'),
        outerClassName,
    };
};

test('late shared snapshot restore does not overwrite a live draft', async ({ page }) => {
    let sharedSnapshotReads = 0;

    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    await page.route('**/api/workspace-snapshot', async (route, request) => {
        if (request.method() === 'POST') {
            await route.fulfill({
                status: 204,
                body: '',
            });
            return;
        }

        sharedSnapshotReads += 1;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ snapshot: legacySharedSnapshot }),
        });
    });

    await page.goto('/');

    const promptBox = page.getByRole('textbox').first();
    await expect(promptBox).toBeVisible();
    await promptBox.fill('Live draft should stay');

    await page.waitForTimeout(2600);

    await expect(promptBox).toHaveValue('Live draft should stay');
    await expect(page.getByTestId('workspace-unified-history-count')).toContainText('0 items');
    await expect(page.getByTestId('workspace-unified-history-branches')).toContainText('0 branches');
    await expect(page.getByText('Legacy restore should not win')).toHaveCount(0);
    expect(sharedSnapshotReads).toBeGreaterThan(0);
});

test('clear workspace clears restored support signals and does not relight them from shared backup', async ({
    page,
}) => {
    let sharedSnapshotReads = 0;
    let sharedSnapshotState: typeof legacySharedSupportSnapshot | null = legacySharedSupportSnapshot;
    const postedSnapshots: Array<Record<string, unknown>> = [];

    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    await page.route('**/api/workspace-snapshot', async (route, request) => {
        if (request.method() === 'POST') {
            const body = request.postDataJSON() as Record<string, unknown>;
            postedSnapshots.push(body);

            const history = Array.isArray(body.history) ? body.history : [];
            const stagedAssets = Array.isArray(body.stagedAssets) ? body.stagedAssets : [];
            const workflowLogs = Array.isArray(body.workflowLogs) ? body.workflowLogs : [];
            const queuedJobs = Array.isArray(body.queuedJobs) ? body.queuedJobs : [];
            const viewState = (body.viewState as Record<string, unknown> | undefined) || {};
            const composerState = (body.composerState as Record<string, unknown> | undefined) || {};
            const workspaceSession = (body.workspaceSession as Record<string, unknown> | undefined) || {};
            const hasRestorableContent = Boolean(
                history.length ||
                stagedAssets.length ||
                workflowLogs.length ||
                queuedJobs.length ||
                (Array.isArray(viewState.generatedImageUrls) ? viewState.generatedImageUrls.length : 0) ||
                viewState.selectedHistoryId ||
                (typeof composerState.prompt === 'string' ? composerState.prompt.trim() : '') ||
                workspaceSession.activeResult ||
                workspaceSession.sourceHistoryId ||
                workspaceSession.conversationId,
            );

            sharedSnapshotState = hasRestorableContent ? (body as typeof legacySharedSupportSnapshot) : null;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(hasRestorableContent ? { success: true } : { success: true, cleared: true }),
            });
            return;
        }

        sharedSnapshotReads += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ snapshot: sharedSnapshotState }),
        });
    });

    await page.goto('/');

    await expect(page.getByRole('textbox').first()).toHaveValue('Legacy restore should not win');
    await expect(page.getByTestId('workspace-unified-history-count')).toContainText('1 items');

    const workflowSignalBeforeClear = await getSignalState('workspace-progress-signal', page);
    const sourceSignalBeforeClear = await getSignalState('workspace-sources-signal', page);

    expect(workflowSignalBeforeClear.isActive).toBe(false);
    expect(sourceSignalBeforeClear.isActive).toBe(true);

    const sharedSnapshotReadsBeforeClear = sharedSnapshotReads;

    await page.getByTestId('workspace-unified-history-clear').click();
    await page.getByTestId('workspace-unified-history-clear-confirm-action').click();

    await expect(page.getByRole('textbox').first()).toHaveValue('');
    await expect(page.getByTestId('workspace-unified-history-count')).toContainText('0 items');

    const workflowSignalAfterClear = await getSignalState('workspace-progress-signal', page);
    const sourceSignalAfterClear = await getSignalState('workspace-sources-signal', page);

    expect(workflowSignalAfterClear.isActive).toBe(false);
    expect(sourceSignalAfterClear.isActive).toBe(false);
    expect(workflowSignalAfterClear.outerClassName).toContain('bg-slate-200/65');
    expect(sourceSignalAfterClear.outerClassName).toContain('bg-slate-200/65');

    await page.waitForTimeout(1200);

    await expect(page.getByTestId('workspace-unified-history-count')).toContainText('0 items');
    expect(sharedSnapshotState).toBeNull();
    expect(sharedSnapshotReads).toBe(sharedSnapshotReadsBeforeClear);
    expect(
        postedSnapshots.some(
            (snapshot) => ((snapshot.composerState as Record<string, unknown> | undefined)?.prompt || '') === '',
        ),
    ).toBe(true);
});
