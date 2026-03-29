import { expect, test, type Locator, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { getTranslation, preloadAllTranslations, SUPPORTED_LANGUAGES, type Language } from '../utils/translations';

await preloadAllTranslations();

const TEST_LANGUAGE: Language = (process.env.PLAYWRIGHT_TEST_LANG as Language | undefined) || 'en';
const tt = (key: string, ...values: string[]) =>
    values.reduce((message, value, index) => message.replace(`{${index}}`, value), getTranslation(TEST_LANGUAGE, key));
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const localizedTemplatePattern = (key: string) =>
    new RegExp(
        `^${escapeRegExp(getTranslation(TEST_LANGUAGE, key)).replace('\\{0\\}', '\\d+').replace('\\{1\\}', '\\d+')}$`,
    );
const localizedFollowUpAction = (actionLabel: 'Reopen' | 'Continue' | 'Branch') => {
    switch (actionLabel) {
        case 'Reopen':
            return tt('lineageActionReopen');
        case 'Continue':
            return tt('lineageActionContinue');
        case 'Branch':
            return tt('lineageActionBranch');
        default:
            return actionLabel;
    }
};
const stripLogId = (message: string) => message.replace(/[\s\u3000]*[（(][^）)]+[）)](?:[。.]?)$/, '');
const localizedMessageByKey = (key: string, ...values: string[]) => tt(key, ...values);
const localizedLogByKey = (key: string, ...values: string[]) =>
    stripLogId(tt(key, ...(values.length > 0 ? values : ['12345678'])));
const localizedText = (message: string) => {
    switch (message) {
        case 'Workspace Restored':
            return tt('workspaceRestoreTitle');
        case 'Current Stage Source':
            return tt('sessionReplayCurrentStageSource');
        case 'Stage Source':
            return tt('workspacePickerStageSource');
        case 'Source':
            return tt('workspaceSourceBadge');
        case 'Candidate':
            return tt('workspaceImportReviewCandidate');
        case 'Promote Variant':
            return tt('historyContinuePromoteVariant');
        case 'Source Active':
            return tt('historyContinueSourceActive');
        case 'Official Conversation':
            return tt('workspaceInsightsOfficialConversation');
        case 'Selected Source':
            return tt('groundingPanelSelectedSource');
        case 'Selected Bundle':
            return tt('groundingPanelSelectedBundle');
        case 'History turn reopened as the current stage source.':
            return tt('historySourceReopenNotice');
        case 'History turn is now the active continuation source.':
            return tt('historySourceContinueNotice');
        case 'History turn staged as a new branch source. Composer settings were preserved.':
            return tt('historySourceBranchNotice');
        case 'Variant promoted as the active continuation source.':
            return tt('historySourceVariantContinueNotice');
        case 'History turn reopened as current stage source':
            return stripLogId(tt('historySourceReopenLog', '12345678'));
        case 'History turn aligned as active continuation source':
            return stripLogId(tt('historySourceContinueLog', '12345678'));
        case 'History turn staged as branch source while keeping the current composer settings':
            return stripLogId(tt('historySourceBranchLog', '12345678'));
        case 'History loaded.':
            return tt('historySourceLoadedLog');
        case 'Continuation source ':
            return `${tt('historyBranchContinuationSource')} `;
        case 'Grounding is being inherited from the previous compatible turn in this workspace session.':
            return tt('groundingProvenanceContinuityInherited');
        case 'Grounding shown here was returned directly on the active session turn.':
            return tt('groundingProvenanceContinuityLive');
        case 'inherited provenance':
            return tt('workspaceInsightsContinuityProvenanceInherited');
        case 'live provenance':
            return tt('workspaceInsightsContinuityProvenanceLive');
        case 'Showing the full citation context':
            return tt('groundingPanelFullContextState');
        default:
            return message;
    }
};

const snapshotFilePath = fileURLToPath(new URL('./fixtures/restore/ui-import-smoke-workspace.json', import.meta.url));
const variantSnapshotFilePath = fileURLToPath(
    new URL('./fixtures/restore/ui-import-variant-workspace.json', import.meta.url),
);
const invalidSnapshotFilePath = fileURLToPath(
    new URL('./fixtures/restore/ui-import-invalid-workspace.json', import.meta.url),
);
const inheritedProvenanceSnapshotFilePath = fileURLToPath(
    new URL('./fixtures/restore/ui-import-provenance-inherited-workspace.json', import.meta.url),
);
const liveProvenanceSnapshotFilePath = fileURLToPath(
    new URL('./fixtures/restore/ui-import-provenance-live-workspace.json', import.meta.url),
);
const multiBundleProvenanceSnapshotFilePath = fileURLToPath(
    new URL('./fixtures/restore/ui-import-provenance-multi-bundle-workspace.json', import.meta.url),
);
const officialConversationSnapshotFilePath = fileURLToPath(
    new URL('./fixtures/restore/ui-import-official-conversation-workspace.json', import.meta.url),
);
const editorSharedContextFixturePath = fileURLToPath(
    new URL('./fixtures/restore/editor-shared-context-fixture.svg', import.meta.url),
);
const queuedImportedFixtureDataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const editorSharedControlsPrompt = 'Editor surface prompt';
const sketchSharedControlsPrompt = 'Sketch surface prompt';
const sketchSharedControlsUpdatedPrompt = 'Updated from sketch shared controls';
const restoredOfficialConversationSnapshot = {
    history: [
        {
            id: 'chat-follow-up-turn',
            url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            prompt: 'Official chat follow-up turn',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710200001000,
            mode: 'Follow-up Edit',
            executionMode: 'chat-continuation',
            status: 'success',
            text: 'Official chat follow-up text',
            conversationId: 'chatconv1-restore-path',
            conversationBranchOriginId: 'chat-root-turn',
            conversationSourceHistoryId: 'chat-root-turn',
            conversationTurnIndex: 0,
            parentHistoryId: 'chat-root-turn',
            rootHistoryId: 'chat-root-turn',
            sourceHistoryId: 'chat-root-turn',
            lineageAction: 'continue',
            lineageDepth: 1,
        },
        {
            id: 'chat-root-turn',
            url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            prompt: 'Official chat root turn',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710200000000,
            mode: 'Text to Image',
            executionMode: 'single-turn',
            status: 'success',
            text: 'Official chat root text',
            rootHistoryId: 'chat-root-turn',
            lineageAction: 'root',
            lineageDepth: 0,
        },
    ],
    stagedAssets: [
        {
            id: 'stage-official-chat',
            url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            role: 'stage-source',
            origin: 'history',
            createdAt: 1710200002000,
            sourceHistoryId: 'chat-follow-up-turn',
            lineageAction: 'continue',
        },
    ],
    workflowLogs: [
        '[10:30:00] Official conversation snapshot restored.',
        '[10:30:01] Session fields are intentionally stale to validate restore normalization.',
    ],
    workspaceSession: {
        activeResult: {
            text: 'Official chat follow-up text',
            thoughts: null,
            grounding: null,
            metadata: null,
            sessionHints: {
                thoughtSignatureReturned: true,
                restoredFromSnapshot: true,
            },
            historyId: 'chat-follow-up-turn',
        },
        continuityGrounding: null,
        continuitySessionHints: {
            thoughtSignatureReturned: true,
            restoredFromSnapshot: true,
        },
        provenanceMode: null,
        provenanceSourceHistoryId: null,
        conversationId: 'stale-conversation-id',
        conversationBranchOriginId: 'stale-branch-origin',
        conversationActiveSourceHistoryId: 'stale-active-source',
        conversationTurnIds: ['stale-active-source'],
        source: 'history',
        sourceHistoryId: 'chat-follow-up-turn',
        updatedAt: 1710200003000,
    },
    branchState: {
        nameOverrides: {
            'chat-root-turn': 'Chat Branch',
        },
        continuationSourceByBranchOriginId: {
            'chat-root-turn': 'chat-follow-up-turn',
        },
    },
    conversationState: {
        byBranchOriginId: {
            'chat-root-turn': {
                conversationId: 'chatconv1-restore-path',
                branchOriginId: 'chat-root-turn',
                activeSourceHistoryId: 'chat-follow-up-turn',
                turnIds: ['chat-follow-up-turn'],
                startedAt: 1710200000500,
                updatedAt: 1710200001500,
            },
        },
    },
    viewState: {
        generatedImageUrls: ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='],
        selectedImageIndex: 0,
        selectedHistoryId: 'chat-follow-up-turn',
    },
    composerState: {
        prompt: 'Restored official conversation workspace',
        aspectRatio: '1:1',
        imageSize: '1K',
        imageStyle: 'None',
        imageModel: 'gemini-3.1-flash-image-preview',
        batchSize: 1,
        outputFormat: 'images-only',
        temperature: 1,
        thinkingLevel: 'minimal',
        includeThoughts: true,
        googleSearch: false,
        imageSearch: false,
        generationMode: 'Follow-up Edit',
        executionMode: 'chat-continuation',
    },
};

const restoredFileBackedSnapshot = {
    history: [
        {
            id: 'file-backed-turn',
            url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            savedFilename: 'file-backed-turn.png',
            prompt: 'File-backed restored turn',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710200100000,
            mode: 'Text to Image',
            executionMode: 'single-turn',
            status: 'success',
            text: 'File-backed restored turn text',
            rootHistoryId: 'file-backed-turn',
            lineageAction: 'root',
            lineageDepth: 0,
        },
    ],
    stagedAssets: [
        {
            id: 'file-backed-stage',
            url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            savedFilename: 'file-backed-turn.png',
            role: 'stage-source',
            origin: 'history',
            createdAt: 1710200101000,
            sourceHistoryId: 'file-backed-turn',
            lineageAction: 'reopen',
        },
    ],
    workflowLogs: ['[10:31:00] File-backed restore snapshot loaded.'],
    workspaceSession: {
        activeResult: {
            text: 'File-backed restored turn text',
            thoughts: null,
            grounding: null,
            metadata: null,
            sessionHints: null,
            historyId: 'file-backed-turn',
        },
        continuityGrounding: null,
        continuitySessionHints: null,
        provenanceMode: null,
        provenanceSourceHistoryId: null,
        conversationId: null,
        conversationBranchOriginId: null,
        conversationActiveSourceHistoryId: null,
        conversationTurnIds: [],
        source: 'history',
        sourceHistoryId: 'file-backed-turn',
        updatedAt: 1710200102000,
    },
    branchState: {
        nameOverrides: {},
        continuationSourceByBranchOriginId: {},
    },
    conversationState: {
        byBranchOriginId: {},
    },
    viewState: {
        generatedImageUrls: ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='],
        selectedImageIndex: 0,
        selectedHistoryId: 'file-backed-turn',
    },
    composerState: {
        prompt: 'File-backed restore prompt',
        aspectRatio: '1:1',
        imageSize: '1K',
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

const queuedBatchPanelSnapshot = {
    history: [
        {
            id: 'queued-imported-turn',
            url: queuedImportedFixtureDataUrl,
            prompt: 'Imported queued results',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710400065000,
            mode: 'Text to Image',
            executionMode: 'queued-batch-job',
            variantGroupId: 'batches/job-imported',
            status: 'success',
            text: 'Imported queued batch result text',
            thoughts: 'Imported queued batch thoughts',
            metadata: {
                batchJobName: 'batches/job-imported',
                batchResultIndex: 0,
            },
            sourceHistoryId: 'queued-source-turn',
            lineageAction: 'continue',
            lineageDepth: 1,
        },
        {
            id: 'queued-imported-turn-2',
            url: queuedImportedFixtureDataUrl,
            prompt: 'Imported queued results alternate angle',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710400066000,
            mode: 'Text to Image',
            executionMode: 'queued-batch-job',
            variantGroupId: 'batches/job-imported',
            status: 'success',
            text: 'Imported queued batch result text two',
            metadata: {
                batchJobName: 'batches/job-imported',
                batchResultIndex: 1,
            },
            sourceHistoryId: 'queued-source-turn',
            lineageAction: 'continue',
            lineageDepth: 1,
        },
    ],
    stagedAssets: [],
    workflowLogs: ['[11:40:00] Restored queued batch workspace.'],
    queuedJobs: [
        {
            localId: 'job-pending',
            name: 'batches/job-pending',
            displayName: 'Pending panorama batch',
            state: 'JOB_STATE_PENDING',
            model: 'gemini-3.1-flash-image-preview',
            prompt: 'Create a queued panorama',
            generationMode: 'Text to Image',
            aspectRatio: '16:9',
            imageSize: '1K',
            style: 'None',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
            batchSize: 2,
            objectImageCount: 0,
            characterImageCount: 0,
            createdAt: 1710400000000,
            updatedAt: 1710400000000,
            startedAt: null,
            completedAt: null,
            lastPolledAt: null,
            importedAt: null,
            error: null,
            sourceHistoryId: 'queued-source-turn',
            lineageAction: 'continue',
        },
        {
            localId: 'job-ready',
            name: 'batches/job-ready',
            displayName: 'Ready character batch',
            state: 'JOB_STATE_SUCCEEDED',
            model: 'gemini-3-pro-image-preview',
            prompt: 'Import queued character results',
            generationMode: 'Follow-up Edit',
            aspectRatio: '1:1',
            imageSize: '1K',
            style: 'Anime',
            outputFormat: 'images-and-text',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
            batchSize: 1,
            objectImageCount: 1,
            characterImageCount: 1,
            createdAt: 1710400010000,
            updatedAt: 1710400030000,
            startedAt: 1710400015000,
            completedAt: 1710400020000,
            lastPolledAt: 1710400030000,
            importedAt: null,
            error: null,
        },
        {
            localId: 'job-imported',
            name: 'batches/job-imported',
            displayName: 'Imported archive batch',
            state: 'JOB_STATE_SUCCEEDED',
            model: 'gemini-3.1-flash-image-preview',
            prompt: 'Imported queued results',
            generationMode: 'Text to Image',
            aspectRatio: '1:1',
            imageSize: '1K',
            style: 'None',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
            batchSize: 1,
            objectImageCount: 0,
            characterImageCount: 0,
            createdAt: 1710400040000,
            updatedAt: 1710400060000,
            startedAt: 1710400045000,
            completedAt: 1710400050000,
            lastPolledAt: 1710400060000,
            importedAt: 1710400065000,
            error: null,
        },
        {
            localId: 'job-failed',
            name: 'batches/job-failed',
            displayName: 'Failed storyboard batch',
            state: 'JOB_STATE_FAILED',
            model: 'gemini-3.1-flash-image-preview',
            prompt: 'Generate failed storyboard',
            generationMode: 'Text to Image',
            aspectRatio: '16:9',
            imageSize: '1K',
            style: 'None',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
            batchSize: 4,
            objectImageCount: 0,
            characterImageCount: 0,
            createdAt: 1710400070000,
            updatedAt: 1710400080000,
            startedAt: 1710400075000,
            completedAt: 1710400080000,
            lastPolledAt: 1710400080000,
            importedAt: null,
            error: 'Upstream batch failed.',
        },
    ],
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
        source: 'empty',
        sourceHistoryId: null,
        updatedAt: 1710400090000,
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
        prompt: 'Restored queued batch workspace',
        aspectRatio: '1:1',
        imageSize: '1K',
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
        executionMode: 'queued-batch-job',
    },
};

const uncitedProvenanceSnapshot = {
    history: [
        {
            id: 'turn-uncited-live',
            url: 'https://example.com/uncited-live.png',
            prompt: 'Uncited provenance turn',
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710300000000,
            mode: 'Text to Image',
            executionMode: 'single-turn',
            status: 'success',
            text: 'Uncited provenance result',
            grounding: {
                enabled: true,
                webQueries: ['taipei skyline'],
                searchEntryPointAvailable: true,
                supports: [
                    {
                        chunkIndices: [0],
                        sourceIndices: [0],
                        sourceTitles: ['Taipei City Portal'],
                        segmentText: 'Taipei skyline overview with landmark highlights',
                    },
                ],
                sources: [
                    {
                        title: 'Taipei City Portal',
                        url: 'https://example.com/taipei-city',
                        sourceType: 'web',
                    },
                    {
                        title: 'Skyline Stock Gallery',
                        url: 'https://example.com/skyline-gallery',
                        sourceType: 'image',
                    },
                ],
            },
            sessionHints: {
                groundingMetadataReturned: true,
                groundingSupportsReturned: true,
            },
            rootHistoryId: 'turn-uncited-live',
            lineageAction: 'root',
            lineageDepth: 0,
        },
    ],
    stagedAssets: [],
    workflowLogs: ['[10:45:00] Uncited provenance snapshot loaded.'],
    workspaceSession: {
        activeResult: {
            text: 'Uncited provenance result',
            thoughts: null,
            grounding: {
                enabled: true,
                webQueries: ['taipei skyline'],
                searchEntryPointAvailable: true,
                supports: [
                    {
                        chunkIndices: [0],
                        sourceIndices: [0],
                        sourceTitles: ['Taipei City Portal'],
                        segmentText: 'Taipei skyline overview with landmark highlights',
                    },
                ],
                sources: [
                    {
                        title: 'Taipei City Portal',
                        url: 'https://example.com/taipei-city',
                        sourceType: 'web',
                    },
                    {
                        title: 'Skyline Stock Gallery',
                        url: 'https://example.com/skyline-gallery',
                        sourceType: 'image',
                    },
                ],
            },
            metadata: null,
            sessionHints: {
                groundingMetadataReturned: true,
                groundingSupportsReturned: true,
            },
            historyId: 'turn-uncited-live',
        },
        continuityGrounding: null,
        continuitySessionHints: null,
        provenanceMode: 'live',
        provenanceSourceHistoryId: 'turn-uncited-live',
        source: 'history',
        sourceHistoryId: 'turn-uncited-live',
        updatedAt: 1710300001000,
    },
    branchState: {
        nameOverrides: {},
        continuationSourceByBranchOriginId: {},
    },
    viewState: {
        generatedImageUrls: ['https://example.com/uncited-live.png'],
        selectedImageIndex: 0,
        selectedHistoryId: 'turn-uncited-live',
    },
    composerState: {
        prompt: 'Uncited provenance prompt',
        aspectRatio: '1:1',
        imageSize: '1K',
        imageStyle: 'None',
        imageModel: 'gemini-3.1-flash-image-preview',
        batchSize: 1,
        outputFormat: 'images-only',
        temperature: 1,
        thinkingLevel: 'minimal',
        includeThoughts: false,
        googleSearch: true,
        imageSearch: false,
        generationMode: 'Text to Image',
    },
};

const composer = (page: Page) => page.locator('textarea:visible').first();
const visibleProvenancePanel = (page: Page) =>
    page
        .locator('[data-testid="provenance-panel-light"]:visible, [data-testid="provenance-panel-dark"]:visible')
        .first();
const visibleFilmstripCard = (page: Page) => page.locator('[data-testid^="filmstrip-card-"]:visible').first();
const currentStageSourceCard = (page: Page) => page.locator('[data-testid="current-stage-source"]:visible').first();
const activeBranchCard = (page: Page) => page.locator('[data-testid="active-branch-card"]:visible').first();
const lineageMap = (page: Page) => page.locator('[data-testid="lineage-map-card"]:visible').first();
const firstSessionStackCard = (page: Page) => page.locator('[data-testid^="session-stack-card-"]:visible').first();
const firstLineageMapTurn = (page: Page) => page.locator('[data-testid^="lineage-map-turn-"]:visible').first();
const generateButton = (page: Page) => page.getByRole('button', { name: tt('generate') }).first();

const ensureWorkspaceInsightsExpanded = async (page: Page) => {
    const details = page.getByTestId('workspace-insights-collapsible').first();
    if ((await details.count()) === 0) {
        return;
    }

    const isOpen = await details.evaluate((element) => (element instanceof HTMLDetailsElement ? element.open : true));
    if (!isOpen) {
        await details.evaluate((element) => {
            if (element instanceof HTMLDetailsElement) {
                element.open = true;
            }
        });
    }
};

const ensureDetailsExpanded = async (page: Page, testId: string) => {
    if (testId !== 'workspace-insights-collapsible') {
        await ensureWorkspaceInsightsExpanded(page);
    }

    const details = page.getByTestId(testId).first();
    if ((await details.count()) === 0) {
        return;
    }

    const isOpen = await details.evaluate((element) => {
        return element instanceof HTMLDetailsElement ? element.open : true;
    });

    if (!isOpen) {
        await details.evaluate((element) => {
            if (element instanceof HTMLDetailsElement) {
                element.open = true;
            }
        });
    }
};

const clickFirstVisible = async (locator: Locator) => {
    const count = await locator.count();
    for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        if (await candidate.isVisible()) {
            await candidate.click();
            return;
        }
    }

    await expect(locator.first()).toBeVisible();
    await locator.first().click();
};

const clickSummary = async (locator: Locator) => {
    await locator.first().evaluate((element: HTMLElement) => element.click());
};

const openGalleryPanel = async (page: Page) => {
    const firstVisibleHistoryCard = page.locator('[data-testid^="history-card-"]:visible').first();
    if ((await firstVisibleHistoryCard.count()) > 0) {
        return;
    }

    const galleryOpeners = [
        page.getByRole('button', { name: tt('workspaceSheetTitleGallery') }),
        page.getByRole('button', { name: tt('workspaceInsightsOpenGallery') }),
        page.getByRole('button', { name: /Open Gallery/i }),
    ];

    for (const opener of galleryOpeners) {
        if ((await opener.count()) > 0) {
            await clickFirstVisible(opener);
            break;
        }
    }

    await expect(page.locator('[data-testid^="history-card-"]').first()).toBeVisible();
};

const installOfficialConversationGenerateCaptureRoute = async (page: Page) => {
    const capturedBodies: Array<Record<string, unknown>> = [];

    await page.route('**/api/images/generate', async (route) => {
        const requestBody = route.request().postDataJSON() as Record<string, unknown>;
        capturedBodies.push(requestBody);

        const conversationContext = (requestBody.conversationContext || {}) as {
            conversationId?: string;
            branchOriginId?: string;
            activeSourceHistoryId?: string;
            priorTurns?: unknown[];
        };

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                imageUrl:
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRWQAAAAASUVORK5CYII=',
                text: 'Browser official conversation reply',
                thoughts: 'Browser official reasoning',
                sessionHints: {
                    officialConversationUsed: true,
                    thoughtSignatureReturned: true,
                },
                conversation: {
                    used: true,
                    conversationId: conversationContext.conversationId || null,
                    branchOriginId: conversationContext.branchOriginId || null,
                    activeSourceHistoryId: conversationContext.activeSourceHistoryId || null,
                    priorTurnCount: Array.isArray(conversationContext.priorTurns)
                        ? conversationContext.priorTurns.length
                        : 0,
                    historyLength:
                        (Array.isArray(conversationContext.priorTurns) ? conversationContext.priorTurns.length : 0) + 1,
                },
            }),
        });
    });

    return capturedBodies;
};

const assertCurrentStageSourceCard = async (
    page: Page,
    options: {
        sourceLabel?: string;
        actionLabel: 'Reopen' | 'Continue' | 'Branch';
        branchLabel?: string;
        expectOpenAction?: boolean;
        expectContinueAction?: boolean;
        expectBranchAction?: boolean;
    },
) => {
    const stageSourceCard = currentStageSourceCard(page);

    await expect(stageSourceCard).toContainText(tt('workspaceInsightsCurrentImage'));
    if (options.sourceLabel) {
        await expect(stageSourceCard).toContainText(options.sourceLabel);
    }
    await expect(stageSourceCard).toContainText(localizedFollowUpAction(options.actionLabel));
    if (options.branchLabel) {
        await expect(stageSourceCard).toContainText(options.branchLabel);
    }
    if (options.expectOpenAction) {
        await ensureDetailsExpanded(page, 'current-stage-source-shell');
        await ensureDetailsExpanded(page, 'current-stage-source-details');
        await expect(stageSourceCard.getByTestId('current-stage-source-open')).toBeVisible();
    }
    if (options.expectContinueAction) {
        await ensureDetailsExpanded(page, 'current-stage-source-shell');
        await ensureDetailsExpanded(page, 'current-stage-source-details');
        await expect(stageSourceCard.getByTestId('current-stage-source-continue')).toBeVisible();
    }
    if (options.expectBranchAction) {
        await ensureDetailsExpanded(page, 'current-stage-source-shell');
        await ensureDetailsExpanded(page, 'current-stage-source-details');
        await expect(stageSourceCard.getByTestId('current-stage-source-branch')).toBeVisible();
    }
};

const assertStageSourceSurfaces = async (
    page: Page,
    options: {
        composerValue: string;
        followUpSource: 'Reopen' | 'Continue' | 'Branch';
        toastMessage?: string;
        toastKey?: string;
        timelineText?: string;
        timelineKey?: string;
        branchLabel?: string;
        sourceLabel?: string;
        globalLogMode?: 'minimized' | 'expanded';
    },
) => {
    await ensureWorkspaceInsightsExpanded(page);

    const toastText = options.toastKey
        ? localizedMessageByKey(options.toastKey)
        : localizedText(options.toastMessage || '');
    const timelineText = options.timelineKey
        ? localizedLogByKey(options.timelineKey)
        : localizedText(options.timelineText || '');

    await expect(composer(page)).toHaveValue(options.composerValue);
    await expect(page.getByText(toastText, { exact: true })).toBeVisible();
    await assertCurrentStageSourceCard(page, {
        sourceLabel: options.sourceLabel ?? tt('stageOriginHistory'),
        actionLabel: options.followUpSource,
        branchLabel: options.branchLabel,
    });
    await expect(page.getByTestId('filmstrip-stage-source-badge')).toContainText(localizedText('Stage Source'));
    await expect(page.locator('[data-testid="timeline-stage-source-entry"]:visible').first()).toContainText(
        timelineText,
    );
    await expect(page.getByTestId('global-log-stage-source-entry')).toHaveCount(0);
    await expect(page.getByTestId('global-log-stage-source-badge')).toHaveCount(0);
    await expect(page.getByTestId('global-log-minimized-source')).toHaveCount(0);
    await expect(page.getByTestId('global-log-source-open')).toHaveCount(0);
    if (options.globalLogMode === 'expanded') {
        await page.getByTestId('global-health-toggle').click();
        await expect(page.getByTestId('global-health-panel')).toBeVisible();
        await expect(page.getByTestId('global-health-local-api')).toContainText(tt('statusPanelLocalApi'));
        await expect(page.getByTestId('global-health-gemini-key')).toContainText(tt('statusPanelGeminiKey'));
        await expect(page.getByTestId('global-health-last-check')).toContainText(tt('statusPanelLastCheck'));
    } else {
        await expect(page.getByTestId('global-health-summary').first()).toContainText(tt('consoleSystem'));
    }
};

const assertFilmstripChromeLocalized = async (page: Page) => {
    await expect(page.getByTestId('filmstrip-title')).toContainText(tt('historyFilmstripTitle'));
    await expect(page.getByTestId('filmstrip-desc')).toContainText(tt('historyFilmstripDesc'));
    await expect(page.getByTestId('filmstrip-summary')).toContainText(
        localizedTemplatePattern('historyFilmstripSummary'),
    );
};

const assertViewerChromeLocalized = async (page: Page) => {
    const viewer = page.getByTestId('workspace-viewer-overlay');
    await expect(viewer).toBeVisible();
    await expect(viewer.getByTestId('workspace-viewer-title')).toContainText(tt('workspaceViewerTitle'));
    await expect(viewer.getByTestId('workspace-viewer-desc-summary')).toContainText(tt('workspaceViewerDesc'));
    await expect(viewer.getByTestId('workspace-viewer-desc')).toContainText(tt('workspaceViewerPrompt'));
    await expect(viewer.getByTestId('workspace-viewer-desc')).toContainText(tt('workspaceViewerResultText'));
    await expect(viewer.getByTestId('workspace-viewer-desc')).toContainText(tt('workspaceViewerProvenance'));
    await expect(viewer.getByTestId('workspace-viewer-desc')).toContainText(tt('workspaceViewerSessionHints'));
    await expect(viewer.getByTestId('workspace-viewer-prompt-label')).toContainText(tt('workspaceViewerPrompt'));
    await expect(viewer.getByTestId('workspace-viewer-session-hints-label')).toContainText(
        tt('workspaceViewerSessionHints'),
    );
    await expect(viewer.getByTestId('workspace-viewer-session-hints')).toContainText(
        tt('workspaceViewerSessionHintsEmpty'),
    );
};

const assertComposerChromeLocalized = async (page: Page) => {
    const workspaceTools = page.getByTestId('composer-workspace-tools');
    await expect(workspaceTools.getByRole('button', { name: tt('composerToolbarExportWorkspace') })).toBeVisible();
    await expect(workspaceTools.getByRole('button', { name: tt('composerToolbarImportWorkspace') })).toBeVisible();

    const advancedToggle = page.getByRole('button', { name: tt('composerToolbarAdvancedSettings') }).first();
    await expect(advancedToggle).toBeVisible();
    await expect(page.getByRole('heading', { name: tt('composerActionPanelTitle') }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: tt('composerQueueBatchJob') })).toBeVisible();

    await advancedToggle.click();

    await expect(page.getByRole('heading', { name: tt('composerAdvancedTitle') }).first()).toBeVisible();
};

const dismissRestoreNotice = async (page: Page) => {
    await page.getByRole('button', { name: tt('workspaceRestoreDismiss') }).click();
    await ensureWorkspaceInsightsExpanded(page);
};

const dismissRestoreNoticeIfPresent = async (page: Page) => {
    const restoreNotice = page.getByTestId('workspace-restore-notice');
    if ((await restoreNotice.count()) > 0) {
        await restoreNotice.getByRole('button', { name: tt('workspaceRestoreDismiss') }).click();
    }
    await ensureWorkspaceInsightsExpanded(page);
};

const renameBranchFromGallery = async (page: Page, nextLabel: string) => {
    const renameDialog = await openFirstHistoryRenameDialog(page);
    await expect(
        page.getByTestId('branch-rename-dialog').getByText(tt('branchRenameEyebrow'), { exact: true }),
    ).toBeVisible();
    await renameDialog.locator('input[maxlength="40"]').fill(nextLabel);
    await renameDialog
        .getByRole('button', { name: tt('branchRenameSave') })
        .evaluate((button: HTMLButtonElement) => button.click());
};

const assertBranchLabelPropagates = async (page: Page, branchLabel: string) => {
    await expect(currentStageSourceCard(page)).toContainText(branchLabel);
    await expect(activeBranchCard(page)).toContainText(branchLabel);
    await expect(lineageMap(page)).toContainText(branchLabel);
    await expect(visibleFilmstripCard(page)).toContainText(branchLabel);
};

const assertBranchLabelCleared = async (page: Page, branchLabel: string) => {
    await expect(currentStageSourceCard(page)).not.toContainText(branchLabel);
    await expect(activeBranchCard(page)).not.toContainText(branchLabel);
    await expect(lineageMap(page)).not.toContainText(branchLabel);
    await expect(visibleFilmstripCard(page)).not.toContainText(branchLabel);
};

const assertProvenanceSummary = async (
    page: Page,
    options: {
        mode: 'Inherited' | 'Live';
        sourceTurn: string;
        sources: string;
        supportBundles: string;
        visibleTexts: string[];
        summaryTexts?: string[];
        sourcePrompt?: string;
        expectSourceRouteOnly?: boolean;
    },
) => {
    await ensureWorkspaceInsightsExpanded(page);

    const provenanceSection = page.locator('[data-testid="context-provenance-section"]:visible').first();
    const summary = visibleProvenancePanel(page).getByTestId('provenance-summary');
    await expect(summary.getByTestId('provenance-summary-mode')).toContainText(
        options.mode === 'Inherited' ? tt('groundingProvenanceModeInherited') : tt('groundingProvenanceModeLive'),
    );
    await expect(summary.getByTestId('provenance-summary-source-turn')).toContainText(options.sourceTurn);
    await expect(summary.getByTestId('provenance-summary-sources')).toContainText(options.sources);
    await expect(summary.getByTestId('provenance-summary-support-bundles')).toContainText(options.supportBundles);
    if (options.sourcePrompt) {
        await expect(summary.getByTestId('provenance-source-card')).toContainText(options.sourcePrompt);
    }
    if (options.expectSourceRouteOnly) {
        await clickFirstVisible(summary.getByTestId('provenance-source-details'));
        await expect(summary.getByTestId('provenance-source-open').first()).toBeVisible();
        await expect(summary.getByTestId('provenance-source-continue')).toHaveCount(0);
        await expect(summary.getByTestId('provenance-source-branch')).toHaveCount(0);
    }
    for (const text of options.summaryTexts || []) {
        await expect(provenanceSection).toContainText(localizedText(text));
    }
    for (const text of options.visibleTexts) {
        await expect(provenanceSection).toContainText(localizedText(text));
    }
};

const assertProvenanceAttributionOverview = async (
    page: Page,
    options: {
        coverageValue: string;
        sourceMixValue: string;
        queriesValue: string;
        sourceStatusValue: string;
        groundingStatus: string;
        supportStatus: string;
        entryPointValue: string;
        entryPointStatus: string;
        uncitedSourceTitle?: string;
    },
) => {
    const panel = visibleProvenancePanel(page);
    const overview = panel.getByTestId('provenance-attribution-overview');

    await expect(overview).toContainText(tt('groundingPanelAttributionOverview'));
    await expect(overview.getByTestId('provenance-attribution-coverage')).toContainText(options.coverageValue);
    await expect(overview.getByTestId('provenance-attribution-source-mix')).toContainText(options.sourceMixValue);
    await expect(overview.getByTestId('provenance-attribution-queries')).toContainText(options.queriesValue);
    await expect(overview.getByTestId('provenance-attribution-entry-point')).toContainText(options.entryPointValue);
    await expect(panel.getByTestId('provenance-status-source-status')).toContainText(options.sourceStatusValue);
    await expect(panel.getByTestId('provenance-status-grounding-status')).toContainText(options.groundingStatus);
    await expect(panel.getByTestId('provenance-status-support-status')).toContainText(options.supportStatus);
    await expect(panel.getByTestId('provenance-status-entry-point-status')).toContainText(options.entryPointStatus);
    await expect(panel.getByTestId('provenance-source-0-status')).toContainText(tt('groundingPanelSourceStatusCited'));
    await expect(panel.getByTestId('provenance-source-1-status')).toContainText(
        tt('groundingPanelSourceStatusRetrievedOnly'),
    );

    if (options.uncitedSourceTitle) {
        await expect(panel.getByTestId('provenance-uncited-source-1')).toContainText(options.uncitedSourceTitle);
        await expect(panel.getByTestId('provenance-uncited-source-1')).toContainText(
            tt('groundingPanelUncitedSourcesHint'),
        );
    }
};

const assertOfficialConversationSummary = async (
    page: Page,
    options: {
        branchLabel: string;
        turnCount: string;
        conversationIdShort: string;
        activeSourceShortId: string;
        prompt: string;
        expectStageBadge?: boolean;
    },
) => {
    const card = page.getByTestId('conversation-continuity-card').first();
    await expect(card).toContainText(localizedText('Official Conversation'));
    await expect(card).toContainText(options.conversationIdShort);
    await expect(card).toContainText(options.turnCount);
    await expect(card).toContainText(
        tt('workspaceInsightsConversationBranchActiveSource', options.branchLabel, options.activeSourceShortId),
    );
    await expect(card).toContainText(options.prompt);
    await ensureDetailsExpanded(page, 'continuity-source-section');
    await ensureDetailsExpanded(page, 'conversation-continuity-details');
    await expect(card.getByTestId('conversation-continuity-open')).toHaveCount(1);
    await expect(card.getByTestId('conversation-continuity-continue')).toHaveCount(0);
    await expect(card.getByTestId('conversation-continuity-branch')).toHaveCount(0);
    if (options.expectStageBadge) {
        await expect(card.getByTestId('conversation-stage-source-badge').first()).toContainText(
            localizedText('Current Stage Source'),
        );
    }
};

const assertOfficialConversationGeneratePayload = (payload: Record<string, unknown>, prompt: string) => {
    expect(payload.executionMode).toBe('chat-continuation');
    expect(payload.prompt).toBe(prompt);
    expect(payload.conversationContext).toEqual({
        conversationId: 'chatconv1-restore-path',
        branchOriginId: 'chat-root-turn',
        activeSourceHistoryId: 'chat-follow-up-turn',
        priorTurns: [
            {
                historyId: 'chat-follow-up-turn',
                prompt: 'Official chat follow-up turn',
                sourceImage: {
                    dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                    mimeType: 'image/gif',
                },
                outputImage: {
                    dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                    mimeType: 'image/gif',
                },
                text: 'Official chat follow-up text',
                thoughts: null,
                thoughtSignature: null,
            },
        ],
    });
};

const assertOfficialConversationPostGenerateState = async (page: Page, prompt: string) => {
    await expect
        .poll(async () =>
            page.evaluate((targetPrompt) => {
                const raw = localStorage.getItem('nbu_workspaceSnapshot');
                if (!raw) {
                    return null;
                }

                const snapshot = JSON.parse(raw);
                const generatedTurn = Array.isArray(snapshot.history)
                    ? snapshot.history.find((item: { prompt?: string }) => item.prompt === targetPrompt)
                    : null;

                return generatedTurn?.id || null;
            }, prompt),
        )
        .not.toBeNull();

    const persistedState = await page.evaluate((targetPrompt) => {
        const raw = localStorage.getItem('nbu_workspaceSnapshot');
        if (!raw) {
            return null;
        }

        const snapshot = JSON.parse(raw);
        const generatedTurn = Array.isArray(snapshot.history)
            ? snapshot.history.find((item: { prompt?: string }) => item.prompt === targetPrompt) || null
            : null;
        const conversationBranch = snapshot.conversationState?.byBranchOriginId?.['chat-root-turn'] || null;

        if (!generatedTurn || !conversationBranch) {
            return null;
        }

        return {
            generatedTurn: {
                id: generatedTurn.id,
                executionMode: generatedTurn.executionMode,
                conversationId: generatedTurn.conversationId,
                conversationBranchOriginId: generatedTurn.conversationBranchOriginId,
                conversationSourceHistoryId: generatedTurn.conversationSourceHistoryId,
                conversationTurnIndex: generatedTurn.conversationTurnIndex,
                text: generatedTurn.text,
                thoughts: generatedTurn.thoughts,
            },
            workspaceSession: {
                conversationId: snapshot.workspaceSession?.conversationId,
                conversationBranchOriginId: snapshot.workspaceSession?.conversationBranchOriginId,
                conversationActiveSourceHistoryId: snapshot.workspaceSession?.conversationActiveSourceHistoryId,
                conversationTurnIds: snapshot.workspaceSession?.conversationTurnIds,
            },
            conversationBranch: {
                conversationId: conversationBranch.conversationId,
                activeSourceHistoryId: conversationBranch.activeSourceHistoryId,
                turnIds: conversationBranch.turnIds,
            },
        };
    }, prompt);

    expect(persistedState).not.toBeNull();
    expect(persistedState?.generatedTurn).toEqual(
        expect.objectContaining({
            executionMode: 'chat-continuation',
            conversationId: 'chatconv1-restore-path',
            conversationBranchOriginId: 'chat-root-turn',
            conversationSourceHistoryId: 'chat-follow-up-turn',
            conversationTurnIndex: 1,
            text: 'Browser official conversation reply',
            thoughts: 'Browser official reasoning',
        }),
    );
    expect(persistedState?.workspaceSession.conversationId).toBe('chatconv1-restore-path');
    expect(persistedState?.workspaceSession.conversationBranchOriginId).toBe('chat-root-turn');
    expect(persistedState?.workspaceSession.conversationActiveSourceHistoryId).toBe(persistedState?.generatedTurn.id);
    expect(persistedState?.workspaceSession.conversationTurnIds).toEqual([
        'chat-follow-up-turn',
        persistedState?.generatedTurn.id,
    ]);
    expect(persistedState?.conversationBranch.conversationId).toBe('chatconv1-restore-path');
    expect(persistedState?.conversationBranch.activeSourceHistoryId).toBe(persistedState?.generatedTurn.id);
    expect(persistedState?.conversationBranch.turnIds).toEqual([
        'chat-follow-up-turn',
        persistedState?.generatedTurn.id,
    ]);

    await assertOfficialConversationSummary(page, {
        branchLabel: 'Chat Branch',
        turnCount: tt('workspaceInsightsTurnsCount', '2'),
        conversationIdShort: 'chatconv',
        activeSourceShortId: persistedState!.generatedTurn.id.slice(0, 8),
        prompt,
    });
};

const openSessionReplay = async (page: Page) => {
    await ensureWorkspaceInsightsExpanded(page);
    await clickFirstVisible(page.getByTestId('open-session-replay'));

    const replayDialog = page.getByTestId('session-replay-dialog');
    await expect(replayDialog).toBeVisible();
    await expect(replayDialog.getByText(tt('sessionReplayEyebrow'), { exact: true })).toBeVisible();
    await expect(replayDialog.getByText(tt('sessionReplayTitle'), { exact: true })).toBeVisible();
    return replayDialog;
};

const expectSessionReplayLocalizedChrome = async (
    page: Page,
    replayDialog: ReturnType<Page['getByTestId']>,
    language: Language,
) => {
    const t = (key: string, ...values: string[]) =>
        values.reduce((message, value, index) => message.replace(`{${index}}`, value), getTranslation(language, key));

    await setWorkspaceLanguage(page, language);
    await expect(replayDialog.getByText(t('sessionReplayEyebrow'), { exact: true })).toBeVisible();
    await expect(replayDialog.getByText(t('sessionReplayTitle'), { exact: true })).toBeVisible();
    await expect(replayDialog.getByRole('button', { name: t('sessionReplayPrev') })).toBeVisible();
    await expect(replayDialog.getByRole('button', { name: t('sessionReplayNext') })).toBeVisible();
    await expect(replayDialog).toContainText(t('sessionReplayTimeline'));
    await expect(replayDialog).toContainText(t('sessionReplayLabelHistory'));

    if ((await replayDialog.getByTestId('session-replay-jump-source').count()) > 0) {
        await expect(replayDialog.getByTestId('session-replay-jump-source')).toContainText(
            t('sessionReplayJumpToSource'),
        );
        await replayDialog.getByTestId('session-replay-jump-source').click();
        await expect(replayDialog.getByRole('button', { name: t('sessionReplayJumpToLatest') })).toBeVisible();
        await expect(replayDialog.getByTestId('session-replay-stage-source-badge')).toContainText(
            t('sessionReplayCurrentStageSource'),
        );
        await expect(replayDialog.getByTestId('session-replay-active')).toContainText(t('sessionReplayLabelHistory'));
        await expect(replayDialog.getByTestId('session-replay-source-open')).toContainText(
            t('historyActionOpenInHistory'),
        );
        await expect(replayDialog.getByTestId('session-replay-source-continue')).toHaveCount(0);
        await expect(replayDialog.getByTestId('session-replay-source-branch')).toHaveCount(0);
    }
};

const setWorkspaceLanguageWithin = async (target: Page | Locator, language: Language) => {
    if (language === 'en') {
        return;
    }

    await target.getByTestId('language-selector-toggle').evaluate((button: HTMLButtonElement) => button.click());
    await target.getByTestId(`language-option-${language}`).evaluate((button: HTMLButtonElement) => button.click());
    await expect(target.getByTestId('language-selector-toggle')).toContainText(
        SUPPORTED_LANGUAGES.find((item) => item.value === language)?.shortLabel || 'En',
    );
};

const setWorkspaceLanguage = async (page: Page, language: Language) => {
    await setWorkspaceLanguageWithin(page, language);
};

const openFreshWorkspace = async (page: Page) => {
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await page.evaluate(async () => {
        await fetch('/api/workspace-snapshot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                history: [],
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
                    prompt: '',
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
            }),
        });
    });
    await page.reload();
    await expect(composer(page)).toBeVisible();
    await dismissRestoreNoticeIfPresent(page);
    await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
    await setWorkspaceLanguage(page, TEST_LANGUAGE);
};

const installQueuedBatchGetFixtureRoute = async (page: Page, snapshot: Record<string, unknown>) => {
    const queuedJobs = Array.isArray(snapshot.queuedJobs)
        ? (snapshot.queuedJobs as Array<Record<string, unknown>>)
        : [];
    if (queuedJobs.length === 0) {
        return;
    }

    const jobByName = new Map(
        queuedJobs
            .filter((job) => typeof job.name === 'string')
            .map((job) => [
                job.name as string,
                {
                    name: job.name,
                    displayName: job.displayName,
                    state: job.state,
                    model: job.model,
                    createTime: typeof job.createdAt === 'number' ? new Date(job.createdAt).toISOString() : undefined,
                    updateTime: typeof job.updatedAt === 'number' ? new Date(job.updatedAt).toISOString() : undefined,
                    startTime: typeof job.startedAt === 'number' ? new Date(job.startedAt).toISOString() : undefined,
                    endTime: typeof job.completedAt === 'number' ? new Date(job.completedAt).toISOString() : undefined,
                    error: typeof job.error === 'string' ? job.error : null,
                    hasInlinedResponses: false,
                } as Record<string, unknown>,
            ]),
    );

    await page.route('**/api/batches/get', async (route) => {
        const payload = route.request().postDataJSON() as { name?: string } | null;
        const job = payload?.name ? jobByName.get(payload.name) : undefined;

        if (!job) {
            await route.fallback();
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ job }),
        });
    });
};

const openWorkspaceWithSnapshot = async (page: Page, snapshot: Record<string, unknown>) => {
    await page.addInitScript((nextSnapshot) => {
        localStorage.clear();
        localStorage.setItem('nbu_workspaceSnapshot', JSON.stringify(nextSnapshot));
    }, snapshot);
    await page.goto('/');
    await expect(composer(page)).toBeVisible();
    await setWorkspaceLanguage(page, TEST_LANGUAGE);
};

const openWorkspaceWithSnapshotQuotaFailure = async (page: Page, snapshot: Record<string, unknown>) => {
    await page.addInitScript((nextSnapshot) => {
        localStorage.clear();

        const originalSetItem = Storage.prototype.setItem;
        originalSetItem.call(localStorage, 'nbu_workspaceSnapshot', JSON.stringify(nextSnapshot));

        const quotaSetItem = function (this: Storage, key: string, value: string) {
            if (key === 'nbu_workspaceSnapshot') {
                throw new DOMException('Quota exceeded', 'QuotaExceededError');
            }

            return originalSetItem.call(this, key, value);
        };

        Storage.prototype.setItem = quotaSetItem;
        Object.defineProperty(localStorage, 'setItem', {
            configurable: true,
            writable: true,
            value: quotaSetItem,
        });
    }, snapshot);
    await page.goto('/');
    await expect(composer(page)).toBeVisible();
    await setWorkspaceLanguage(page, TEST_LANGUAGE);
};

const openSharedControlsFromSurface = async (page: Page) => {
    await page.getByTestId('shared-controls-toggle').click();
    await expect(page.getByTestId('shared-controls-panel')).toBeVisible();
};

const openEditorFromUpload = async (page: Page, promptValue: string) => {
    await composer(page).fill(promptValue);
    await page.locator('#global-upload-input').setInputFiles(editorSharedContextFixturePath);
    await expect(page.getByTestId('image-editor')).toBeVisible();
    await openSharedControlsFromSurface(page);
    await page.getByTestId('shared-control-prompt').click();
    await expect(page.getByTestId('shared-prompt-input')).toHaveValue(promptValue);
};

const closeSharedPromptSheet = async (page: Page) => {
    await page.getByTestId('picker-sheet-close').click();
    await expect(page.getByTestId('shared-prompt-input')).toHaveCount(0);
};

const expectAdvancedSettingsDialogVisible = async (page: Page) => {
    const dialog = page.getByTestId('composer-advanced-settings-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: tt('composerAdvancedTitle') }).first()).toBeVisible();
    await expect(dialog).toContainText(tt('composerAdvancedGenerationSectionTitle'));
    return dialog;
};

const drawEditorMaskStroke = async (page: Page) => {
    const surface = page.getByTestId('editor-event-surface');
    const box = await surface.boundingBox();

    if (!box) {
        throw new Error('Editor event surface is not visible.');
    }

    const startX = box.x + box.width * 0.45;
    const startY = box.y + box.height * 0.45;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 80, startY + 24, { steps: 6 });
    await page.mouse.up();
};

const stageImportReview = async (
    page: Page,
    filePath = snapshotFilePath,
    expectedFileName = 'ui-import-smoke-workspace.json',
) => {
    await page.locator('#workspace-import-input').setInputFiles(filePath);
    const reviewModal = page.getByTestId('workspace-import-review');

    await expect(reviewModal.getByText(tt('workspaceImportReviewEyebrow'), { exact: true })).toBeVisible();
    await expect(reviewModal.getByText(tt('workspaceImportReviewTitle'), { exact: true })).toBeVisible();
    await expect(reviewModal.getByText(expectedFileName, { exact: true })).toBeVisible();
    await expect(reviewModal.getByRole('button', { name: tt('workspaceImportReviewMergeTurnsOnly') })).toBeVisible();
    await expect(
        reviewModal.getByRole('button', { name: tt('workspaceImportReviewReplaceCurrentWorkspace') }),
    ).toBeVisible();

    const replaceLatestDetails = reviewModal.getByTestId('import-review-replace-latest-details');
    await replaceLatestDetails.evaluate((details: HTMLDetailsElement) => {
        details.open = true;
    });

    const firstBranchDetails = reviewModal.locator('[data-testid^="import-review-branch-details-"]').first();
    await firstBranchDetails.evaluate((details: HTMLDetailsElement) => {
        details.open = true;
    });

    await expect(reviewModal.getByTestId('import-review-replace-open-latest')).toBeVisible();
    await expect(reviewModal.getByTestId('import-review-replace-continue-latest')).toBeVisible();
    await expect(reviewModal.getByTestId('import-review-replace-branch-latest')).toBeVisible();
    await expect(reviewModal.locator('[data-testid^="import-review-branch-open-"]').first()).toBeVisible();
    await expect(reviewModal.locator('[data-testid^="import-review-branch-continue-"]').first()).toBeVisible();
    await expect(reviewModal.locator('[data-testid^="import-review-branch-branch-"]').first()).toBeVisible();
    return reviewModal;
};

const replaceWithImportedWorkspace = async (
    page: Page,
    filePath = snapshotFilePath,
    expectedFileName = 'ui-import-smoke-workspace.json',
) => {
    await stageImportReview(page, filePath, expectedFileName);
    await page
        .getByTestId('workspace-import-review')
        .getByRole('button', { name: tt('workspaceImportReviewReplaceCurrentWorkspace') })
        .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByText(tt('workspaceRestoreTitle'))).toBeVisible();
};

const openFirstHistoryRenameDialog = async (page: Page) => {
    await openGalleryPanel(page);
    const firstCard = page.locator('[data-testid^="history-card-"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.hover();
    await firstCard.locator('[data-testid^="history-rename-"]').click();
    await expect(page.getByTestId('branch-rename-dialog')).toBeVisible();
    return page.getByTestId('branch-rename-dialog').locator('form').first();
};

test.describe('workspace restore flows', () => {
    test('editor floating shared controls expose the shared composer state', async ({ page }) => {
        await openFreshWorkspace(page);
        await composer(page).fill(editorSharedControlsPrompt);
        await page.locator('#global-upload-input').setInputFiles(editorSharedContextFixturePath);

        await expect(page.getByTestId('image-editor')).toBeVisible();
        await openSharedControlsFromSurface(page);
        await expect(page.getByTestId('shared-controls-panel')).toContainText(
            tt('surfaceSharedControlsStateDesc', tt('editorTitle')),
        );
        await expect(page.getByTestId('shared-controls-panel')).toContainText(tt('surfaceSharedControlsCurrentPrompt'));
        await expect(page.getByTestId('shared-controls-panel')).toContainText(editorSharedControlsPrompt);
        await expect(page.getByTestId('shared-controls-panel')).toContainText(tt('surfaceSharedControlsWorkspace'));
        await expect(page.getByTestId('shared-controls-panel')).toContainText(tt('editorTitle'));
    });

    test('sketchpad floating shared controls keep prompt edits in the main composer', async ({ page }) => {
        await openFreshWorkspace(page);
        await composer(page).fill(sketchSharedControlsPrompt);
        await page.locator('[data-testid="side-tools-open-sketchpad"]:visible').click();

        await expect(page.getByTestId('sketchpad')).toBeVisible();
        await openSharedControlsFromSurface(page);
        await expect(page.getByTestId('shared-controls-panel')).toContainText(
            tt('surfaceSharedControlsStateDesc', tt('sketchTitle')),
        );
        await page.getByTestId('shared-control-prompt').click();
        await expect(page.getByTestId('shared-prompt-input')).toHaveValue(sketchSharedControlsPrompt);
        await page.getByTestId('shared-prompt-input').fill(sketchSharedControlsUpdatedPrompt);
        await closeSharedPromptSheet(page);
        await page.getByTestId('sketchpad-close').click();

        await expect(page.getByTestId('sketchpad')).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Updated from sketch shared controls');
    });

    test('editor shared controls can open advanced settings as the dedicated modal', async ({ page }) => {
        await openFreshWorkspace(page);
        await openEditorFromUpload(page, 'Editor advanced settings prompt');
        await closeSharedPromptSheet(page);

        await page
            .getByTestId('shared-control-advanced-settings')
            .evaluate((button: HTMLButtonElement) => button.click());
        await expect(page.getByTestId('shared-controls-panel')).toHaveCount(0);

        const dialog = await expectAdvancedSettingsDialogVisible(page);
        await expect(dialog).toContainText(tt('composerAdvancedGroundingSectionTitle'));

        await dialog
            .getByTestId('composer-advanced-settings-close')
            .evaluate((button: HTMLButtonElement) => button.click());
        await expect(page.getByTestId('composer-advanced-settings-dialog')).toHaveCount(0);
        await expect(page.getByTestId('image-editor')).toBeVisible();
        await expect(composer(page)).toHaveValue('Editor advanced settings prompt');
    });

    test('sketch shared controls can open advanced settings as the dedicated modal', async ({ page }) => {
        await openFreshWorkspace(page);
        await composer(page).fill('Sketch advanced settings prompt');
        await page.locator('[data-testid="side-tools-open-sketchpad"]:visible').click();

        await expect(page.getByTestId('sketchpad')).toBeVisible();
        await openSharedControlsFromSurface(page);
        await page
            .getByTestId('shared-control-advanced-settings')
            .evaluate((button: HTMLButtonElement) => button.click());
        await expect(page.getByTestId('shared-controls-panel')).toHaveCount(0);

        const dialog = await expectAdvancedSettingsDialogVisible(page);
        await expect(dialog).toContainText(tt('composerAdvancedGroundingSectionTitle'));

        await dialog
            .getByTestId('composer-advanced-settings-close')
            .evaluate((button: HTMLButtonElement) => button.click());
        await expect(page.getByTestId('composer-advanced-settings-dialog')).toHaveCount(0);
        await expect(page.getByTestId('sketchpad')).toBeVisible();
        await expect(composer(page)).toHaveValue('Sketch advanced settings prompt');
    });

    test('shared controls advanced settings changes persist after closing and reopening the modal', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await composer(page).fill('Sketch advanced settings persistence prompt');
        await page.locator('[data-testid="side-tools-open-sketchpad"]:visible').click();

        await expect(page.getByTestId('sketchpad')).toBeVisible();
        await openSharedControlsFromSurface(page);
        await page
            .getByTestId('shared-control-advanced-settings')
            .evaluate((button: HTMLButtonElement) => button.click());
        await expect(page.getByTestId('shared-controls-panel')).toHaveCount(0);

        const firstDialog = await expectAdvancedSettingsDialogVisible(page);
        await firstDialog.getByTestId('composer-advanced-output-format').selectOption('images-and-text');
        await firstDialog.getByTestId('composer-advanced-temperature-input').fill('1.4');

        await expect
            .poll(async () =>
                page.evaluate(() => {
                    const raw = localStorage.getItem('nbu_workspaceSnapshot');
                    if (!raw) {
                        return null;
                    }

                    const snapshot = JSON.parse(raw);
                    return {
                        outputFormat: snapshot.composerState?.outputFormat || null,
                        temperature: snapshot.composerState?.temperature || null,
                    };
                }),
            )
            .toEqual({
                outputFormat: 'images-and-text',
                temperature: 1.4,
            });

        await firstDialog
            .getByTestId('composer-advanced-settings-close')
            .evaluate((button: HTMLButtonElement) => button.click());
        await expect(page.getByTestId('composer-advanced-settings-dialog')).toHaveCount(0);

        await openSharedControlsFromSurface(page);
        await page
            .getByTestId('shared-control-advanced-settings')
            .evaluate((button: HTMLButtonElement) => button.click());

        const secondDialog = await expectAdvancedSettingsDialogVisible(page);
        await expect(secondDialog.getByTestId('composer-advanced-output-format')).toHaveValue('images-and-text');
        await expect(secondDialog.getByTestId('composer-advanced-temperature-input')).toHaveValue('1.4');

        await secondDialog
            .getByTestId('composer-advanced-settings-close')
            .evaluate((button: HTMLButtonElement) => button.click());
        await expect(page.getByTestId('composer-advanced-settings-dialog')).toHaveCount(0);
        await expect(page.getByTestId('sketchpad')).toBeVisible();
        await expect(composer(page)).toHaveValue('Sketch advanced settings persistence prompt');
    });

    test('editor close keeps shared composer context when only shared settings changed', async ({ page }) => {
        await openFreshWorkspace(page);
        await openEditorFromUpload(page, 'Shared prompt from main composer');

        await page.getByTestId('shared-prompt-input').fill('Updated prompt from editor');
        await closeSharedPromptSheet(page);
        await page.getByTestId('editor-close').click();

        await expect(page.getByTestId('image-editor')).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Updated prompt from editor');

        await page.locator('[data-testid="side-tools-open-editor"]:visible').click();
        await expect(page.getByTestId('image-editor')).toBeVisible();
        await page.getByTestId('shared-controls-toggle').click();
        await page.getByTestId('shared-control-prompt').click();
        await expect(page.getByTestId('shared-prompt-input')).toHaveValue('Updated prompt from editor');
    });

    test('editor discard restores shared composer context after local canvas edits', async ({ page }) => {
        await openFreshWorkspace(page);
        await openEditorFromUpload(page, 'Original main prompt');

        await page.getByTestId('shared-prompt-input').fill('Temporary editor prompt');
        await closeSharedPromptSheet(page);
        await drawEditorMaskStroke(page);
        await page.getByTestId('editor-close').click();

        await expect(page.getByTestId('editor-exit-confirm')).toBeVisible();
        await page.getByTestId('editor-exit-discard').click();

        await expect(page.getByTestId('image-editor')).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Original main prompt');
    });

    test('editor open and close without local edits keeps shared ratio and size intact', async ({ page }) => {
        await openWorkspaceWithSnapshot(page, {
            history: [],
            stagedAssets: [],
            workflowLogs: [],
            workspaceSession: {
                activeResult: null,
                continuityGrounding: null,
                continuitySessionHints: null,
                provenanceMode: null,
                provenanceSourceHistoryId: null,
                source: null,
                sourceHistoryId: null,
                updatedAt: null,
            },
            branchState: { nameOverrides: {} },
            viewState: {
                generatedImageUrls: [],
                selectedImageIndex: 0,
                selectedHistoryId: null,
            },
            composerState: {
                prompt: 'Persisted editor prompt',
                aspectRatio: '21:9',
                imageSize: '4K',
                imageStyle: 'None',
                imageModel: 'gemini-3.1-flash-image-preview',
                batchSize: 1,
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: false,
                googleSearch: false,
                imageSearch: false,
                generationMode: 'Text to Image',
            },
        });

        await expect(page.getByRole('button', { name: /21:9/ }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /4K/ }).first()).toBeVisible();

        const composerStateBeforeOpen = await page.evaluate(() => {
            const raw = localStorage.getItem('nbu_workspaceSnapshot');
            return raw ? JSON.parse(raw).composerState : null;
        });

        await openEditorFromUpload(page, 'Persisted editor prompt');
        await closeSharedPromptSheet(page);
        await page.getByTestId('editor-close').click();

        await expect(page.getByTestId('image-editor')).toHaveCount(0);
        const persistedComposerState = await page.evaluate(() => {
            const raw = localStorage.getItem('nbu_workspaceSnapshot');
            if (!raw) {
                return null;
            }

            const snapshot = JSON.parse(raw);
            return snapshot.composerState;
        });

        expect(composerStateBeforeOpen?.aspectRatio).toBe('21:9');
        expect(composerStateBeforeOpen?.imageSize).toBe('4K');
        expect(persistedComposerState?.aspectRatio).toBe(composerStateBeforeOpen?.aspectRatio);
        expect(persistedComposerState?.imageSize).toBe(composerStateBeforeOpen?.imageSize);
    });

    test('merge keeps the active composer and skips restore notice', async ({ page }) => {
        await openFreshWorkspace(page);
        await composer(page).fill('Local composer prompt');

        await stageImportReview(page);
        await page
            .getByTestId('workspace-import-review')
            .getByRole('button', { name: tt('workspaceImportReviewMergeTurnsOnly') })
            .evaluate((button: HTMLButtonElement) => button.click());

        await expect(
            page.getByText(tt('workspaceSnapshotMergedNotice', 'ui-import-smoke-workspace.json')),
        ).toBeVisible();
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Local composer prompt');
        await expect(page.getByText(tt('historyFilmstripSummary', '2', '2'))).toBeVisible();
    });

    test('replace then continue restored chain reopens the imported branch', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);

        await page.getByTestId('workspace-restore-continue').click();

        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Imported branch turn');
        await ensureDetailsExpanded(page, 'timeline-history-section');
        await expect(page.locator('[data-testid="timeline-history-section"]:visible').first()).toContainText(
            localizedText('History loaded.'),
        );
    });

    test('import review replace plus open latest skips the restore notice and reopens the imported turn immediately', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await stageImportReview(page);

        const directOpenLatest = page.getByTestId('import-review-replace-open-latest');
        await directOpenLatest.evaluate((button: HTMLButtonElement) => button.click());

        await expect(page.getByTestId('workspace-import-review')).toHaveCount(0);
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await expect(
            page.getByText(localizedText('History turn reopened as the current stage source.'), { exact: true }),
        ).toBeVisible();
        await expect(composer(page)).toHaveValue('Imported branch turn');
    });

    test('import review replace plus continue latest skips the restore notice and aligns the imported turn as active continuation source', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await stageImportReview(page);

        const directContinueLatest = page.getByTestId('import-review-replace-continue-latest');
        await directContinueLatest.evaluate((button: HTMLButtonElement) => button.click());

        await expect(page.getByTestId('workspace-import-review')).toHaveCount(0);
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported branch turn',
            followUpSource: 'Continue',
            toastMessage: 'History turn is now the active continuation source.',
            timelineText: 'History turn aligned as active continuation source',
            branchLabel: 'Imported Branch',
        });
    });

    test('import review replace plus branch latest skips the restore notice while preserving the imported composer state', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await stageImportReview(page);

        const directBranchLatest = page.getByTestId('import-review-replace-branch-latest');
        await directBranchLatest.evaluate((button: HTMLButtonElement) => button.click());

        await expect(page.getByTestId('workspace-import-review')).toHaveCount(0);
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported workspace prompt',
            followUpSource: 'Branch',
            toastMessage: 'History turn staged as a new branch source. Composer settings were preserved.',
            timelineText: 'History turn staged as branch source while keeping the current composer settings',
            branchLabel: 'Imported Branch',
        });
    });

    test('import review shows explicit promotion labels for imported batch variants', async ({ page }) => {
        await openFreshWorkspace(page);
        await stageImportReview(page, variantSnapshotFilePath, 'ui-import-variant-workspace.json');

        const reviewModal = page.getByTestId('workspace-import-review');

        await expect(reviewModal.getByTestId('import-review-replace-continue-latest')).toContainText(
            localizedText('Promote Variant'),
        );
        await expect(reviewModal.locator('[data-testid^="import-review-branch-continue-"]').first()).toContainText(
            localizedText('Promote Variant'),
        );
        await expect(reviewModal.getByText(localizedText('Candidate'), { exact: true })).toHaveCount(2);
        await expect(reviewModal).toContainText('Variant candidate B');
    });

    test('import review branch preview open latest skips the restore notice and reopens that branch latest turn immediately', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await stageImportReview(page);

        const reviewModal = page.getByTestId('workspace-import-review');
        await expect(reviewModal.getByText('Imported Branch', { exact: true })).toBeVisible();
        await expect(reviewModal.getByText('Imported branch turn', { exact: true }).first()).toBeVisible();

        await reviewModal.locator('[data-testid^="import-review-branch-open-"]').first().click();

        await expect(page.getByTestId('workspace-import-review')).toHaveCount(0);
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await expect(
            page.getByText(localizedText('History turn reopened as the current stage source.'), { exact: true }),
        ).toBeVisible();
        await expect(composer(page)).toHaveValue('Imported branch turn');
    });

    test('import review branch preview continue latest skips the restore notice and aligns that branch latest turn as active continuation source', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await stageImportReview(page);

        await page.locator('[data-testid^="import-review-branch-continue-"]').first().click();

        await expect(page.getByTestId('workspace-import-review')).toHaveCount(0);
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported branch turn',
            followUpSource: 'Continue',
            toastMessage: 'History turn is now the active continuation source.',
            timelineText: 'History turn aligned as active continuation source',
            branchLabel: 'Imported Branch',
        });
    });

    test('import review branch preview branch latest skips the restore notice while preserving the imported composer state', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await stageImportReview(page);

        await page.locator('[data-testid^="import-review-branch-branch-"]').first().click();

        await expect(page.getByTestId('workspace-import-review')).toHaveCount(0);
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported workspace prompt',
            followUpSource: 'Branch',
            toastMessage: 'History turn staged as a new branch source. Composer settings were preserved.',
            timelineText: 'History turn staged as branch source while keeping the current composer settings',
            branchLabel: 'Imported Branch',
        });
    });

    test('replace then open latest turn marks the stage as a reopen source', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);

        await page
            .getByTestId('workspace-restore-notice')
            .getByRole('button', { name: tt('workspaceRestoreOpenLatest') })
            .click();

        await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
        await expect(
            page.getByText(localizedText('History turn reopened as the current stage source.'), { exact: true }),
        ).toBeVisible();
        await expect(composer(page)).toHaveValue('Imported branch turn');
        await ensureWorkspaceInsightsExpanded(page);
        await ensureDetailsExpanded(page, 'timeline-history-section');
        await expect(page.locator('[data-testid="timeline-history-section"]:visible').first()).toContainText(
            localizedText('History loaded.'),
        );
        await assertCurrentStageSourceCard(page, {
            sourceLabel: tt('stageOriginHistory'),
            actionLabel: 'Reopen',
            branchLabel: 'Imported Branch',
            expectOpenAction: true,
        });
        await expect(currentStageSourceCard(page).getByTestId('current-stage-source-continue')).toHaveCount(0);
        await expect(currentStageSourceCard(page).getByTestId('current-stage-source-branch')).toHaveCount(0);
        await expect(page.getByTestId('filmstrip-stage-source-badge')).toContainText(localizedText('Stage Source'));
        await ensureDetailsExpanded(page, 'session-stack-section');
        await expect(page.locator('[data-testid="session-stage-source-badge"]:visible').first()).toContainText(
            localizedText('Stage Source'),
        );
        await expect(page.locator('[data-testid="timeline-stage-source-badge"]:visible').first()).toContainText(
            localizedText('Current Stage Source'),
        );
        await expect(page.locator('[data-testid="timeline-stage-source-entry"]:visible').first()).toContainText(
            localizedText('History turn reopened as current stage source'),
        );
        await expect(page.locator('[data-testid="timeline-source-open"]:visible').first()).toBeVisible();
        await expect(page.getByTestId('timeline-source-continue')).toHaveCount(0);
        await expect(page.getByTestId('timeline-source-branch')).toHaveCount(0);
        await page.getByTestId('global-health-toggle').click();
        await expect(page.getByTestId('global-health-panel')).toBeVisible();
        await expect(page.getByTestId('global-health-summary').last()).toContainText(tt('consoleSystem'));
        await expect(page.getByTestId('global-health-local-api')).toContainText(tt('statusPanelLocalApi'));
        await expect(page.getByTestId('global-health-gemini-key')).toContainText(tt('statusPanelGeminiKey'));
        await expect(page.getByTestId('global-health-last-check')).toContainText(tt('statusPanelLastCheck'));
        await expect(page.getByTestId('global-log-stage-source-pill')).toHaveCount(0);
        await expect(page.getByTestId('global-log-stage-source-badge')).toHaveCount(0);
        await expect(page.getByTestId('global-log-stage-source-entry')).toHaveCount(0);
        await expect(page.getByTestId('global-log-source-open')).toHaveCount(0);
    });

    test('restored batch variants remain candidates until explicitly promoted, and only one source stays active per branch', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page, variantSnapshotFilePath, 'ui-import-variant-workspace.json');

        const restoreNotice = page.getByTestId('workspace-restore-notice');
        await expect(restoreNotice.getByRole('button', { name: localizedText('Promote Variant') })).toBeVisible();
        await dismissRestoreNotice(page);

        const stageSourceCard = currentStageSourceCard(page);
        await ensureDetailsExpanded(page, 'current-stage-source-shell');
        await ensureDetailsExpanded(page, 'current-stage-source-details');
        await ensureDetailsExpanded(page, 'session-stack-section');
        const bravoVariantCard = page.locator('[data-testid="session-stack-card-bravo-v2-turn"]:visible').first();
        const alphaVariantCard = page.locator('[data-testid="session-stack-card-alpha-v1-turn"]:visible').first();

        await expect(stageSourceCard).toContainText('Variant candidate B');
        await expect(stageSourceCard).toContainText(localizedText('Candidate'));
        await expect(stageSourceCard.getByTestId('current-stage-source-continue')).toHaveCount(0);
        await expect(bravoVariantCard).toContainText(localizedText('Candidate'));
        await expect(alphaVariantCard).toContainText(localizedText('Candidate'));
        await expect(activeBranchCard(page)).toContainText(`${localizedText('Continuation source ')}--------`);
        await expect(page.locator('[data-testid="active-branch-continue-latest"]:visible').first()).toContainText(
            localizedText('Promote Variant'),
        );

        await page.locator('[data-testid="active-branch-continue-latest"]:visible').first().click();

        await expect(
            page.getByText(localizedText('Variant promoted as the active continuation source.'), { exact: true }),
        ).toBeVisible();
        await expect(stageSourceCard).toContainText(localizedText('Source'));
        await expect(stageSourceCard.getByTestId('current-stage-source-continue')).toHaveCount(0);
        await expect(bravoVariantCard).toContainText(localizedText('Source'));
        await expect(alphaVariantCard).toContainText(localizedText('Candidate'));
        await expect(activeBranchCard(page)).toContainText(`${localizedText('Continuation source ')}bravo-v2`);
        await expect(page.locator('[data-testid="active-branch-continue-latest"]:visible').first()).toContainText(
            localizedText('Source Active'),
        );

        await page.locator('[data-testid="filmstrip-continue-alpha-v1-turn"]:visible').first().click();

        await expect(
            page.getByText(localizedText('Variant promoted as the active continuation source.'), { exact: true }),
        ).toBeVisible();
        await expect(currentStageSourceCard(page)).toContainText('Variant candidate A');
        await expect(currentStageSourceCard(page)).toContainText(localizedText('Source'));
        await expect(alphaVariantCard).toContainText(localizedText('Source'));
        await expect(bravoVariantCard).toContainText(localizedText('Candidate'));
        await expect(activeBranchCard(page)).toContainText(`${localizedText('Continuation source ')}alpha-v1`);
        await expect(page.locator('[data-testid="active-branch-continue-latest"]:visible').first()).toContainText(
            localizedText('Promote Variant'),
        );
    });

    test('filmstrip continue keeps stage-source surfaces aligned across composer, timeline, and header log', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await assertFilmstripChromeLocalized(page);

        const firstFilmstripCard = visibleFilmstripCard(page);
        await firstFilmstripCard.hover();
        await firstFilmstripCard.locator('[data-testid^="filmstrip-continue-"]').click();

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported branch turn',
            followUpSource: 'Continue',
            toastKey: 'historySourceContinueNotice',
            timelineKey: 'historySourceContinueLog',
            branchLabel: 'Imported Branch',
        });
    });

    test('filmstrip chrome follows the active UI language for headings, summary, and hover actions', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await assertFilmstripChromeLocalized(page);

        const firstFilmstripCard = visibleFilmstripCard(page);
        await firstFilmstripCard.hover();
        await expect(firstFilmstripCard.locator('[data-testid^="filmstrip-continue-"]')).toContainText(
            tt('historyContinueFromTurn'),
        );
        await expect(firstFilmstripCard.locator('[data-testid^="filmstrip-branch-"]')).toContainText(
            tt('historyActionBranch'),
        );
    });

    test('restore notice stays open while its language switch updates both the notice and the main-page language state', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);

        const targetLanguage: Language = TEST_LANGUAGE === 'en' ? 'ja' : TEST_LANGUAGE;
        const restoreNotice = page.getByTestId('workspace-restore-notice');
        const targetShortLabel = SUPPORTED_LANGUAGES.find((item) => item.value === targetLanguage)?.shortLabel || 'En';

        await expect(restoreNotice).toContainText(getTranslation('en', 'workspaceRestoreTitle'));
        await expect(page.getByTestId('language-selector-toggle')).toHaveCount(2);

        await setWorkspaceLanguageWithin(restoreNotice, targetLanguage);

        await expect(restoreNotice).toContainText(getTranslation(targetLanguage, 'workspaceRestoreTitle'));
        await expect(
            restoreNotice.getByText(getTranslation(targetLanguage, 'workspaceRestoreActionsTitle'), { exact: true }),
        ).toBeVisible();
        await expect(page.getByTestId('workspace-restore-notice')).toBeVisible();
        await expect(page.getByTestId('language-selector-toggle').nth(0)).toContainText(targetShortLabel);
        await expect(page.getByTestId('language-selector-toggle').nth(1)).toContainText(targetShortLabel);
        await expect(page.locator('body')).toContainText(
            getTranslation(targetLanguage, 'workspaceTopHeaderReferenceTray'),
        );
    });

    test('filmstrip branch preserves the composer while syncing stage-source surfaces and header hint', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);
        await composer(page).fill('Filmstrip branch draft');

        const firstFilmstripCard = visibleFilmstripCard(page);
        await firstFilmstripCard.hover();
        await firstFilmstripCard.locator('[data-testid^="filmstrip-branch-"]').click();

        await assertStageSourceSurfaces(page, {
            composerValue: 'Filmstrip branch draft',
            followUpSource: 'Branch',
            toastKey: 'historySourceBranchNotice',
            timelineKey: 'historySourceBranchLog',
            branchLabel: 'Imported Branch',
        });
    });

    test('import review chrome follows the active UI language for summary copy and actions', async ({ page }) => {
        await openFreshWorkspace(page);

        const reviewModal = await stageImportReview(page);

        await expect(reviewModal.getByText(tt('workspaceImportReviewSnapshotSummary'), { exact: true })).toBeVisible();
        await expect(reviewModal.getByText(tt('workspaceImportReviewTurns'), { exact: true })).toBeVisible();
        await expect(reviewModal.getByText(tt('workspaceImportReviewBranchPreview'), { exact: true })).toBeVisible();
        await expect(
            reviewModal.getByRole('button', { name: tt('workspaceImportReviewMergeTurnsOnly') }),
        ).toBeVisible();
        await expect(
            reviewModal.getByRole('button', { name: tt('workspaceImportReviewReplaceCurrentWorkspace') }),
        ).toBeVisible();
    });

    test('viewer chrome follows the active UI language for header, prompt, and session-hint copy', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await page.getByAltText('Imported workspace prompt').click();
        await assertViewerChromeLocalized(page);
    });

    test('composer chrome follows the active UI language for action card and advanced labels', async ({ page }) => {
        await openFreshWorkspace(page);
        await assertComposerChromeLocalized(page);
    });

    test('active branch quick switch to Main reopens the main branch across source surfaces', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await ensureDetailsExpanded(page, 'active-branch-switcher-section');
        await activeBranchCard(page).getByTestId('active-branch-switch-root-turn').click();

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported root turn',
            followUpSource: 'Reopen',
            toastMessage: 'History turn reopened as the current stage source.',
            timelineText: 'History turn reopened as current stage source',
            branchLabel: tt('historyBranchMain'),
        });
    });

    test('active branch continue latest aligns the current branch as the active continuation source', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await expect(page.getByTestId('active-branch-open-origin')).toHaveCount(0);
        await expect(page.getByTestId('active-branch-branch-origin')).toHaveCount(0);

        await page.locator('[data-testid="active-branch-continue-latest"]:visible').first().click();

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported branch turn',
            followUpSource: 'Continue',
            toastMessage: 'History turn is now the active continuation source.',
            timelineText: 'History turn aligned as active continuation source',
            branchLabel: 'Imported Branch',
        });
    });

    test('active branch open latest reopens the latest turn across source surfaces', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await expect(page.getByTestId('active-branch-open-origin')).toHaveCount(0);
        await expect(page.getByTestId('active-branch-branch-origin')).toHaveCount(0);

        await page.locator('[data-testid="active-branch-open-latest"]:visible').first().click();

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported branch turn',
            followUpSource: 'Reopen',
            toastMessage: 'History turn reopened as the current stage source.',
            timelineText: 'History turn reopened as current stage source',
            branchLabel: 'Imported Branch',
        });
    });

    test('filmstrip card click reopens the latest branch turn across source surfaces', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        const firstFilmstripCard = visibleFilmstripCard(page);
        await firstFilmstripCard.click();

        await expect(composer(page)).toHaveValue('Imported branch turn');
        await assertCurrentStageSourceCard(page, {
            sourceLabel: tt('stageOriginHistory'),
            actionLabel: 'Continue',
            branchLabel: 'Imported Branch',
            expectOpenAction: true,
        });
        await expect(page.getByTestId('filmstrip-stage-source-badge')).toContainText(localizedText('Stage Source'));
    });

    test('session turn stack open reopens the latest turn across source surfaces', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await ensureDetailsExpanded(page, 'session-stack-section');

        await firstSessionStackCard(page).locator('[data-testid^="session-stack-open-"]').click();

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported branch turn',
            followUpSource: 'Reopen',
            toastMessage: 'History turn reopened as the current stage source.',
            timelineText: 'History turn reopened as current stage source',
            branchLabel: 'Imported Branch',
        });
        await expect(page.getByTestId('session-stage-source-badge').first()).toContainText(
            localizedText('Stage Source'),
        );
    });

    test('session turn stack keeps a single history-open route without sidebar-local continue or branch actions', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await ensureDetailsExpanded(page, 'session-stack-section');

        await expect(firstSessionStackCard(page).locator('[data-testid^="session-stack-open-"]')).toBeVisible();
        await expect(firstSessionStackCard(page).locator('[data-testid^="session-stack-continue-"]')).toHaveCount(0);
        await expect(firstSessionStackCard(page).locator('[data-testid^="session-stack-branch-"]')).toHaveCount(0);
    });

    test('lineage map open reopens the selected turn across source surfaces', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await ensureDetailsExpanded(page, 'lineage-map-card');
        await expect(firstLineageMapTurn(page).locator('[data-testid^="lineage-map-continue-"]')).toHaveCount(0);
        await expect(firstLineageMapTurn(page).locator('[data-testid^="lineage-map-branch-"]')).toHaveCount(0);

        await firstLineageMapTurn(page).locator('[data-testid^="lineage-map-open-"]').click();

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported root turn',
            followUpSource: 'Reopen',
            toastMessage: 'History turn reopened as the current stage source.',
            timelineText: 'History turn reopened as current stage source',
            branchLabel: tt('historyBranchMain'),
        });
    });

    test('replace then branch from restore preserves composer settings', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);

        await page.getByRole('button', { name: tt('workspaceRestoreBranch') }).click();

        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Imported workspace prompt');
        await expect(
            page.getByText(
                localizedText('History turn staged as a new branch source. Composer settings were preserved.'),
            ),
        ).toBeVisible();
    });

    test('replace then clear chain keeps settings but resets the stage', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);

        await page.getByRole('button', { name: tt('workspaceRestoreUseSettingsClear') }).click();

        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Imported workspace prompt');
        await expect(page.getByText(tt('readyTitle'))).toBeVisible();
        await ensureWorkspaceInsightsExpanded(page);
        await expect(page.locator('[data-testid="workspace-insights-collapsible"]:visible').first()).toContainText(
            tt('groundingProvenanceNoActiveSessionTurn'),
        );
    });

    test('branch rename updates the active branch label', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await renameBranchFromGallery(page, 'Imported Alt Path');

        await expect(page.getByText(tt('branchRenameSavedNotice', 'Imported Alt Path'), { exact: true })).toBeVisible();
        await assertBranchLabelPropagates(page, 'Imported Alt Path');
    });

    test('branch rename reset restores the automatic label', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await renameBranchFromGallery(page, 'Imported Alt Path');
        await assertBranchLabelPropagates(page, 'Imported Alt Path');

        const resetDialog = await openFirstHistoryRenameDialog(page);
        await resetDialog
            .getByRole('button', { name: tt('btnReset') })
            .evaluate((button: HTMLButtonElement) => button.click());
        await resetDialog
            .getByRole('button', { name: tt('branchRenameSave') })
            .evaluate((button: HTMLButtonElement) => button.click());

        await expect(page.getByText(tt('branchRenameResetNotice'), { exact: true })).toBeVisible();
        await assertBranchLabelCleared(page, 'Imported Alt Path');
        await expect(activeBranchCard(page)).toContainText(tt('historyBranchMain'));
    });

    test('gallery tab keeps imported history actions on open-plus-rename only', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await openGalleryPanel(page);
        const firstCard = page.locator('[data-testid^="history-card-"]').first();

        await firstCard.hover();
        await expect(firstCard.locator('[data-testid^="history-open-"]')).toBeVisible();
        await expect(firstCard.locator('[data-testid^="history-rename-"]')).toBeVisible();
        await expect(firstCard.locator('[data-testid^="history-continue-"]')).toHaveCount(0);
        await expect(firstCard.locator('[data-testid^="history-branch-"]')).toHaveCount(0);

        await firstCard.locator('[data-testid^="history-open-"]').click();
        await expect(page.getByTestId('picker-sheet-close')).toHaveCount(0);
    });

    test('export workspace triggers a JSON download', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: tt('composerToolbarExportWorkspace') }).click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toMatch(/^nano-banana-workspace-.*\.json$/);
    });

    test('invalid snapshot import shows an error and does not open review', async ({ page }) => {
        await openFreshWorkspace(page);

        await page.locator('#workspace-import-input').setInputFiles(invalidSnapshotFilePath);

        await expect(page.getByText(tt('workspaceSnapshotImportInvalidFormat'), { exact: true })).toBeVisible();
        await expect(page.getByTestId('workspace-import-review')).toHaveCount(0);
        await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
    });

    test('dismiss restore notice closes it without changing the imported composer state', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);

        await expect(page.getByText(tt('workspaceRestoreTitle'))).toBeVisible();
        await expect(composer(page)).toHaveValue('Imported workspace prompt');

        await dismissRestoreNotice(page);

        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Imported workspace prompt');
        await expect(page.getByText(tt('historyFilmstripSummary', '2', '2'))).toBeVisible();
    });

    test('workspace snapshot quota errors do not white-screen the app', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (error) => {
            pageErrors.push(error.message);
        });

        await openWorkspaceWithSnapshotQuotaFailure(page, restoredOfficialConversationSnapshot);

        await expect(page.getByTestId('workspace-restore-notice')).toBeVisible();
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toBeVisible();
        await expect(composer(page)).toHaveValue('Restored official conversation workspace');
        await expect(page.locator('body')).toContainText(tt('workspaceRestoreTitle'));
        expect(pageErrors).toEqual([]);
    });

    test('restored file-backed snapshots reload images through load-image links', async ({ page }) => {
        await openWorkspaceWithSnapshot(page, restoredFileBackedSnapshot);
        await dismissRestoreNoticeIfPresent(page);

        await expect
            .poll(async () =>
                page.evaluate(() => {
                    const raw = localStorage.getItem('nbu_workspaceSnapshot');
                    if (!raw) {
                        return null;
                    }

                    const snapshot = JSON.parse(raw);
                    return {
                        historyUrl: snapshot.history?.[0]?.url || null,
                        stagedAssetUrl: snapshot.stagedAssets?.[0]?.url || null,
                        viewerUrl: snapshot.viewState?.generatedImageUrls?.[0] || null,
                    };
                }),
            )
            .toEqual({
                historyUrl: '/api/load-image?filename=file-backed-turn.png',
                stagedAssetUrl: '/api/load-image?filename=file-backed-turn.png',
                viewerUrl: '/api/load-image?filename=file-backed-turn.png',
            });

        const restoredSnapshot = await page.evaluate(() => {
            const raw = localStorage.getItem('nbu_workspaceSnapshot');
            return raw ? JSON.parse(raw) : null;
        });

        expect(restoredSnapshot).not.toBeNull();

        const restoredPage = await page.context().newPage();
        const requestedFilenames: string[] = [];

        await restoredPage.route('**/api/load-image?filename=*', async (route) => {
            const filename = new URL(route.request().url()).searchParams.get('filename');
            if (filename) {
                requestedFilenames.push(filename);
            }

            await route.fulfill({
                status: 200,
                contentType: 'image/png',
                body: Buffer.from(
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRWQAAAAASUVORK5CYII=',
                    'base64',
                ),
            });
        });

        await openWorkspaceWithSnapshot(restoredPage, restoredSnapshot as Record<string, unknown>);
        await expect(composer(restoredPage)).toHaveValue('File-backed restore prompt');
        await dismissRestoreNoticeIfPresent(restoredPage);
        await openGalleryPanel(restoredPage);

        const restoredHistoryImage = restoredPage
            .locator('[data-testid^="history-card-"]')
            .first()
            .getByRole('img', { name: 'File-backed restored turn' });

        await expect(restoredHistoryImage).toBeVisible();
        await expect(restoredHistoryImage).toHaveAttribute('src', /\/api\/load-image\?filename=file-backed-turn\.png/);
        expect(requestedFilenames).toContain('file-backed-turn.png');

        await restoredPage.close();
    });

    test('replace imported inherited provenance exposes continuity summary and recovered sources', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            inheritedProvenanceSnapshotFilePath,
            'ui-import-provenance-inherited-workspace.json',
        );
        await dismissRestoreNotice(page);

        await assertProvenanceSummary(page, {
            mode: 'Inherited',
            sourceTurn: 'turn-pro',
            sources: '1',
            supportBundles: '1',
            visibleTexts: ['Taipei Official Travel Guide'],
            sourcePrompt: 'Grounded root turn',
            expectSourceRouteOnly: true,
        });
    });

    test('replace imported live provenance exposes direct grounding summary and multiple sources', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            liveProvenanceSnapshotFilePath,
            'ui-import-provenance-live-workspace.json',
        );
        await dismissRestoreNotice(page);

        await assertProvenanceSummary(page, {
            mode: 'Live',
            sourceTurn: 'turn-liv',
            sources: '2',
            supportBundles: '1',
            visibleTexts: ['Taipei Night Market Guide', 'Taipei Skyline Images'],
            sourcePrompt: 'Live grounded turn',
            expectSourceRouteOnly: true,
        });
    });

    test('provenance panel surfaces attribution overview and uncited sources in the live UI', async ({ page }) => {
        await openWorkspaceWithSnapshot(page, uncitedProvenanceSnapshot);
        await dismissRestoreNoticeIfPresent(page);

        await assertProvenanceSummary(page, {
            mode: 'Live',
            sourceTurn: 'turn-unc',
            sources: '2',
            supportBundles: '1',
            visibleTexts: ['Taipei City Portal', 'Skyline Stock Gallery'],
            sourcePrompt: 'Uncited provenance turn',
            expectSourceRouteOnly: true,
        });

        await assertProvenanceAttributionOverview(page, {
            coverageValue: tt('groundingPanelAttributionCoverageValue', '1', '2'),
            sourceMixValue: `1 ${tt('groundingPanelAttributionSourceTypeWeb')} · 1 ${tt('groundingPanelAttributionSourceTypeImage')}`,
            queriesValue: `1 ${tt('groundingPanelAttributionWebQueries')}`,
            sourceStatusValue: tt('groundingPanelAttributionSourceStatusValue', '1', '1'),
            groundingStatus: tt('groundingProvenanceGroundingSourcesReturned'),
            supportStatus: tt('groundingProvenanceSupportBundlesUsed'),
            entryPointValue: tt('groundingPanelAttributionEntryPointAvailable'),
            entryPointStatus: tt(
                'groundingPanelAttributionEntryPointStatus',
                tt('groundingPanelAttributionEntryPointAvailable'),
            ),
            uncitedSourceTitle: 'Skyline Stock Gallery',
        });

        const provenancePanel = visibleProvenancePanel(page);
        const detailPanel = provenancePanel.getByTestId('provenance-detail');

        await clickFirstVisible(provenancePanel.getByTestId('provenance-source-1'));
        await expect(detailPanel.getByTestId('provenance-detail-reuse-preview')).toContainText(
            tt('groundingPanelReusePreview'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-append-preview')).toContainText(
            tt('groundingPanelReuseAppendPreview'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-append-preview')).toContainText(
            'Uncited provenance prompt',
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-append-preview')).toContainText(
            tt(
                'groundingProvenanceReferenceCue',
                tt('groundingProvenanceReferenceSource', 'Skyline Stock Gallery', 'example.com'),
            ),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-append-preview')).toContainText(
            tt('groundingPanelReuseAppendImpactKeep'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-current-prompt')).toContainText(
            tt('groundingPanelReuseCurrentPromptLabel'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-current-prompt')).toContainText(
            'Uncited provenance prompt',
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-appended-cue')).toContainText(
            tt('groundingPanelReuseAddedCueLabel'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-appended-cue')).toContainText(
            tt(
                'groundingProvenanceReferenceCue',
                tt('groundingProvenanceReferenceSource', 'Skyline Stock Gallery', 'example.com'),
            ),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-replace-preview')).toContainText(
            tt('groundingPanelReuseReplacePreview'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-replace-preview')).toContainText(
            tt('groundingPanelReuseReplaceImpact'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-snippet')).toContainText(
            tt('groundingProvenanceReferenceSource', 'Skyline Stock Gallery', 'example.com'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-source-status')).toContainText(
            tt('groundingPanelNoBundleCitesSource'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-source-compare-summary')).toContainText(
            tt('groundingPanelSourceCompareSummaryUncited', '0', '1'),
        );

        await clickFirstVisible(provenancePanel.getByTestId('provenance-bundle-0'));
        await expect(detailPanel.getByTestId('provenance-detail-reuse-preview')).toContainText(
            tt('groundingPanelReusePreview'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-append-preview')).toContainText(
            tt('groundingPanelReuseAppendPreview'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-append-preview')).toContainText(
            'Uncited provenance prompt',
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-append-preview')).toContainText(
            tt(
                'groundingProvenanceReferenceCue',
                `${tt('groundingProvenanceCitedDetail', 'Taipei skyline overview with landmark highlights')}. ${tt('groundingProvenanceSources', 'Taipei City Portal')}`,
            ),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-append-preview')).toContainText(
            tt('groundingPanelReuseAppendImpactKeep'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-current-prompt')).toContainText(
            tt('groundingPanelReuseCurrentPromptLabel'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-current-prompt')).toContainText(
            'Uncited provenance prompt',
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-appended-cue')).toContainText(
            tt('groundingPanelReuseAddedCueLabel'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-appended-cue')).toContainText(
            tt(
                'groundingProvenanceReferenceCue',
                `${tt('groundingProvenanceCitedDetail', 'Taipei skyline overview with landmark highlights')}. ${tt('groundingProvenanceSources', 'Taipei City Portal')}`,
            ),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-replace-preview')).toContainText(
            tt('groundingPanelReuseReplacePreview'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-replace-preview')).toContainText(
            tt('groundingPanelReuseReplaceImpact'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-snippet')).toContainText(
            tt('groundingProvenanceCitedDetail', 'Taipei skyline overview with landmark highlights'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-reuse-snippet')).toContainText(
            tt('groundingProvenanceSources', 'Taipei City Portal'),
        );
        await expect(detailPanel.getByTestId('provenance-compare-other-source-1')).toContainText(
            'Skyline Stock Gallery',
        );
        await expect(detailPanel.getByTestId('provenance-compare-source-0')).toContainText(
            tt('groundingPanelCompareStateLinked'),
        );
        await expect(detailPanel.getByTestId('provenance-compare-other-source-1')).toContainText(
            tt('groundingPanelSourceStatusRetrievedOnly'),
        );
        await expect(detailPanel.getByTestId('provenance-compare-other-source-1')).toContainText(
            tt('groundingPanelCompareStateOutside'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-bundle-compare-summary')).toContainText(
            tt('groundingPanelBundleCompareSummary', '1', '2'),
        );
        await expect(detailPanel.getByTestId('provenance-detail-other-sources-summary')).toContainText(
            tt('groundingPanelBundleCompareOtherSources', '1'),
        );
    });

    test('queued batch panel restores localized counts, states, and job actions from the workspace snapshot', async ({
        page,
    }) => {
        await installQueuedBatchGetFixtureRoute(page, queuedBatchPanelSnapshot);
        await openWorkspaceWithSnapshot(page, queuedBatchPanelSnapshot);
        await dismissRestoreNoticeIfPresent(page);

        const panel = page.getByTestId('queued-batch-panel');
        await expect(panel).toBeVisible();
        await expect(panel).toContainText(tt('queuedBatchJobsTitle'));
        await expect(panel.getByTestId('queued-batch-active-count')).toContainText(
            tt('queuedBatchJobsActiveCount', '1'),
        );
        await expect(panel.getByTestId('queued-batch-import-ready-count')).toContainText(
            tt('queuedBatchJobsImportReadyCount', '1'),
        );
        await expect(panel.getByTestId('queued-batch-closed-issues-count')).toContainText(
            tt('queuedBatchJobsClosedIssuesCount', '1'),
        );
        await expect(panel.getByTestId('queued-batch-tracked-count')).toContainText(
            tt('queuedBatchJobsTrackedCount', '4'),
        );
        await expect(panel.getByTestId('queued-batch-import-all')).toContainText(
            tt('queuedBatchJobsImportReadyAction'),
        );
        await expect(panel.getByTestId('queued-batch-refresh-all')).toContainText(tt('queuedBatchJobsRefreshAll'));

        await expect(panel.getByTestId('queued-batch-job-job-pending')).toContainText('Pending panorama batch');
        await expect(panel.getByTestId('queued-batch-job-job-pending-state')).toContainText(
            tt('queuedBatchStatePending'),
        );
        await expect(panel.getByTestId('queued-batch-job-job-pending-poll')).toContainText(tt('queuedBatchJobsPoll'));
        await expect(panel.getByTestId('queued-batch-job-job-pending-cancel')).toContainText(
            tt('queuedBatchJobsCancel'),
        );
        await expect(panel.getByTestId('queued-batch-job-job-pending-clear')).toContainText(tt('queuedBatchJobsClear'));
        await expect(panel.getByTestId('queued-batch-job-job-pending-timeline-0')).toContainText(
            tt('queuedBatchTimelineSubmitted'),
        );

        await expect(panel.getByTestId('queued-batch-job-job-ready')).toContainText('Ready character batch');
        await expect(panel.getByTestId('queued-batch-job-job-ready-state')).toContainText(
            tt('queuedBatchStateSucceeded'),
        );
        await expect(panel.getByTestId('queued-batch-job-job-ready-import')).toContainText(tt('queuedBatchJobsImport'));
        await expect(panel.getByTestId('queued-batch-job-job-ready')).toContainText(tt('queuedBatchTimelineFinished'));

        await expect(panel.getByTestId('queued-batch-job-job-imported')).toContainText('Imported archive batch');
        await expect(panel.getByTestId('queued-batch-job-job-imported-imported')).toContainText(
            tt('queuedBatchJobsImportedTag'),
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-imported-count')).toContainText('2x');
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-summary')).toContainText('2x');
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-prev')).toBeVisible();
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-next')).toBeVisible();
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-rail')).toHaveCount(1);
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-active-cue')).toContainText(
            'Imported queued batch result text',
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-active-cue')).toHaveAttribute(
            'title',
            'Imported queued batch result text · Imported queued results',
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-active-result')).toContainText(
            tt('workspaceViewerResultText'),
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-active-result')).toContainText(
            'Imported queued batch result text',
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-active-prompt')).toContainText(
            tt('workspaceViewerPrompt'),
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-active-prompt')).toContainText(
            'Imported queued results',
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-0')).toHaveCount(1);
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-1')).toHaveCount(1);
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-0')).toHaveAttribute(
            'title',
            'Imported queued batch result text',
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-1')).toHaveAttribute(
            'title',
            'Imported queued batch result text two',
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-0-cue')).toContainText(
            'Imported queued batch result text',
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-1-cue')).toContainText(
            'Imported queued batch result text two',
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-open')).toContainText(
            `${tt('historyActionOpen')} #1/2`,
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-open-latest')).toContainText(
            `${tt('historyActionOpenLatest')} #2/2`,
        );

        await panel.getByTestId('queued-batch-job-job-imported-preview-next').click();
        await expect(currentStageSourceCard(page)).toContainText('#2/2');
        await expect(currentStageSourceCard(page)).toContainText('Imported queued results alternate angle');
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-1-active')).toContainText(
            tt('workspacePickerStageSource'),
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-active-cue')).toContainText(
            'Imported queued batch result text two',
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-active-prompt')).toContainText(
            'Imported queued results alternate angle',
        );

        await panel.getByTestId('queued-batch-job-job-imported-preview-prev').click();
        await expect(currentStageSourceCard(page)).toContainText('#1/2');
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-0-active')).toContainText(
            tt('workspacePickerStageSource'),
        );
        await expect(panel.getByTestId('queued-batch-job-job-imported-preview-active-cue')).toContainText(
            'Imported queued batch result text',
        );

        await panel.getByTestId('queued-batch-job-job-imported-open').click();
        await expect(page.getByTestId('stage-open-viewer')).toBeVisible();
        await expect(currentStageSourceCard(page)).toContainText(tt('workspaceImportReviewExecutionQueuedBatchJob'));
        await expect(currentStageSourceCard(page)).toContainText('#1/2');
        await expect(currentStageSourceCard(page)).not.toContainText(localizedText('Candidate'));

        const filmstripCard = page.getByTestId('filmstrip-card-queued-imported-turn');
        await expect(filmstripCard).toBeVisible();
        await filmstripCard.hover();
        await expect(filmstripCard).toContainText(tt('workspaceImportReviewExecutionQueuedBatchJob'));
        await expect(filmstripCard).toContainText('#1/2');
        await expect(filmstripCard).not.toContainText(localizedText('Candidate'));

        await page.getByTestId('stage-open-viewer').click({ force: true });
        await expect(page.getByTestId('workspace-viewer-prompt-value')).toContainText('Imported queued results');
        await page.getByRole('button', { name: tt('workspaceViewerClose') }).click();
        await expect(page.getByTestId('workspace-viewer-overlay')).toHaveCount(0);

        const historyCard = page.getByTestId('history-card-queued-imported-turn');
        if ((await historyCard.count()) === 0) {
            await openGalleryPanel(page);
        }
        await expect(historyCard).toBeVisible();
        await historyCard.hover();
        await expect(historyCard).toContainText(tt('workspaceImportReviewExecutionQueuedBatchJob'));
        await expect(historyCard).toContainText('#1/2');
        await expect(historyCard).not.toContainText(localizedText('Candidate'));
        await page.getByTestId('picker-sheet-close').click();

        await panel.getByTestId('queued-batch-job-job-imported-open-latest').click();
        await expect(currentStageSourceCard(page)).toContainText('#2/2');
        await expect(currentStageSourceCard(page)).toContainText('Imported queued results alternate angle');

        await expect(panel.getByTestId('queued-batch-job-job-failed')).toContainText('Failed storyboard batch');
        await expect(panel.getByTestId('queued-batch-job-job-failed-state')).toContainText(
            tt('queuedBatchStateFailed'),
        );
        await expect(panel.getByTestId('queued-batch-job-job-failed')).toContainText('Upstream batch failed.');
        await expect(panel.getByTestId('queued-batch-job-job-failed')).toContainText(tt('queuedBatchTimelineClosed'));
    });

    test('session continuity source card exposes direct source actions after restore', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        const sessionSourceCard = page.getByTestId('session-continuity-source-card').first();
        await expect(sessionSourceCard).toContainText('Imported branch turn');
        await ensureDetailsExpanded(page, 'continuity-source-section');
        await ensureDetailsExpanded(page, 'session-continuity-details');
        await expect(sessionSourceCard.getByTestId('session-continuity-open')).toHaveCount(1);
        await expect(sessionSourceCard.getByTestId('session-continuity-continue')).toHaveCount(0);
        await expect(sessionSourceCard.getByTestId('session-continuity-branch')).toHaveCount(0);
    });

    test('restore rehydrates official conversation state from the snapshot and keeps conversation source routing visible', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await stageImportReview(
            page,
            officialConversationSnapshotFilePath,
            'ui-import-official-conversation-workspace.json',
        );

        await page.getByTestId('import-review-replace-continue-latest').click();

        await expect(page.getByTestId('workspace-import-review')).toHaveCount(0);
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toHaveCount(0);

        await assertOfficialConversationSummary(page, {
            branchLabel: 'Chat Branch',
            turnCount: tt('workspaceInsightsTurnsCount', '1'),
            conversationIdShort: 'chatconv',
            activeSourceShortId: 'chat-fol',
            prompt: 'Official chat follow-up turn',
            expectStageBadge: true,
        });
        await assertOfficialConversationSummary(page, {
            branchLabel: 'Chat Branch',
            turnCount: tt('workspaceInsightsTurnsCount', '1'),
            conversationIdShort: 'chatconv',
            activeSourceShortId: 'chat-fol',
            prompt: 'Official chat follow-up turn',
            expectStageBadge: true,
        });
    });

    test('import-review continue path sends the official conversation payload on the next browser generate request', async ({
        page,
    }) => {
        const capturedBodies = await installOfficialConversationGenerateCaptureRoute(page);
        const prompt = 'Browser import review official continuation';

        await openFreshWorkspace(page);
        await stageImportReview(
            page,
            officialConversationSnapshotFilePath,
            'ui-import-official-conversation-workspace.json',
        );
        await page.getByTestId('import-review-replace-continue-latest').click();

        await expect(page.getByTestId('workspace-import-review')).toHaveCount(0);
        await composer(page).fill(prompt);
        await generateButton(page).click();

        await expect.poll(() => capturedBodies.length).toBe(1);
        assertOfficialConversationGeneratePayload(capturedBodies[0], prompt);
        await expect(page.getByText('Browser official conversation reply')).toBeVisible();
        await assertOfficialConversationPostGenerateState(page, prompt);
    });

    test('restore notice continue path preserves restored official conversation continuity', async ({ page }) => {
        await openWorkspaceWithSnapshot(page, restoredOfficialConversationSnapshot);

        const restoreNotice = page.getByTestId('workspace-restore-notice');
        await expect(restoreNotice).toContainText(localizedText('Workspace Restored'));
        await expect(restoreNotice).toContainText(tt('workspaceRestoreActiveBranch', 'Chat Branch'));

        await assertOfficialConversationSummary(page, {
            branchLabel: 'Chat Branch',
            turnCount: tt('workspaceInsightsTurnsCount', '1'),
            conversationIdShort: 'chatconv',
            activeSourceShortId: 'chat-fol',
            prompt: 'Official chat follow-up turn',
            expectStageBadge: true,
        });

        await composer(page).fill('Restore notice official conversation draft');
        await restoreNotice.getByTestId('workspace-restore-continue').click();

        await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
        await assertStageSourceSurfaces(page, {
            composerValue: 'Official chat follow-up turn',
            followUpSource: 'Continue',
            toastMessage: 'History turn is now the active continuation source.',
            timelineText: 'History turn aligned as active continuation source',
            branchLabel: 'Chat Branch',
        });
        await assertOfficialConversationSummary(page, {
            branchLabel: 'Chat Branch',
            turnCount: tt('workspaceInsightsTurnsCount', '1'),
            conversationIdShort: 'chatconv',
            activeSourceShortId: 'chat-fol',
            prompt: 'Official chat follow-up turn',
            expectStageBadge: true,
        });
    });

    test('restore-notice continue path sends the official conversation payload on the next browser generate request', async ({
        page,
    }) => {
        const capturedBodies = await installOfficialConversationGenerateCaptureRoute(page);
        const prompt = 'Browser restore notice official continuation';

        await openWorkspaceWithSnapshot(page, restoredOfficialConversationSnapshot);

        const restoreNotice = page.getByTestId('workspace-restore-notice');
        await restoreNotice.getByTestId('workspace-restore-continue').click();

        await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
        await composer(page).fill(prompt);
        await generateButton(page).click();

        await expect.poll(() => capturedBodies.length).toBe(1);
        assertOfficialConversationGeneratePayload(capturedBodies[0], prompt);
        await expect(page.getByText('Browser official conversation reply')).toBeVisible();
        await assertOfficialConversationPostGenerateState(page, prompt);
    });

    test('provenance detail inspector links sources to citation bundles and reuses the selected detail in the composer', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            liveProvenanceSnapshotFilePath,
            'ui-import-provenance-live-workspace.json',
        );
        await dismissRestoreNotice(page);

        const provenancePanel = visibleProvenancePanel(page);
        const detailPanel = provenancePanel.getByTestId('provenance-detail');
        const visibleComposer = page.locator('textarea:visible').first();

        await clickFirstVisible(provenancePanel.getByTestId('provenance-source-0'));
        await expect(detailPanel).toContainText('Taipei Night Market Guide');
        await expect(detailPanel).toContainText('Night market atmosphere');

        await clickSummary(detailPanel.getByTestId('provenance-compare-bundle-summary-0'));
        await expect(detailPanel).toContainText(tt('groundingPanelSupportBundleTitle', '1'));
        await expect(detailPanel).toContainText('Taipei Skyline Images');

        await clickSummary(detailPanel.getByTestId('provenance-compare-source-summary-1'));
        await expect(detailPanel).toContainText('Taipei Skyline Images');

        await detailPanel.getByTestId('provenance-detail-replace-prompt').click();
        await expect(visibleComposer).toHaveValue(
            tt('groundingProvenanceReferenceSource', 'Taipei Skyline Images', 'example.com'),
        );
    });

    test('provenance detail focus mode narrows linked items and clear selection resets the inspector', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            liveProvenanceSnapshotFilePath,
            'ui-import-provenance-live-workspace.json',
        );
        await dismissRestoreNotice(page);

        const provenancePanel = visibleProvenancePanel(page);
        const detailPanel = provenancePanel.getByTestId('provenance-detail');

        await clickFirstVisible(provenancePanel.getByTestId('provenance-source-0'));
        await detailPanel.getByTestId('provenance-detail-toggle-focus').click();

        await expect(detailPanel.getByTestId('provenance-detail-focus-state')).toContainText(
            tt('groundingPanelFocusState', '1', '1'),
        );
        await expect(provenancePanel.getByTestId('provenance-source-1')).toHaveCount(0);
        await expect(provenancePanel.getByTestId('provenance-bundle-0')).toHaveCount(1);

        await detailPanel.getByTestId('provenance-detail-toggle-focus').click();
        await expect(detailPanel.getByTestId('provenance-detail-focus-state')).toContainText(
            localizedText('Showing the full citation context'),
        );
        await expect(provenancePanel.getByTestId('provenance-source-1')).toHaveCount(1);

        await detailPanel.getByTestId('provenance-detail-clear-selection').click();
        await expect(detailPanel).toContainText(tt('groundingPanelEmptyDetail'));
    });

    test('provenance bundle compare view shows linked sources side by side and can inspect either source', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            liveProvenanceSnapshotFilePath,
            'ui-import-provenance-live-workspace.json',
        );
        await dismissRestoreNotice(page);

        const provenancePanel = visibleProvenancePanel(page);
        const detailPanel = provenancePanel.getByTestId('provenance-detail');

        await clickFirstVisible(provenancePanel.getByTestId('provenance-bundle-0'));
        await expect(detailPanel.getByTestId('provenance-compare-source-0')).toContainText('Taipei Night Market Guide');
        await expect(detailPanel.getByTestId('provenance-compare-source-1')).toContainText('Taipei Skyline Images');

        await clickSummary(detailPanel.getByTestId('provenance-compare-source-summary-1'));
        await expect(detailPanel).toContainText(localizedText('Selected Source'));
        await expect(detailPanel).toContainText('Taipei Skyline Images');
    });

    test('provenance source compare view shows multiple cited segments and can inspect either bundle', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            multiBundleProvenanceSnapshotFilePath,
            'ui-import-provenance-multi-bundle-workspace.json',
        );
        await dismissRestoreNotice(page);

        const provenancePanel = visibleProvenancePanel(page);
        const detailPanel = provenancePanel.getByTestId('provenance-detail');

        await clickFirstVisible(provenancePanel.getByTestId('provenance-source-0'));
        await expect(detailPanel.getByTestId('provenance-compare-bundle-0')).toContainText(
            'Lantern-lit market street energy',
        );
        await expect(detailPanel.getByTestId('provenance-compare-bundle-1')).toContainText(
            'Skyline silhouette with mountain backdrop',
        );

        await clickSummary(detailPanel.getByTestId('provenance-compare-bundle-summary-1'));
        await expect(detailPanel).toContainText(localizedText('Selected Bundle'));
        await expect(detailPanel).toContainText('Skyline silhouette with mountain backdrop');
    });

    test('session replay reopens imported workflow logs from the workspace snapshot', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            liveProvenanceSnapshotFilePath,
            'ui-import-provenance-live-workspace.json',
        );
        await dismissRestoreNotice(page);

        const replayDialog = await openSessionReplay(page);
        await expect(replayDialog.getByTestId('session-replay-active')).toContainText(
            localizedMessageByKey('workspaceSnapshotImportedLog', 'ui-import-provenance-live-workspace.json', '1'),
        );

        await replayDialog.getByRole('button', { name: tt('sessionReplayPrev') }).click();
        await expect(replayDialog.getByTestId('session-replay-active')).toContainText(localizedText('History loaded.'));

        await replayDialog.getByRole('button', { name: tt('sessionReplayPrev') }).click();
        await expect(replayDialog.getByTestId('session-replay-active')).toContainText(
            'Success: Live grounded result saved.',
        );
        await replayDialog.getByTestId('session-replay-entry-0').click();
        await expect(replayDialog.getByTestId('session-replay-active')).toContainText(
            'Requesting grounded image generation.',
        );
    });

    test('session replay localizes replay chrome, stage labels, and source actions after import', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await page
            .getByTestId('workspace-restore-notice')
            .getByRole('button', { name: tt('workspaceRestoreOpenLatest') })
            .click();

        const replayDialog = await openSessionReplay(page);

        await expectSessionReplayLocalizedChrome(page, replayDialog, 'ja');
        await expectSessionReplayLocalizedChrome(page, replayDialog, 'es');
        await expectSessionReplayLocalizedChrome(page, replayDialog, 'fr');
        await expectSessionReplayLocalizedChrome(page, replayDialog, 'de');
        await expectSessionReplayLocalizedChrome(page, replayDialog, 'ru');
    });

    test('reload keeps persisted workflow logs available for session replay', async ({ page }) => {
        await openWorkspaceWithSnapshot(page, {
            history: [
                {
                    id: 'turn-reload',
                    url: 'https://example.com/reload.png',
                    prompt: 'Reloaded workspace prompt',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 1,
                    status: 'success',
                },
            ],
            stagedAssets: [],
            workflowLogs: ['[10:00:00] Reload log request', '[10:00:01] Reload log history loaded'],
            workspaceSession: {
                activeResult: {
                    text: 'Reload result',
                    thoughts: null,
                    grounding: null,
                    metadata: null,
                    sessionHints: null,
                    historyId: 'turn-reload',
                },
                continuityGrounding: null,
                continuitySessionHints: null,
                provenanceMode: null,
                provenanceSourceHistoryId: null,
                source: 'history',
                sourceHistoryId: 'turn-reload',
                updatedAt: 1,
            },
            branchState: { nameOverrides: {} },
            viewState: {
                generatedImageUrls: [],
                selectedImageIndex: 0,
                selectedHistoryId: 'turn-reload',
            },
            composerState: {
                prompt: 'Reloaded workspace prompt',
                aspectRatio: '1:1',
                imageSize: '1K',
                imageStyle: 'None',
                imageModel: 'gemini-3.1-flash-image-preview',
                batchSize: 1,
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: false,
                googleSearch: false,
                imageSearch: false,
                generationMode: 'Text to Image',
            },
        });

        await dismissRestoreNoticeIfPresent(page);

        const persistedWorkflowLogs = await page.evaluate(() => {
            const raw = localStorage.getItem('nbu_workspaceSnapshot');
            return raw ? JSON.parse(raw).workflowLogs : [];
        });

        expect(persistedWorkflowLogs).toEqual([
            '[10:00:00] Reload log request',
            '[10:00:01] Reload log history loaded',
        ]);

        await ensureWorkspaceInsightsExpanded(page);
        await expect(page.locator('[data-testid="open-session-replay"]:visible').first()).toBeVisible();
    });

    test('narrow shell owner routes keep actions, advanced settings, and workflow log reachable after import', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 430, height: 932 });
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            liveProvenanceSnapshotFilePath,
            'ui-import-provenance-live-workspace.json',
        );
        await dismissRestoreNotice(page);

        const sideTools = page.locator('[data-testid="workspace-side-tool-panel"]:visible').first();
        await expect(sideTools).toBeVisible();
        await expect(sideTools.getByTestId('workspace-side-tools-actions')).toBeVisible();

        await page.getByTestId('composer-reference-context-button').click();
        const pickerSheet = page.getByRole('dialog').filter({ hasText: tt('workspaceSheetTitleReferences') });
        await expect(pickerSheet).toBeVisible();
        await expect(pickerSheet).toContainText(tt('workspacePickerEditorBase'));
        await expect(pickerSheet).toContainText(tt('workspacePickerStageSource'));
        await expect(pickerSheet.getByTestId('picker-references-character-hint-trigger')).toBeVisible();
        await expect(pickerSheet.getByTestId('picker-references-editor-base-hint-trigger')).toBeVisible();
        await expect(pickerSheet.getByTestId('picker-references-stage-source-hint-trigger')).toBeVisible();
        await expect(pickerSheet.getByRole('button', { name: tt('workspacePickerOpenSketchPad') })).toBeVisible();
        await pickerSheet.getByTestId('picker-sheet-close').click();
        await expect(pickerSheet).toHaveCount(0);

        await sideTools.getByTestId('side-tools-open-sketchpad').click();
        await expect(page.getByText(tt('loadingPrepareSketchPad'), { exact: true })).toBeVisible();
        await expect(page.getByTestId('sketchpad')).toBeVisible();
        await page.getByTestId('sketchpad-close').click();
        await expect(page.getByTestId('sketchpad')).toHaveCount(0);

        await page.getByRole('button', { name: tt('composerToolbarAdvancedSettings') }).click();
        await expect(
            page
                .getByTestId('composer-advanced-settings-dialog')
                .getByRole('heading', { name: tt('composerAdvancedTitle') })
                .first(),
        ).toBeVisible();

        const mobileInsights = page.locator('[data-testid="workspace-insights-collapsible"]:visible').first();
        await mobileInsights.evaluate((element) => {
            if (element instanceof HTMLDetailsElement) {
                element.open = true;
            }
        });
        const contextTimeline = page.locator('[data-testid="context-timeline-section"]:visible').first();
        await expect(contextTimeline).toContainText(tt('workspaceInsightsTimelineTitle'));

        const timelineHistory = page.locator('[data-testid="timeline-history-section"]:visible').first();
        await timelineHistory.evaluate((element) => {
            if (element instanceof HTMLDetailsElement) {
                element.open = true;
            }
        });
        await expect(timelineHistory).toContainText(localizedText('History loaded.'));
        await expect(timelineHistory).toContainText('Requesting grounded image generation.');
        await expect(timelineHistory).toContainText('Success: Live grounded result saved.');
    });

    test('desktop shell owner layout keeps model output, context rail, and provenance separated after import', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1536, height: 1100 });
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            liveProvenanceSnapshotFilePath,
            'ui-import-provenance-live-workspace.json',
        );
        await dismissRestoreNotice(page);

        const responseRail = page.locator('[data-testid="workspace-response-rail"]:visible').first();
        await expect(responseRail).toBeVisible();
        await expect(responseRail.getByTestId('workspace-model-output-card')).toBeVisible();
        await expect(responseRail.getByTestId('workspace-response-text-card')).toBeVisible();
        await expect(responseRail.getByTestId('workspace-thoughts-card')).toBeVisible();
        await expect(responseRail.getByTestId('context-workflow-summary')).toHaveCount(0);

        const sideTools = page.locator('[data-testid="workspace-side-tool-panel"]:visible').first();
        await expect(sideTools).toBeVisible();

        const provenancePanel = visibleProvenancePanel(page);
        await expect(provenancePanel).toBeVisible();
        await expect(provenancePanel.getByTestId('provenance-summary')).toBeVisible();

        const desktopInsights = page.locator('[data-testid="workspace-insights-collapsible"]:visible').first();
        await desktopInsights.evaluate((element) => {
            if (element instanceof HTMLDetailsElement) {
                element.open = true;
            }
        });

        const contextWorkflow = page.locator('[data-testid="context-workflow-summary"]:visible').first();
        await expect(contextWorkflow).toBeVisible();
        await expect(contextWorkflow).toContainText(
            localizedMessageByKey('workspaceSnapshotImportedLog', 'ui-import-provenance-live-workspace.json', '1'),
        );

        const timelineHistory = page.locator('[data-testid="timeline-history-section"]:visible').first();
        await timelineHistory.evaluate((element) => {
            if (element instanceof HTMLDetailsElement) {
                element.open = true;
            }
        });
        await expect(timelineHistory).toContainText(localizedText('History loaded.'));
        await expect(timelineHistory).toContainText('Requesting grounded image generation.');
    });

    test('dark mode keeps shell owner surfaces readable after import', async ({ page }) => {
        await page.setViewportSize({ width: 1536, height: 1100 });
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            liveProvenanceSnapshotFilePath,
            'ui-import-provenance-live-workspace.json',
        );
        await dismissRestoreNotice(page);

        const darkToggle = page.locator(`button[title="${tt('switchDark')}"]`).first();
        await expect(darkToggle).toBeVisible();
        await darkToggle.click();

        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(page.locator(`button[title="${tt('switchLight')}"]`).first()).toBeVisible();

        const responseRail = page.locator('[data-testid="workspace-response-rail"]:visible').first();
        await expect(responseRail.getByTestId('workspace-model-output-card')).toBeVisible();
        await expect(responseRail.getByTestId('workspace-thoughts-card')).toBeVisible();

        const provenancePanel = visibleProvenancePanel(page);
        await expect(provenancePanel).toBeVisible();
        await expect(provenancePanel.getByTestId('provenance-summary')).toBeVisible();

        const desktopInsights = page.locator('[data-testid="workspace-insights-collapsible"]:visible').first();
        await desktopInsights.evaluate((element) => {
            if (element instanceof HTMLDetailsElement) {
                element.open = true;
            }
        });

        const contextWorkflow = page.locator('[data-testid="context-workflow-summary"]:visible').first();
        await expect(contextWorkflow).toBeVisible();
        await expect(contextWorkflow).toContainText(
            localizedMessageByKey('workspaceSnapshotImportedLog', 'ui-import-provenance-live-workspace.json', '1'),
        );

        await page.getByRole('button', { name: tt('composerToolbarAdvancedSettings') }).click();
        await expect(
            page
                .getByTestId('composer-advanced-settings-dialog')
                .getByRole('heading', { name: tt('composerAdvancedTitle') })
                .first(),
        ).toBeVisible();
    });

    test('viewer owner route keeps top rail compact while viewer expands structured output', async ({ page }) => {
        await page.setViewportSize({ width: 1536, height: 1100 });
        await openWorkspaceWithSnapshot(page, {
            history: [
                {
                    id: 'structured-owner-turn',
                    url: 'https://example.com/structured-owner-result.png',
                    prompt: 'Viewer owner structured output prompt',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 1710500000000,
                    status: 'success',
                    text: 'A rain-lit alley portrait with strong backlight and shallow depth of field.',
                    thoughts:
                        'Secondary reasoning stays preview-first in the top rail while the full inspection route lives in the viewer.',
                    structuredData: {
                        summary: 'A rain-lit alley portrait with strong backlight and shallow depth of field.',
                        sceneType: 'Night portrait',
                        primarySubjects: ['subject', 'alley signage'],
                        visualStyle: ['cinematic', 'portrait'],
                        colorPalette: ['teal', 'orange'],
                        compositionNotes: 'Centered subject with signage framing on both edges.',
                    },
                    metadata: {
                        structuredOutputMode: 'scene-brief',
                    },
                },
            ],
            stagedAssets: [
                {
                    id: 'structured-owner-stage',
                    url: 'https://example.com/structured-owner-result.png',
                    role: 'stage-source',
                    origin: 'history',
                    createdAt: 1710500001000,
                    sourceHistoryId: 'structured-owner-turn',
                    lineageAction: 'reopen',
                },
            ],
            workflowLogs: ['[12:00:00] Structured output workspace restored.'],
            queuedJobs: [],
            workspaceSession: {
                activeResult: {
                    text: 'A rain-lit alley portrait with strong backlight and shallow depth of field.',
                    thoughts:
                        'Secondary reasoning stays preview-first in the top rail while the full inspection route lives in the viewer.',
                    grounding: null,
                    metadata: {
                        structuredOutputMode: 'scene-brief',
                    },
                    structuredData: {
                        summary: 'A rain-lit alley portrait with strong backlight and shallow depth of field.',
                        sceneType: 'Night portrait',
                        primarySubjects: ['subject', 'alley signage'],
                        visualStyle: ['cinematic', 'portrait'],
                        colorPalette: ['teal', 'orange'],
                        compositionNotes: 'Centered subject with signage framing on both edges.',
                    },
                    sessionHints: null,
                    historyId: 'structured-owner-turn',
                },
                continuityGrounding: null,
                continuitySessionHints: null,
                provenanceMode: null,
                provenanceSourceHistoryId: null,
                conversationId: null,
                conversationBranchOriginId: null,
                conversationActiveSourceHistoryId: null,
                conversationTurnIds: [],
                source: 'history',
                sourceHistoryId: 'structured-owner-turn',
                updatedAt: 1710500002000,
            },
            branchState: {
                nameOverrides: {},
                continuationSourceByBranchOriginId: {},
            },
            conversationState: {
                byBranchOriginId: {},
            },
            viewState: {
                generatedImageUrls: ['https://example.com/structured-owner-result.png'],
                selectedImageIndex: 0,
                selectedHistoryId: 'structured-owner-turn',
            },
            composerState: {
                prompt: 'Viewer owner structured output prompt',
                aspectRatio: '1:1',
                imageSize: '1K',
                imageStyle: 'None',
                imageModel: 'gemini-3.1-flash-image-preview',
                batchSize: 1,
                outputFormat: 'images-and-text',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
                generationMode: 'Text to Image',
                structuredOutputMode: 'scene-brief',
            },
        });
        await dismissRestoreNoticeIfPresent(page);

        const responseRail = page.locator('[data-testid="workspace-response-rail"]:visible').first();
        await expect(responseRail).toBeVisible();
        await expect(responseRail.getByTestId('workspace-model-output-card')).toContainText(
            tt('workspaceViewerStructuredOutput'),
        );
        await expect(responseRail.getByTestId('workspace-model-output-card')).toContainText('Night portrait');
        await expect(responseRail.getByTestId('workspace-thoughts-card')).toBeVisible();

        await page
            .getByTestId('workspace-history-focus-state')
            .getByRole('img', { name: 'Viewer owner structured output prompt' })
            .click();

        const viewer = page.getByTestId('workspace-viewer-overlay');
        await expect(viewer).toBeVisible();
        await expect(viewer.getByTestId('workspace-viewer-structured-output-hint')).toContainText(
            tt('workspaceViewerStructuredOutputHint'),
        );
        await expect(viewer.getByTestId('workspace-viewer-prompt-value')).toContainText(
            'Viewer owner structured output prompt',
        );
        await expect(viewer.getByTestId('structured-output-display')).toContainText('Night portrait');
        await expect(viewer.getByTestId('structured-output-display')).toContainText(
            'Centered subject with signage framing on both edges.',
        );
        await expect(viewer.getByTestId('workspace-viewer-thoughts-details')).toBeVisible();

        await page.getByRole('button', { name: tt('workspaceViewerClose') }).click();
        await expect(page.getByTestId('workspace-viewer-overlay')).toHaveCount(0);
    });

    test('structured output prompt reuse updates the composer through append and replace actions', async ({ page }) => {
        await page.setViewportSize({ width: 1536, height: 1100 });
        await openWorkspaceWithSnapshot(page, {
            history: [
                {
                    id: 'structured-reuse-turn',
                    url: 'https://example.com/structured-reuse-result.png',
                    prompt: 'Base composer prompt',
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 1710600000000,
                    status: 'success',
                    text: 'Variation B keeps the silhouette cleaner.',
                    thoughts: 'Prompt reuse should flow from structured output back into the composer.',
                    structuredData: {
                        comparisonSummary: 'Variation B keeps the silhouette cleaner.',
                        recommendedNextMove:
                            'Keep Variation B as the base and borrow only the rear fog density from Variation C.',
                        testPrompts: [
                            'keep B framing, add 15% more rear haze',
                            'preserve B silhouette clarity, trial C color depth',
                        ],
                    },
                    metadata: {
                        structuredOutputMode: 'variation-compare',
                    },
                },
            ],
            stagedAssets: [
                {
                    id: 'structured-reuse-stage',
                    url: 'https://example.com/structured-reuse-result.png',
                    role: 'stage-source',
                    origin: 'history',
                    createdAt: 1710600001000,
                    sourceHistoryId: 'structured-reuse-turn',
                    lineageAction: 'reopen',
                },
            ],
            workflowLogs: ['[12:30:00] Structured output prompt reuse workspace restored.'],
            queuedJobs: [],
            workspaceSession: {
                activeResult: {
                    text: 'Variation B keeps the silhouette cleaner.',
                    thoughts: 'Prompt reuse should flow from structured output back into the composer.',
                    grounding: null,
                    metadata: {
                        structuredOutputMode: 'variation-compare',
                    },
                    structuredData: {
                        comparisonSummary: 'Variation B keeps the silhouette cleaner.',
                        recommendedNextMove:
                            'Keep Variation B as the base and borrow only the rear fog density from Variation C.',
                        testPrompts: [
                            'keep B framing, add 15% more rear haze',
                            'preserve B silhouette clarity, trial C color depth',
                        ],
                    },
                    sessionHints: null,
                    historyId: 'structured-reuse-turn',
                },
                continuityGrounding: null,
                continuitySessionHints: null,
                provenanceMode: null,
                provenanceSourceHistoryId: null,
                conversationId: null,
                conversationBranchOriginId: null,
                conversationActiveSourceHistoryId: null,
                conversationTurnIds: [],
                source: 'history',
                sourceHistoryId: 'structured-reuse-turn',
                updatedAt: 1710600002000,
            },
            branchState: {
                nameOverrides: {},
                continuationSourceByBranchOriginId: {},
            },
            conversationState: {
                byBranchOriginId: {},
            },
            viewState: {
                generatedImageUrls: ['https://example.com/structured-reuse-result.png'],
                selectedImageIndex: 0,
                selectedHistoryId: 'structured-reuse-turn',
            },
            composerState: {
                prompt: 'Base composer prompt',
                aspectRatio: '1:1',
                imageSize: '1K',
                imageStyle: 'None',
                imageModel: 'gemini-3.1-flash-image-preview',
                batchSize: 1,
                outputFormat: 'images-and-text',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
                generationMode: 'Text to Image',
                structuredOutputMode: 'variation-compare',
            },
        });
        await dismissRestoreNoticeIfPresent(page);

        const responseRail = page.locator('[data-testid="workspace-response-rail"]:visible').first();
        await expect(responseRail).toBeVisible();
        await expect(responseRail.getByTestId('structured-output-prompt-ready-hint')).toBeVisible();

        await responseRail.getByTestId('structured-output-append-prompt-testPrompts-0').click();
        await expect(composer(page)).toHaveValue('Base composer prompt\n\nkeep B framing, add 15% more rear haze');

        await responseRail.getByTestId('structured-output-replace-prompt-section-recommendedNextMove').click();
        await expect(composer(page)).toHaveValue(
            'Keep Variation B as the base and borrow only the rear fog density from Variation C.',
        );
    });

    test('provenance reuse updates the composer through append and replace actions', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            liveProvenanceSnapshotFilePath,
            'ui-import-provenance-live-workspace.json',
        );
        await dismissRestoreNotice(page);

        const provenancePanel = visibleProvenancePanel(page);
        const detailPanel = provenancePanel.getByTestId('provenance-detail');
        const visibleComposer = page.locator('textarea:visible').first();

        await clickFirstVisible(provenancePanel.getByTestId('provenance-source-0'));
        await clickSummary(detailPanel.getByTestId('provenance-compare-bundle-summary-0'));
        await clickSummary(detailPanel.getByTestId('provenance-compare-source-summary-1'));

        const initialPrompt = (await visibleComposer.inputValue()).trim();
        await detailPanel.getByTestId('provenance-detail-append-prompt').click();
        await expect(visibleComposer).toHaveValue(
            `${initialPrompt}\n${tt('groundingProvenanceReferenceCue', tt('groundingProvenanceReferenceSource', 'Taipei Skyline Images', 'example.com'))}`,
        );

        await detailPanel.getByTestId('provenance-detail-replace-prompt').click();
        await expect(visibleComposer).toHaveValue(
            tt('groundingProvenanceReferenceSource', 'Taipei Skyline Images', 'example.com'),
        );
    });

    test('session replay current source entry exposes direct source actions', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);

        await page
            .getByTestId('workspace-restore-notice')
            .getByRole('button', { name: tt('workspaceRestoreOpenLatest') })
            .click();

        const replayDialog = await openSessionReplay(page);
        await expect(replayDialog.getByTestId('session-replay-jump-source')).toBeVisible();
        await replayDialog.getByTestId('session-replay-jump-source').click();
        await expect(replayDialog.getByTestId('session-replay-stage-source-badge')).toContainText(
            localizedText('Current Stage Source'),
        );
        await expect(replayDialog.getByTestId('session-replay-source-open')).toBeVisible();
        await expect(replayDialog.getByTestId('session-replay-source-continue')).toHaveCount(0);
        await expect(replayDialog.getByTestId('session-replay-source-branch')).toHaveCount(0);
    });
});
