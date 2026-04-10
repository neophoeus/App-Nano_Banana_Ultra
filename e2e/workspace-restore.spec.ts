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
            return tt('workflowCurrentStageSource');
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
const buildLayoutAlignmentSnapshot = (turnCount: number) => {
    const history = Array.from({ length: turnCount }, (_, index) => {
        const turnNumber = turnCount - index;

        return {
            id: `layout-turn-${turnNumber}`,
            url: `https://example.com/layout-turn-${turnNumber}.png`,
            prompt: `Layout turn ${turnNumber}`,
            aspectRatio: '1:1',
            size: '1K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1710600000000 + turnNumber * 1000,
            mode: 'Text to Image',
            executionMode: 'single-turn',
            status: 'success',
            text: `Layout turn ${turnNumber} text`,
            rootHistoryId: 'layout-turn-1',
            parentHistoryId: turnNumber > 1 ? `layout-turn-${turnNumber - 1}` : undefined,
            sourceHistoryId: turnNumber > 1 ? `layout-turn-${turnNumber - 1}` : undefined,
            lineageAction: turnNumber === 1 ? 'root' : 'continue',
            lineageDepth: turnNumber - 1,
        };
    });
    const newestTurn = history[0];

    return {
        history,
        stagedAssets: [
            {
                id: 'layout-stage-source',
                url: queuedImportedFixtureDataUrl,
                role: 'stage-source',
                origin: 'history',
                createdAt: newestTurn.createdAt,
                sourceHistoryId: newestTurn.id,
                lineageAction: 'reopen',
            },
        ],
        workflowLogs: ['[10:41:00] Layout alignment snapshot restored.'],
        workspaceSession: {
            activeResult: {
                text: newestTurn.text,
                thoughts: null,
                grounding: null,
                metadata: null,
                sessionHints: null,
                historyId: newestTurn.id,
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
            sourceHistoryId: newestTurn.id,
            updatedAt: newestTurn.createdAt,
        },
        branchState: {
            nameOverrides: {
                'layout-turn-1': 'Layout Branch',
            },
            continuationSourceByBranchOriginId: {
                'layout-turn-1': newestTurn.id,
            },
        },
        conversationState: {
            byBranchOriginId: {},
        },
        viewState: {
            generatedImageUrls: [queuedImportedFixtureDataUrl],
            selectedImageIndex: 0,
            selectedHistoryId: newestTurn.id,
        },
        composerState: {
            prompt: 'Layout alignment workspace',
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
            executionMode: 'single-turn',
        },
    };
};
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
        stickySendIntent: 'memory',
    },
};

const restoredBlockedMemoryIntentSnapshot = {
    ...restoredOfficialConversationSnapshot,
    composerState: {
        ...restoredOfficialConversationSnapshot.composerState,
        batchSize: 3,
        stickySendIntent: 'independent',
        executionMode: 'single-turn',
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
            hasInlinedResponses: true,
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
const visibleProvenancePanel = (scope: Page | Locator) =>
    scope
        .locator('[data-testid="provenance-panel-light"]:visible, [data-testid="provenance-panel-dark"]:visible')
        .first();
const visibleFilmstripCard = (page: Page) => page.locator('[data-testid^="history-card-"]:visible').first();
const visibleFilmstripStageSourceBadge = (page: Page) =>
    page.locator('[data-testid^="history-stage-source-"]:visible').first();
const stageTopRightChip = (
    page: Page,
    key: 'stage-source' | 'branch' | 'continuation-differs' | 'result-status',
) =>
    page
        .locator(
            `[data-testid="stage-top-right-chip-${key}"]:visible, [data-testid="stage-top-right-overflow-chip-${key}"]:visible`,
        )
        .first();
const followUpEditButton = (page: Page) =>
    page
        .getByTestId('composer-settings-panel')
        .getByRole('button', { name: new RegExp(escapeRegExp(tt('workspaceViewerFollowUpEdit'))) })
        .first();
const progressDetailThoughtEntry = (page: Page) =>
    page.locator('[data-testid^="workspace-progress-detail-thought-entry-"]:visible').first();
const activeBranchCard = (page: Page) =>
    page
        .locator(
            '[data-testid="workspace-versions-detail-modal"] [data-testid="active-branch-card"]:visible, [data-testid="active-branch-card"]:visible',
        )
        .first();
const lineageMap = (page: Page) =>
    page
        .locator(
            '[data-testid="workspace-versions-detail-modal"] [data-testid="lineage-map-card"]:visible, [data-testid="lineage-map-card"]:visible',
        )
        .first();
const firstLineageMapTurn = (page: Page) =>
    page
        .locator(
            '[data-testid="workspace-versions-detail-modal"] [data-testid^="lineage-map-turn-"]:visible, [data-testid^="lineage-map-turn-"]:visible',
        )
        .first();
const generateButton = (page: Page) => page.getByRole('button', { name: tt('generate') }).first();
const scopedTestId = (scope: Locator, testId: string) =>
    scope.locator(`[data-testid="${testId}"], [data-testid^="${testId}-"]`).first();
const isLocatorVisible = async (locator: Locator) => (await locator.count()) > 0 && (await locator.first().isVisible());

const openVersionsDetailModal = async (page: Page) => {
    const modal = page.getByTestId('workspace-versions-detail-modal');
    if (await isLocatorVisible(modal)) {
        return;
    }

    await page.locator('[data-testid="history-versions-open-details"]:visible').first().click({ force: true });
    await expect(page.getByTestId('workspace-versions-detail-modal')).toBeVisible();
};

const withVersionsDetailModal = async <T>(page: Page, callback: (modal: Locator) => Promise<T>) => {
    const modal = page.getByTestId('workspace-versions-detail-modal');
    const wasOpen = await isLocatorVisible(modal);

    if (!wasOpen) {
        await openVersionsDetailModal(page);
    }

    const result = await callback(page.getByTestId('workspace-versions-detail-modal'));

    if (!wasOpen) {
        await closeVersionsDetailModal(page);
    }

    return result;
};

const openSourcesDetailModal = async (page: Page) => {
    const modal = page.getByTestId('workspace-sources-detail-modal');
    if (await isLocatorVisible(modal)) {
        return;
    }

    await clickFirstVisible(page.getByTestId('workspace-sources-open-details'));
    await expect(page.getByTestId('workspace-sources-detail-modal')).toBeVisible();
};

const openResponseDetailModal = async (page: Page) => {
    const modal = page.getByTestId('workspace-response-detail-modal');
    if (await isLocatorVisible(modal)) {
        return;
    }

    await clickFirstVisible(page.getByTestId('workspace-response-open-details'));
    await expect(page.getByTestId('workspace-response-detail-modal')).toBeVisible();
};

const openProgressDetailModal = async (page: Page) => {
    const modal = page.getByTestId('workspace-progress-detail-modal');
    if (await isLocatorVisible(modal)) {
        return;
    }

    const progressButton = page.locator('[data-testid="workspace-progress-open-details"]:visible').first();
    await progressButton.scrollIntoViewIfNeeded();
    await progressButton.evaluate((element: HTMLElement) => element.click());
    await expect(page.getByTestId('workspace-progress-detail-modal')).toBeVisible();
};

const openQueuedBatchDetailModal = async (page: Page) => {
    const modal = page.getByTestId('workspace-queued-batch-detail-modal');
    if (await isLocatorVisible(modal)) {
        return;
    }

    const opener = page.getByTestId('composer-queue-status-button').first();
    await expect(opener).toBeVisible();
    await opener.click();
    await expect(modal).toBeVisible();
};

const closeVersionsDetailModal = async (page: Page) => {
    const modal = page.getByTestId('workspace-versions-detail-modal');
    if (!(await isLocatorVisible(modal))) {
        return;
    }

    await modal
        .getByRole('button', { name: tt('workspaceViewerClose') })
        .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByTestId('workspace-versions-detail-modal')).toHaveCount(0);
};

const closeSourcesDetailModal = async (page: Page) => {
    const modal = page.getByTestId('workspace-sources-detail-modal');
    if (!(await isLocatorVisible(modal))) {
        return;
    }

    await modal
        .getByRole('button', { name: tt('workspaceViewerClose') })
        .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByTestId('workspace-sources-detail-modal')).toHaveCount(0);
};

const closeProgressDetailModal = async (page: Page) => {
    const modal = page.getByTestId('workspace-progress-detail-modal');
    if (!(await isLocatorVisible(modal))) {
        return;
    }

    await modal
        .getByRole('button', { name: tt('workspaceViewerClose') })
        .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByTestId('workspace-progress-detail-modal')).toHaveCount(0);
};

const closeResponseDetailModal = async (page: Page) => {
    const modal = page.getByTestId('workspace-response-detail-modal');
    if (!(await isLocatorVisible(modal))) {
        return;
    }

    await modal
        .getByRole('button', { name: tt('workspaceViewerClose') })
        .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByTestId('workspace-response-detail-modal')).toHaveCount(0);
};

type WorkspaceDetailModalName = 'versions' | 'sources' | 'response' | 'progress' | 'queued-jobs';

const getVisibleWorkspaceDetailModal = async (page: Page): Promise<WorkspaceDetailModalName | null> => {
    if (await isLocatorVisible(page.getByTestId('workspace-progress-detail-modal'))) {
        return 'progress';
    }

    if (await isLocatorVisible(page.getByTestId('workspace-response-detail-modal'))) {
        return 'response';
    }

    if (await isLocatorVisible(page.getByTestId('workspace-sources-detail-modal'))) {
        return 'sources';
    }

    if (await isLocatorVisible(page.getByTestId('workspace-versions-detail-modal'))) {
        return 'versions';
    }

    if (await isLocatorVisible(page.getByTestId('workspace-queued-batch-detail-modal'))) {
        return 'queued-jobs';
    }

    return null;
};

const reopenWorkspaceDetailModal = async (page: Page, modalName: WorkspaceDetailModalName | null) => {
    switch (modalName) {
        case 'versions':
            await openVersionsDetailModal(page);
            return;
        case 'sources':
            await openSourcesDetailModal(page);
            return;
        case 'response':
            await openResponseDetailModal(page);
            return;
        case 'progress':
            await openProgressDetailModal(page);
            return;
        case 'queued-jobs':
            await openQueuedBatchDetailModal(page);
            return;
        default:
            return;
    }
};

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

const ensureDetailsExpanded = async (scope: Page | Locator, testId: string) => {
    const details = scope.getByTestId(testId).first();
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

const withProgressDetailModal = async <T>(page: Page, callback: (progressModal: Locator) => Promise<T>): Promise<T> => {
    const previouslyVisibleModal = await getVisibleWorkspaceDetailModal(page);
    const wasOpen = previouslyVisibleModal === 'progress';

    if (!wasOpen) {
        await openProgressDetailModal(page);
    }

    const result = await callback(page.getByTestId('workspace-progress-detail-modal'));

    if (!wasOpen) {
        await closeProgressDetailModal(page);
        await reopenWorkspaceDetailModal(page, previouslyVisibleModal);
    }

    return result;
};

const withSourcesDetailModal = async <T>(page: Page, callback: (sourcesModal: Locator) => Promise<T>): Promise<T> => {
    const modal = page.getByTestId('workspace-sources-detail-modal');
    const wasOpen = await isLocatorVisible(modal);

    if (!wasOpen) {
        await openSourcesDetailModal(page);
    }

    const result = await callback(page.getByTestId('workspace-sources-detail-modal'));

    if (!wasOpen) {
        await closeSourcesDetailModal(page);
    }

    return result;
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

    const embeddedGalleryCard = page.locator('[data-testid="workspace-gallery-card"]');
    if ((await embeddedGalleryCard.count()) > 0) {
        const embeddedGalleryEmptyState = page.locator('[data-testid="workspace-gallery-empty"]');
        if ((await embeddedGalleryEmptyState.count()) > 0) {
            await expect(embeddedGalleryEmptyState.first()).toBeVisible();
            return;
        }
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

const openFirstHistoryViewer = async (page: Page) => {
    const stageFrame = page.getByTestId('generated-image-stage-frame').first();
    await expect(stageFrame).toBeVisible();
    await stageFrame.locator('img').first().click({ force: true });
    await expect(page.getByTestId('workspace-viewer-overlay')).toBeVisible();
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
        actionLabel?: 'Reopen' | 'Continue' | 'Branch';
        branchLabel?: string;
        expectOpenAction?: boolean;
        expectContinueAction?: boolean;
        expectBranchAction?: boolean;
    },
) => {
    const followUpSourceSummary = options.actionLabel
        ? `${options.sourceLabel || tt('stageOriginHistory')} · ${localizedFollowUpAction(options.actionLabel)}`
        : options.sourceLabel || tt('stageOriginHistory');

    await expect(followUpEditButton(page)).toBeVisible();
    await expect(followUpEditButton(page)).toContainText(tt('workspaceViewerFollowUpEdit'));
    await expect(followUpEditButton(page)).toContainText(followUpSourceSummary);

    if (options.branchLabel) {
        await expect(stageTopRightChip(page, 'branch')).toContainText(options.branchLabel);
    }

    if (options.expectOpenAction || options.expectContinueAction) {
        await withVersionsDetailModal(page, async () => {
            if (options.expectOpenAction) {
                await expect(activeBranchCard(page).getByTestId('active-branch-open-latest')).toBeVisible();
            }
            if (options.expectContinueAction) {
                await expect(activeBranchCard(page).getByTestId('active-branch-continue-latest')).toBeVisible();
            }
        });
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
    await expect(visibleFilmstripStageSourceBadge(page)).toContainText(localizedText('Stage Source'));
    await openProgressDetailModal(page);
    await expect(page.getByTestId('workspace-progress-detail-modal')).toContainText(timelineText);
    await closeProgressDetailModal(page);
    await expect(page.getByTestId('global-log-stage-source-entry')).toHaveCount(0);
    await expect(page.getByTestId('global-log-stage-source-badge')).toHaveCount(0);
    await expect(page.getByTestId('global-log-minimized-source')).toHaveCount(0);
    await expect(page.getByTestId('global-log-source-open')).toHaveCount(0);
    await expect(page.getByTestId('global-health-summary').first()).toContainText(tt('statusPanelLocalApi'));
    await expect(page.getByTestId('global-health-summary').first()).toContainText(tt('statusPanelGeminiKey'));
};

const assertFilmstripChromeLocalized = async (page: Page) => {
    await expect(page.getByTestId('workspace-unified-history-title')).toContainText(
        tt('workspacePickerPromptHistoryTitle'),
    );
    await expect(page.getByTestId('workspace-unified-history-count')).toContainText(
        localizedTemplatePattern('workspaceInsightsItemsCount'),
    );
    await expect(page.getByTestId('workspace-unified-history-branches')).toContainText(
        localizedTemplatePattern('workspaceInsightsBranchesCount'),
    );
    await expect(page.getByTestId('workspace-unified-history-active-branch')).toContainText(
        tt('workspaceInsightsActiveBranch'),
    );
};

const assertViewerChromeLocalized = async (page: Page) => {
    const viewer = page.getByTestId('workspace-viewer-overlay');
    await expect(viewer).toBeVisible();
    await expect(viewer.getByTestId('workspace-viewer-close')).toBeVisible();
    await expect(viewer.getByTestId('workspace-viewer-prompt-label')).toContainText(tt('workspaceViewerPrompt'));
    await expect(viewer.getByTestId('workspace-viewer-session-hints-label')).toContainText(
        tt('workspaceViewerSessionHints'),
    );
    await expect(viewer.getByTestId('workspace-viewer-session-hints')).toContainText(
        tt('workspaceViewerSessionHintsEmpty'),
    );
};

const assertComposerChromeLocalized = async (page: Page) => {
    await openVersionsDetailModal(page);
    const versionsModal = page.getByTestId('workspace-versions-detail-modal');
    await expect(versionsModal.getByTestId('history-export-workspace')).toBeVisible();
    await expect(versionsModal.getByTestId('history-import-workspace')).toBeVisible();
    await closeVersionsDetailModal(page);

    const advancedToggle = page.getByRole('button', { name: tt('composerToolbarAdvancedSettings') }).first();
    const sendIntentToggle = page.getByTestId('composer-sticky-send-intent-toggle');
    const sendIntentInfoTrigger = page.getByTestId('composer-sticky-send-intent-info-trigger');
    const sendIntentInfoCard = page.getByTestId('composer-sticky-send-intent-info-card');
    const independentSendButton = page.getByTestId('composer-sticky-send-intent-independent');
    const memorySendButton = page.getByTestId('composer-sticky-send-intent-memory');

    await expect(advancedToggle).toBeVisible();
    await expect(page.getByRole('heading', { name: tt('composerPromptLabelIndependent') }).first()).toBeVisible();
    await expect(sendIntentToggle).toBeVisible();
    await expect(sendIntentToggle).toHaveAttribute('data-active-intent', 'independent');
    await expect(sendIntentToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('composer-sticky-send-intent-title')).toContainText(tt('composerSendIntentTitle'));
    await expect(sendIntentInfoTrigger).toBeVisible();
    await expect(sendIntentInfoCard).toHaveCount(0);
    await expect(independentSendButton).toContainText(tt('composerSendIntentIndependent'));
    await expect(memorySendButton).toContainText(tt('composerSendIntentMemory'));
    await expect(independentSendButton).toHaveAttribute('data-selected', 'true');
    await expect(memorySendButton).toHaveAttribute('data-selected', 'false');
    await expect(page.getByRole('button', { name: tt('workspaceViewerNewConversation') })).toHaveCount(0);
    await expect(page.getByRole('button', { name: tt('composerQueueBatchJob') })).toBeVisible();

    await sendIntentInfoTrigger.click();

    await expect(sendIntentInfoCard).toContainText(tt('composerSendIntentHelperIndependent'));

    await page.keyboard.press('Escape');

    await expect(sendIntentInfoCard).toHaveCount(0);

    await advancedToggle.click();

    await expect(page.getByRole('heading', { name: tt('composerAdvancedTitle') }).first()).toBeVisible();
};

const dismissRestoreNotice = async (page: Page) => {
    await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
    await ensureWorkspaceInsightsExpanded(page);
};

const dismissRestoreNoticeIfPresent = async (page: Page) => {
    await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
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
    await expect(page.getByTestId('branch-rename-dialog')).toHaveCount(0);
};

const assertBranchLabelPropagates = async (page: Page, branchLabel: string) => {
    await expect(stageTopRightChip(page, 'branch')).toContainText(branchLabel);
    await expect(page.getByTestId('workspace-unified-history-active-branch')).toContainText(branchLabel);
    await withVersionsDetailModal(page, async () => {
        await expect(activeBranchCard(page)).toContainText(branchLabel);
    });
};

const assertBranchLabelCleared = async (page: Page, branchLabel: string) => {
    await expect(stageTopRightChip(page, 'branch')).not.toContainText(branchLabel);
    await expect(page.getByTestId('workspace-unified-history-active-branch')).not.toContainText(branchLabel);
    await withVersionsDetailModal(page, async () => {
        await expect(activeBranchCard(page)).not.toContainText(branchLabel);
    });
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
    await withSourcesDetailModal(page, async (sourcesModal) => {
        const panel = visibleProvenancePanel(sourcesModal);
        const summary = scopedTestId(panel, 'provenance-summary');

        await expect(scopedTestId(summary, 'provenance-summary-mode')).toContainText(
            options.mode === 'Inherited' ? tt('groundingProvenanceModeInherited') : tt('groundingProvenanceModeLive'),
        );
        await expect(scopedTestId(summary, 'provenance-summary-source-turn')).toContainText(options.sourceTurn);
        await expect(scopedTestId(summary, 'provenance-summary-sources')).toContainText(options.sources);
        await expect(scopedTestId(summary, 'provenance-summary-support-bundles')).toContainText(options.supportBundles);
        if (options.sourcePrompt) {
            await expect(scopedTestId(panel, 'provenance-source-card')).toContainText(options.sourcePrompt);
        }
        if (options.expectSourceRouteOnly) {
            await clickFirstVisible(scopedTestId(panel, 'provenance-source-details'));
            await expect(scopedTestId(panel, 'provenance-source-open')).toBeVisible();
            await expect(scopedTestId(panel, 'provenance-source-continue')).toHaveCount(0);
            await expect(scopedTestId(panel, 'provenance-source-branch')).toHaveCount(0);
        }
        for (const text of options.summaryTexts || []) {
            await expect(panel).toContainText(localizedText(text));
        }
        for (const text of options.visibleTexts) {
            await expect(panel).toContainText(localizedText(text));
        }
    });
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
    await withSourcesDetailModal(page, async (sourcesModal) => {
        const panel = visibleProvenancePanel(sourcesModal);
        const overview = scopedTestId(panel, 'provenance-attribution-overview');

        await expect(overview).toContainText(tt('groundingPanelAttributionOverview'));
        await expect(scopedTestId(overview, 'provenance-attribution-coverage')).toContainText(options.coverageValue);
        await expect(scopedTestId(overview, 'provenance-attribution-source-mix')).toContainText(options.sourceMixValue);
        await expect(scopedTestId(overview, 'provenance-attribution-queries')).toContainText(options.queriesValue);
        await expect(scopedTestId(overview, 'provenance-attribution-entry-point')).toContainText(
            options.entryPointValue,
        );
        await expect(scopedTestId(panel, 'provenance-status-source-status')).toContainText(options.sourceStatusValue);
        await expect(scopedTestId(panel, 'provenance-status-grounding-status')).toContainText(options.groundingStatus);
        await expect(scopedTestId(panel, 'provenance-status-support-status')).toContainText(options.supportStatus);
        await expect(scopedTestId(panel, 'provenance-status-entry-point-status')).toContainText(
            options.entryPointStatus,
        );
        await expect(scopedTestId(panel, 'provenance-source-0-status')).toContainText(
            tt('groundingPanelSourceStatusCited'),
        );
        await expect(scopedTestId(panel, 'provenance-source-1-status')).toContainText(
            tt('groundingPanelSourceStatusRetrievedOnly'),
        );

        if (options.uncitedSourceTitle) {
            await expect(scopedTestId(panel, 'provenance-uncited-source-1')).toContainText(options.uncitedSourceTitle);
            await expect(scopedTestId(panel, 'provenance-uncited-source-1')).toContainText(
                tt('groundingPanelUncitedSourcesHint'),
            );
        }
    });
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
    await assertCurrentStageSourceCard(page, {
        sourceLabel: tt('stageOriginHistory'),
        actionLabel: 'Continue',
        branchLabel: options.branchLabel,
    });

    await expect(page.getByTestId('composer-sticky-send-intent-toggle')).toHaveAttribute('data-active-intent', 'memory');
    await expect(page.getByTestId('composer-sticky-send-intent-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('composer-sticky-send-intent-memory')).toHaveAttribute('data-selected', 'true');
    await expect(
        page.getByTestId('composer-settings-panel').getByRole('heading', { name: tt('composerPromptLabelMemory') }).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: tt('workspaceViewerNewConversation') })).toBeVisible();

    await withVersionsDetailModal(page, async () => {
        await expect(activeBranchCard(page)).toContainText(options.branchLabel);
        await expect(activeBranchCard(page)).toContainText(
            `${localizedText('Continuation source ')}${options.activeSourceShortId}`,
        );
        await expect(activeBranchCard(page)).toContainText(options.prompt);
    });

    if (options.expectStageBadge) {
        await expect(stageTopRightChip(page, 'stage-source')).toBeVisible();
        await expect(visibleFilmstripStageSourceBadge(page)).toContainText(localizedText('Stage Source'));
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
    await page.unroute('**/api/batches/get');

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
        const requestedName = typeof payload?.name === 'string' ? payload.name : null;
        const job = requestedName ? jobByName.get(requestedName) : undefined;

        if (!job) {
            await route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: requestedName
                        ? `Missing queued batch fixture for ${requestedName}.`
                        : 'Missing batch job name.',
                }),
            });
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
    await installQueuedBatchGetFixtureRoute(page, snapshot);
    await page.addInitScript((nextSnapshot) => {
        localStorage.clear();
        localStorage.setItem('nbu_workspaceSnapshot', JSON.stringify(nextSnapshot));
    }, snapshot);
    await page.goto('/');
    await expect(composer(page)).toBeVisible();
    await setWorkspaceLanguage(page, TEST_LANGUAGE);
};

const openWorkspaceWithSnapshotQuotaFailure = async (page: Page, snapshot: Record<string, unknown>) => {
    await installQueuedBatchGetFixtureRoute(page, snapshot);
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
    await expect(page.getByTestId('shared-controls-toggle')).toBeVisible();
    await expect(page.getByTestId('shared-controls-panel')).toBeVisible();
};

const openEditorFromUpload = async (page: Page, promptValue: string) => {
    await composer(page).fill(promptValue);
    await page.locator('#global-upload-input').setInputFiles(editorSharedContextFixturePath);
    await expect(page.getByTestId('image-editor')).toBeVisible();
    await openSharedControlsFromSurface(page);
    await page.getByTestId('shared-control-prompt').click();
    await expect(page.getByTestId('shared-prompt-input')).toHaveValue('');
};

const closeSharedPromptSheet = async (page: Page) => {
    await page.getByTestId('picker-sheet-close').click();
    await expect(page.getByTestId('shared-prompt-input')).toHaveCount(0);
};

const expectAdvancedSettingsDialogVisible = async (page: Page) => {
    const dialog = page.getByTestId('composer-advanced-settings-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: tt('composerAdvancedTitle') }).first()).toBeVisible();
    await expect(dialog.getByTestId('composer-advanced-output-format')).toBeVisible();
    await expect(dialog.getByTestId('composer-advanced-temperature-input')).toBeVisible();
    await expect(dialog.getByTestId('composer-advanced-settings-apply')).toBeVisible();
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

const assertShellChromePinnedToViewport = async (page: Page) => {
    await expect(page.getByTestId('workspace-top-header-bar')).toBeVisible();
    await expect(page.getByTestId('workspace-bottom-footer-bar')).toBeVisible();

    const shellChromeMetrics = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="workspace-top-header"]');
        const headerBar = document.querySelector('[data-testid="workspace-top-header-bar"]');
        const footer = document.querySelector('[data-testid="workspace-bottom-footer"]');
        const footerBar = document.querySelector('[data-testid="workspace-bottom-footer-bar"]');

        if (
            !(header instanceof HTMLElement) ||
            !(headerBar instanceof HTMLElement) ||
            !(footer instanceof HTMLElement) ||
            !(footerBar instanceof HTMLElement)
        ) {
            return null;
        }

        const headerStyle = window.getComputedStyle(header);
        const footerStyle = window.getComputedStyle(footer);
        const headerRect = headerBar.getBoundingClientRect();
        const footerRect = footerBar.getBoundingClientRect();

        return {
            headerPosition: headerStyle.position,
            headerTop: headerStyle.top,
            headerDistanceFromViewportTop: Math.abs(headerRect.top),
            footerPosition: footerStyle.position,
            footerBottom: footerStyle.bottom,
            footerDistanceFromViewportBottom: Math.abs(window.innerHeight - footerRect.bottom),
        };
    });

    expect(shellChromeMetrics).not.toBeNull();
    expect(shellChromeMetrics?.headerPosition).toBe('fixed');
    expect(shellChromeMetrics?.headerTop).toBe('0px');
    expect(shellChromeMetrics?.headerDistanceFromViewportTop).toBeLessThanOrEqual(1);
    expect(shellChromeMetrics?.footerPosition).toBe('fixed');
    expect(shellChromeMetrics?.footerBottom).toBe('0px');
    expect(shellChromeMetrics?.footerDistanceFromViewportBottom).toBeLessThanOrEqual(1);
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
    await expect(page.getByTestId('workspace-import-review')).toHaveCount(0);
    await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
    await expect(page.getByText(tt('workspaceRestoreTitle'))).toBeVisible();
};

const openFirstHistoryRenameDialog = async (page: Page) => {
    await openVersionsDetailModal(page);
    await activeBranchCard(page)
        .getByRole('button', { name: tt('historyActionRename') })
        .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByTestId('branch-rename-dialog')).toBeVisible();
    return page.getByTestId('branch-rename-dialog').locator('form').first();
};

test.describe('workspace restore flows', () => {
    const repairedHistoryPreviewPattern =
        /^(data:image\/jpeg;base64,|\/api\/load-image\?filename=(?:gemini-3\.1-flash-image-preview-history-thumb_.+\.jpg|file-backed-turn-thumbnail\.jpg)$)/;

    test('editor floating shared controls show compact settings summary and button-only actions', async ({ page }) => {
        await openFreshWorkspace(page);
        await composer(page).fill(editorSharedControlsPrompt);
        await page.locator('#global-upload-input').setInputFiles(editorSharedContextFixturePath);

        await expect(page.getByTestId('image-editor')).toBeVisible();
        await openSharedControlsFromSurface(page);
        await expect(page.getByTestId('shared-controls-toggle')).toContainText(
            tt('surfaceSharedControlsSettingsTitle'),
        );
        await expect(page.getByTestId('shared-controls-toggle')).toContainText(tt('promptLabel'));
        await expect(page.getByTestId('shared-controls-toggle')).toContainText(tt('workspaceSurfacePromptEmpty'));
        await expect(page.getByTestId('shared-controls-panel')).not.toContainText(
            tt('surfaceSharedControlsStateDescEditor', tt('editorTitle')),
        );
        await expect(page.getByTestId('shared-controls-panel')).not.toContainText(
            tt('surfaceSharedControlsCurrentPrompt'),
        );
        await expect(page.getByTestId('shared-controls-panel')).not.toContainText(tt('surfaceSharedControlsWorkspace'));
        await expect(page.getByTestId('shared-control-prompt')).toBeVisible();
        await expect(page.getByTestId('shared-control-settings')).toBeVisible();
        await expect(page.getByTestId('shared-control-advanced-settings')).toBeVisible();
        await expect(page.getByTestId('shared-control-prompt')).toBeVisible();
        await expect(page.getByTestId('shared-control-references')).toBeVisible();
    });

    test('sketchpad floating shared controls expose only model and ratio actions', async ({ page }) => {
        await openFreshWorkspace(page);
        await composer(page).fill(sketchSharedControlsPrompt);
        await page.locator('[data-testid="side-tools-open-sketchpad"]:visible').click();

        await expect(page.getByTestId('sketchpad')).toBeVisible();
        await openSharedControlsFromSurface(page);
        await expect(page.getByTestId('shared-controls-toggle')).toContainText(
            tt('surfaceSharedControlsSettingsTitle'),
        );
        await expect(page.getByTestId('shared-control-model')).toBeVisible();
        await expect(page.getByTestId('shared-control-ratio')).toBeVisible();
        await expect(page.getByTestId('shared-control-prompt')).toHaveCount(0);
        await expect(page.getByTestId('shared-control-settings')).toHaveCount(0);
        await expect(page.getByTestId('shared-control-advanced-settings')).toHaveCount(0);
        await expect(page.getByTestId('shared-control-references')).toHaveCount(0);

        await page.getByTestId('shared-control-model').click();
        await expect(page.getByRole('heading', { name: tt('workspaceSheetTitleModel') })).toBeVisible();
        await page.getByTestId('picker-sheet-close').click();

        await openSharedControlsFromSurface(page);
        await page.getByTestId('shared-control-ratio').click();
        await expect(page.getByRole('heading', { name: tt('workspaceSheetTitleRatio') })).toBeVisible();
        await page.getByTestId('picker-sheet-close').click();
        await page.getByTestId('sketchpad-close').click();

        await expect(page.getByTestId('sketchpad')).toHaveCount(0);
        await expect(composer(page)).toHaveValue(sketchSharedControlsPrompt);
    });

    test('editor shared controls can open advanced settings as the dedicated modal', async ({ page }) => {
        await openFreshWorkspace(page);
        await openEditorFromUpload(page, 'Editor advanced settings prompt');
        await closeSharedPromptSheet(page);

        await page
            .getByTestId('shared-control-advanced-settings')
            .evaluate((button: HTMLButtonElement) => button.click());

        const dialog = await expectAdvancedSettingsDialogVisible(page);
        await expect(dialog.getByTestId('composer-advanced-grounding-mode-select')).toBeVisible();
        await expect(dialog.getByTestId('composer-advanced-grounding-guide')).toBeVisible();

        await dialog
            .getByTestId('composer-advanced-settings-close')
            .evaluate((button: HTMLButtonElement) => button.click());
        await expect(page.getByTestId('composer-advanced-settings-dialog')).toHaveCount(0);
        await expect(page.getByTestId('image-editor')).toBeVisible();
        await expect(composer(page)).toHaveValue('Editor advanced settings prompt');
    });

    test('sketch shared controls keep advanced settings unavailable', async ({ page }) => {
        await openFreshWorkspace(page);
        await composer(page).fill('Sketch advanced settings prompt');
        await page.locator('[data-testid="side-tools-open-sketchpad"]:visible').click();

        await expect(page.getByTestId('sketchpad')).toBeVisible();
        await openSharedControlsFromSurface(page);
        await expect(page.getByTestId('shared-control-advanced-settings')).toHaveCount(0);
        await expect(page.getByTestId('sketchpad')).toBeVisible();
        await expect(composer(page)).toHaveValue('Sketch advanced settings prompt');
    });

    test('editor shared controls advanced settings close discards draft changes and reopening shows committed values', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await openEditorFromUpload(page, 'Editor advanced settings persistence prompt');
        await closeSharedPromptSheet(page);

        const composerStateBeforeOpen = await page.evaluate(() => {
            const raw = localStorage.getItem('nbu_workspaceSnapshot');
            return raw ? JSON.parse(raw).composerState : null;
        });

        await page
            .getByTestId('shared-control-advanced-settings')
            .evaluate((button: HTMLButtonElement) => button.click());

        const firstDialog = await expectAdvancedSettingsDialogVisible(page);
        await firstDialog.getByTestId('composer-advanced-output-format').selectOption('images-and-text');
        await firstDialog.getByTestId('composer-advanced-temperature-input').fill('1.4');
        await expect(firstDialog.getByTestId('composer-advanced-output-format')).toHaveValue('images-and-text');
        await expect(firstDialog.getByTestId('composer-advanced-temperature-input')).toHaveValue('1.4');

        await firstDialog
            .getByTestId('composer-advanced-settings-close')
            .evaluate((button: HTMLButtonElement) => button.click());
        await expect(page.getByTestId('composer-advanced-settings-dialog')).toHaveCount(0);

        const persistedComposerStateAfterClose = await page.evaluate(() => {
            const raw = localStorage.getItem('nbu_workspaceSnapshot');
            return raw ? JSON.parse(raw).composerState : null;
        });

        expect(persistedComposerStateAfterClose).toEqual(composerStateBeforeOpen);

        await openSharedControlsFromSurface(page);
        await page
            .getByTestId('shared-control-advanced-settings')
            .evaluate((button: HTMLButtonElement) => button.click());

        const secondDialog = await expectAdvancedSettingsDialogVisible(page);
        await expect(secondDialog.getByTestId('composer-advanced-output-format')).toHaveValue(
            composerStateBeforeOpen?.outputFormat || 'images-only',
        );
        await expect(secondDialog.getByTestId('composer-advanced-temperature-input')).toHaveValue(
            String(composerStateBeforeOpen?.temperature ?? 1),
        );

        await secondDialog
            .getByTestId('composer-advanced-settings-close')
            .evaluate((button: HTMLButtonElement) => button.click());
        await expect(page.getByTestId('composer-advanced-settings-dialog')).toHaveCount(0);
        await expect(page.getByTestId('image-editor')).toBeVisible();
        await expect(composer(page)).toHaveValue('Editor advanced settings persistence prompt');
    });

    test('editor prompt close discards draft changes and keeps shared composer context intact', async ({ page }) => {
        await openFreshWorkspace(page);
        await openEditorFromUpload(page, 'Shared prompt from main composer');

        await page.getByTestId('shared-prompt-input').fill('Updated prompt from editor');
        await closeSharedPromptSheet(page);
        await openSharedControlsFromSurface(page);
        await page.getByTestId('shared-control-prompt').click();
        await expect(page.getByTestId('shared-prompt-input')).toHaveValue('');
        await closeSharedPromptSheet(page);
        await page.getByTestId('editor-close').click();

        await expect(page.getByTestId('image-editor')).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Shared prompt from main composer');

        await expect(page.locator('[data-testid="side-tools-upload-to-repaint"]:visible')).toContainText(
            tt('workspaceSideToolUploadToRepaint'),
        );
        await page.locator('#global-upload-input').setInputFiles(editorSharedContextFixturePath);
        await expect(page.getByTestId('image-editor')).toBeVisible();
        await openSharedControlsFromSurface(page);
        await page.getByTestId('shared-control-prompt').click();
        await expect(page.getByTestId('shared-prompt-input')).toHaveValue('');
    });

    test('editor prompt apply keeps the committed prompt local to the editor', async ({ page }) => {
        await openFreshWorkspace(page);
        await openEditorFromUpload(page, 'Main composer prompt');

        await page.getByTestId('shared-prompt-input').fill('Applied editor prompt');
        await page.getByTestId('shared-prompt-apply').click();
        await expect(page.getByTestId('shared-prompt-input')).toHaveCount(0);

        await openSharedControlsFromSurface(page);
        await page.getByTestId('shared-control-prompt').click();
        await expect(page.getByTestId('shared-prompt-input')).toHaveValue('Applied editor prompt');
        await closeSharedPromptSheet(page);

        await page.getByTestId('editor-close').click();
        await expect(page.getByTestId('image-editor')).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Main composer prompt');
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

        const generationSettingsButton = page.getByTestId('composer-settings-button');
        await expect(generationSettingsButton).toBeVisible();
        await expect(generationSettingsButton).toContainText('Aspect Ratio: 21:9');
        await expect(generationSettingsButton).toContainText('Output Size: 4K');

        const composerStateBeforeOpen = await page.evaluate(() => {
            const raw = localStorage.getItem('nbu_workspaceSnapshot');
            return raw ? JSON.parse(raw).composerState : null;
        });

        await dismissRestoreNoticeIfPresent(page);
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
        await expect(page.getByTestId('workspace-unified-history-count')).toContainText(
            tt('workspaceInsightsItemsCount', '2'),
        );
        await expect(page.getByTestId('workspace-unified-history-branches')).toContainText(
            tt('workspaceInsightsBranchesCount', '2'),
        );
    });

    test('replace restores the imported workspace directly without an extra restore step', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);

        await expect(composer(page)).toHaveValue('Imported workspace prompt');
        await assertCurrentStageSourceCard(page, {
            sourceLabel: tt('stageOriginHistory'),
            branchLabel: 'Imported Branch',
        });
        await expect(visibleFilmstripStageSourceBadge(page)).toContainText(localizedText('Stage Source'));
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
        await expect(composer(page)).toHaveValue('Imported workspace prompt');
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
            composerValue: 'Imported workspace prompt',
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
        await expect(composer(page)).toHaveValue('Imported workspace prompt');
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
            composerValue: 'Imported workspace prompt',
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

    test('restored batch variants keep only one active source per branch after promotion', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page, variantSnapshotFilePath, 'ui-import-variant-workspace.json');

        const bravoVariantCard = page.locator('[data-testid="history-card-bravo-v2-turn"]:visible').first();
        const alphaVariantCard = page.locator('[data-testid="history-card-alpha-v1-turn"]:visible').first();

        await expect(stageTopRightChip(page, 'stage-source')).toBeVisible();
        await expect(bravoVariantCard.getByTestId('history-stage-source-bravo-v2-turn')).toBeVisible();

        await openVersionsDetailModal(page);
        await expect(bravoVariantCard.getByTestId('history-stage-source-bravo-v2-turn')).toBeVisible();
        await expect(alphaVariantCard.locator('[data-testid="history-stage-source-alpha-v1-turn"]')).toHaveCount(0);
        await expect(bravoVariantCard).not.toContainText(localizedText('Candidate'));
        await expect(alphaVariantCard).not.toContainText(localizedText('Candidate'));
        await expect(activeBranchCard(page)).toContainText(`${localizedText('Continuation source ')}--------`);
        await expect(page.locator('[data-testid="active-branch-continue-latest"]:visible').first()).toContainText(
            localizedText('Promote Variant'),
        );

        await page.locator('[data-testid="active-branch-continue-latest"]:visible').first().click();
        await closeVersionsDetailModal(page);

        await expect(
            page.getByText(localizedText('Variant promoted as the active continuation source.'), { exact: true }),
        ).toBeVisible();
        await expect(bravoVariantCard).toBeVisible();
        await expect(alphaVariantCard).toBeVisible();

        await openVersionsDetailModal(page);
        await expect(activeBranchCard(page)).toContainText(`${localizedText('Continuation source ')}bravo-v2`);
        await expect(page.locator('[data-testid="active-branch-continue-latest"]:visible').first()).toContainText(
            localizedText('Source Active'),
        );
        await closeVersionsDetailModal(page);

        await alphaVariantCard.click();
        await assertCurrentStageSourceCard(page, {
            sourceLabel: tt('stageOriginHistory'),
            actionLabel: 'Reopen',
        });
        await expect(alphaVariantCard.getByTestId('history-stage-source-alpha-v1-turn')).toBeVisible();
        await expect(alphaVariantCard.locator('[data-testid="history-continuation-source-alpha-v1-turn"]')).toHaveCount(
            0,
        );
        await expect(bravoVariantCard.locator('[data-testid="history-stage-source-bravo-v2-turn"]')).toHaveCount(0);
        await expect(bravoVariantCard.getByTestId('history-continuation-source-bravo-v2-turn')).toBeVisible();
        await expect(alphaVariantCard).toBeVisible();
        await expect(bravoVariantCard).toBeVisible();

        await openVersionsDetailModal(page);
        await expect(activeBranchCard(page)).toContainText(`${localizedText('Continuation source ')}bravo-v2`);
        await expect(page.locator('[data-testid="active-branch-continue-latest"]:visible').first()).toContainText(
            localizedText('Source Active'),
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
        await firstFilmstripCard.click();
        await openVersionsDetailModal(page);
        await page.locator('[data-testid="active-branch-continue-latest"]:visible').first().click();
        await closeVersionsDetailModal(page);

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported workspace prompt',
            followUpSource: 'Continue',
            toastKey: 'historySourceContinueNotice',
            timelineKey: 'historySourceContinueLog',
            branchLabel: 'Imported Branch',
        });
    });

    test('filmstrip chrome follows the active UI language for headings, summary, and utility actions', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await assertFilmstripChromeLocalized(page);

        await expect(page.getByTestId('history-versions-open-details')).toContainText(tt('workspaceInsightsVersions'));
        await expect(page.getByTestId('history-import-workspace')).toContainText(tt('composerToolbarImportWorkspace'));
        await expect(page.getByTestId('history-export-workspace')).toContainText(tt('composerToolbarExportWorkspace'));

        await openVersionsDetailModal(page);
        await expect(page.locator('[data-testid="active-branch-open-latest"]:visible').first()).toContainText(
            tt('historyActionOpenLatest'),
        );
        await expect(page.locator('[data-testid="active-branch-continue-latest"]:visible').first()).toContainText(
            tt('historyContinueFromTurn'),
        );
        await closeVersionsDetailModal(page);
    });

    test('filmstrip reopen preserves the composer while syncing stage-source surfaces and header hint', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);
        await composer(page).fill('Filmstrip branch draft');

        await visibleFilmstripCard(page).click();

        await assertStageSourceSurfaces(page, {
            composerValue: 'Filmstrip branch draft',
            followUpSource: 'Reopen',
            toastKey: 'historySourceReopenNotice',
            timelineKey: 'historySourceReopenLog',
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

        await openFirstHistoryViewer(page);
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

        await openVersionsDetailModal(page);
        await ensureDetailsExpanded(page, 'active-branch-switcher-section');
        await activeBranchCard(page).getByTestId('active-branch-switch-root-turn').click();
        await closeVersionsDetailModal(page);

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported workspace prompt',
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

        await openVersionsDetailModal(page);
        await expect(page.getByTestId('active-branch-open-origin')).toHaveCount(0);
        await expect(page.getByTestId('active-branch-branch-origin')).toHaveCount(0);

        await page.locator('[data-testid="active-branch-continue-latest"]:visible').first().click();
        await closeVersionsDetailModal(page);

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported workspace prompt',
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

        await openVersionsDetailModal(page);
        await expect(page.getByTestId('active-branch-open-origin')).toHaveCount(0);
        await expect(page.getByTestId('active-branch-branch-origin')).toHaveCount(0);

        await page.locator('[data-testid="active-branch-open-latest"]:visible').first().click();
        await closeVersionsDetailModal(page);

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported workspace prompt',
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

        await expect(composer(page)).toHaveValue('Imported workspace prompt');
        await assertCurrentStageSourceCard(page, {
            sourceLabel: tt('stageOriginHistory'),
            actionLabel: 'Reopen',
            branchLabel: 'Imported Branch',
            expectOpenAction: true,
        });
        await expect(visibleFilmstripStageSourceBadge(page)).toContainText(localizedText('Stage Source'));
    });

    test('lineage map open reopens the selected turn across source surfaces', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await openVersionsDetailModal(page);
        await ensureDetailsExpanded(page, 'lineage-map-card');
        await expect(firstLineageMapTurn(page).locator('[data-testid^="lineage-map-continue-"]')).toHaveCount(0);
        await expect(firstLineageMapTurn(page).locator('[data-testid^="lineage-map-branch-"]')).toHaveCount(0);

        await firstLineageMapTurn(page).locator('[data-testid^="lineage-map-open-"]').click();
        await closeVersionsDetailModal(page);

        await assertStageSourceSurfaces(page, {
            composerValue: 'Imported workspace prompt',
            followUpSource: 'Reopen',
            toastMessage: 'History turn reopened as the current stage source.',
            timelineText: 'History turn reopened as current stage source',
            branchLabel: tt('historyBranchMain'),
        });
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
        await expect(page.getByTestId('workspace-unified-history-active-branch')).toContainText(
            tt('historyBranchNumber').replace('{0}', '1'),
        );
    });

    test('history surface keeps imported cards selection-only while versions owns branch controls', async ({
        page,
    }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await openGalleryPanel(page);
        const firstCard = page.locator('[data-testid^="history-card-"]').first();

        await expect(firstCard.locator('[data-testid^="history-open-"]')).toHaveCount(0);
        await expect(firstCard.locator('[data-testid^="history-rename-"]')).toHaveCount(0);
        await expect(firstCard.locator('[data-testid^="history-continue-"]')).toHaveCount(0);
        await expect(firstCard.locator('[data-testid^="history-branch-"]')).toHaveCount(0);

        await firstCard.click();
        await expect(page.getByTestId('selected-item-action-bar')).toHaveCount(0);
        await expect(page.getByTestId('workspace-unified-history-utility-actions')).toBeVisible();

        await openVersionsDetailModal(page);
        await expect(page.locator('[data-testid="active-branch-open-latest"]:visible').first()).toBeVisible();
        await expect(page.locator('[data-testid="active-branch-continue-latest"]:visible').first()).toBeVisible();
        await expect(activeBranchCard(page).getByRole('button', { name: tt('historyActionRename') })).toBeVisible();
        await closeVersionsDetailModal(page);
    });

    test('export workspace triggers a JSON download', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await openVersionsDetailModal(page);
        const downloadPromise = page.waitForEvent('download');
        await page.locator('[data-testid="history-export-workspace"]:visible').first().click();
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

    test('workspace snapshot quota errors do not white-screen the app', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (error) => {
            pageErrors.push(error.message);
        });

        await openWorkspaceWithSnapshotQuotaFailure(page, restoredOfficialConversationSnapshot);

        await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toBeVisible();
        await expect(composer(page)).toHaveValue('Restored official conversation workspace');
        await assertOfficialConversationSummary(page, {
            branchLabel: 'Chat Branch',
            turnCount: tt('workspaceInsightsTurnsCount', '1'),
            conversationIdShort: 'chatconv',
            activeSourceShortId: 'chat-fol',
            prompt: 'Official chat follow-up turn',
            expectStageBadge: true,
        });
        expect(pageErrors).toEqual([]);
    });

    test('restored file-backed snapshots reload images through load-image links', async ({ page }) => {
        await page.route('**/api/load-image?filename=*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'image/png',
                body: Buffer.from(
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRWQAAAAASUVORK5CYII=',
                    'base64',
                ),
            });
        });

        await openWorkspaceWithSnapshot(page, restoredFileBackedSnapshot);
        await dismissRestoreNoticeIfPresent(page);

        await expect
            .poll(async () => {
                const raw = await page.evaluate(() => localStorage.getItem('nbu_workspaceSnapshot'));
                const snapshot = raw ? JSON.parse(raw) : null;

                return snapshot
                    ? {
                          historyUrl: snapshot.history?.[0]?.url || null,
                          stagedAssetUrl: snapshot.stagedAssets?.[0]?.url || null,
                          viewerUrl: snapshot.viewState?.generatedImageUrls?.[0] || null,
                      }
                    : null;
            })
            .toEqual(
                expect.objectContaining({
                    historyUrl: expect.stringMatching(repairedHistoryPreviewPattern),
                    stagedAssetUrl: '/api/load-image?filename=file-backed-turn.png',
                    viewerUrl: '/api/load-image?filename=file-backed-turn.png',
                }),
            );

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
            .locator('img')
            .first();

        await expect(restoredHistoryImage).toBeVisible();
        await expect(restoredHistoryImage).toHaveAttribute('src', repairedHistoryPreviewPattern);
        expect(requestedFilenames).toContain('file-backed-turn.png');

        await restoredPage.close();
    });

    test('desktop layout aligns the 40/60 workspace shell columns while keeping paginated history visible', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1520, height: 1200 });
        await openWorkspaceWithSnapshot(page, buildLayoutAlignmentSnapshot(12));
        await dismissRestoreNoticeIfPresent(page);

        const mainShell = page.getByTestId('workspace-main-shell');
        const stageColumn = page.getByTestId('workspace-stage-column');
        const workColumn = page.getByTestId('workspace-work-column');
        const historyColumn = page.getByTestId('workspace-history-column');
        const stageFrame = page.getByTestId('generated-image-stage-frame');
        const visibleHistoryCards = page.locator('[role="button"][data-testid^="history-card-"]:visible');

        await expect(mainShell).toBeVisible();
        await expect(stageColumn).toBeVisible();
        await expect(workColumn).toBeVisible();
        await expect(historyColumn).toBeVisible();
        await expect(stageFrame).toBeVisible();
        await expect(visibleHistoryCards).toHaveCount(6);

        const [stageColumnBox, workColumnBox] = await Promise.all([
            stageColumn.boundingBox(),
            workColumn.boundingBox(),
        ]);

        expect(stageColumnBox).not.toBeNull();
        expect(workColumnBox).not.toBeNull();
        expect(Math.abs((stageColumnBox?.height || 0) - (workColumnBox?.height || 0))).toBeLessThanOrEqual(2);
        expect((workColumnBox?.width || 0) - (stageColumnBox?.width || 0)).toBeGreaterThan(0);
    });

    test('queue batch submit from a file-backed restored stage keeps the browser payload file-backed', async ({
        page,
    }) => {
        let queuedBatchRequestBody: Record<string, unknown> | null = null;
        const fileBackedQueuedJob = {
            name: 'batches/file-backed-queued-job',
            displayName: 'File-backed queue job',
            state: 'JOB_STATE_PENDING',
            model: 'gemini-3.1-flash-image-preview',
            createTime: '2025-03-31T09:20:00.000Z',
            updateTime: '2025-03-31T09:20:00.000Z',
        };

        await page.route('**/api/batches/create', async (route) => {
            queuedBatchRequestBody = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    job: fileBackedQueuedJob,
                }),
            });
        });

        await openWorkspaceWithSnapshot(page, restoredFileBackedSnapshot);
        await dismissRestoreNoticeIfPresent(page);

        await page.route('**/api/batches/get', async (route) => {
            const payload = route.request().postDataJSON() as { name?: string } | null;
            if (payload?.name !== fileBackedQueuedJob.name) {
                await route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: `Missing queued batch fixture for ${payload?.name || 'unknown'}.` }),
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ job: fileBackedQueuedJob }),
            });
        });

        const queueBatchButton = page.getByRole('button', { name: tt('composerQueueBatchJob') }).first();
        await expect(queueBatchButton).toBeVisible();
        await queueBatchButton.click();

        await expect.poll(() => queuedBatchRequestBody).not.toBeNull();
        expect(queuedBatchRequestBody).toMatchObject({
            prompt: 'File-backed restore prompt',
            model: 'gemini-3.1-flash-image-preview',
            executionMode: 'queued-batch-job',
            requestCount: 1,
            editingInput: '/api/load-image?filename=file-backed-turn.png',
        });
        expect(String(queuedBatchRequestBody?.editingInput || '')).not.toContain('data:image/');

        await expect(page.getByText(tt('queuedBatchSubmittedNotice'), { exact: true })).toBeVisible();
        await openQueuedBatchDetailModal(page);
        await expect(
            page.getByTestId('workspace-queued-batch-detail-modal').getByTestId('queued-batch-panel'),
        ).toContainText('File-backed queue job');
    });

    test('editor queue batch submits explicit Editor Edit jobs and returns to the workspace', async ({ page }) => {
        let queuedBatchRequestBody: Record<string, unknown> | null = null;
        const editorQueuedJob = {
            name: 'batches/editor-queued-job',
            displayName: 'Editor queue job',
            state: 'JOB_STATE_PENDING',
            model: 'gemini-3.1-flash-image-preview',
            createTime: '2025-04-02T09:20:00.000Z',
            updateTime: '2025-04-02T09:20:00.000Z',
        };

        await page.route('**/api/batches/create', async (route) => {
            queuedBatchRequestBody = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    job: editorQueuedJob,
                }),
            });
        });

        await page.route('**/api/batches/get', async (route) => {
            const payload = route.request().postDataJSON() as { name?: string } | null;
            if (payload?.name !== editorQueuedJob.name) {
                await route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: `Missing queued batch fixture for ${payload?.name || 'unknown'}.` }),
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ job: editorQueuedJob }),
            });
        });

        await openFreshWorkspace(page);
        await openEditorFromUpload(page, 'Composer prompt stays outside editor');
        await closeSharedPromptSheet(page);
        await openSharedControlsFromSurface(page);

        const editorQueueButton = page.getByTestId('editor-queue-batch');
        await expect(editorQueueButton).toBeVisible();
        await editorQueueButton.click();

        await expect.poll(() => queuedBatchRequestBody).not.toBeNull();
        expect(queuedBatchRequestBody).toMatchObject({
            model: 'gemini-3.1-flash-image-preview',
            executionMode: 'queued-batch-job',
            requestCount: 1,
        });
        expect(String(queuedBatchRequestBody?.editingInput || '')).toMatch(/^data:image\/png;base64,/);
        expect(String(queuedBatchRequestBody?.editingInput || '')).not.toContain('/api/load-image?filename=');
        expect(String(queuedBatchRequestBody?.prompt || '')).toContain('Seamlessly inpaint the masked area');
        expect(String(queuedBatchRequestBody?.prompt || '')).not.toContain('Composer prompt stays outside editor');

        await expect(page.getByTestId('image-editor')).toHaveCount(0);
        await expect(composer(page)).toHaveValue('Composer prompt stays outside editor');
        await expect(page.getByText(tt('queuedBatchSubmittedNotice'), { exact: true })).toBeVisible();

        await openQueuedBatchDetailModal(page);
        const panel = page.getByTestId('workspace-queued-batch-detail-modal').getByTestId('queued-batch-panel');
        await expect(panel).toContainText('Editor queue job');
        await expect(panel).toContainText('Editor Edit');
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
        await openSourcesDetailModal(page);

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
        await openWorkspaceWithSnapshot(page, queuedBatchPanelSnapshot);
        await dismissRestoreNoticeIfPresent(page);
        await openQueuedBatchDetailModal(page);

        const queuedBatchModal = page.getByTestId('workspace-queued-batch-detail-modal');
        const panel = queuedBatchModal.getByTestId('queued-batch-panel');
        await expect(panel).toBeVisible();
        await expect(queuedBatchModal).toContainText(tt('queuedBatchJobsTitle'));
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

        await panel.getByTestId('queued-batch-job-job-imported-open').click();

        const historyCard = page.getByTestId('history-card-queued-imported-turn');
        if ((await historyCard.count()) === 0) {
            await openGalleryPanel(page);
        }
        await expect(historyCard).toBeVisible();
        await expect(historyCard.getByTestId('history-stage-source-queued-imported-turn')).toBeVisible();
        await expect(historyCard).not.toContainText(tt('workspaceImportReviewExecutionQueuedBatchJob'));
        await expect(historyCard).not.toContainText('#1/2');
        await expect(historyCard).not.toContainText(localizedText('Candidate'));
        const pickerSheetClose = page.getByTestId('picker-sheet-close');
        if (await isLocatorVisible(pickerSheetClose)) {
            await pickerSheetClose.click();
        }

        await panel.getByTestId('queued-batch-job-job-imported-open-latest').click();
        const latestHistoryCard = page.getByTestId('history-card-queued-imported-turn-2');
        if ((await latestHistoryCard.count()) === 0) {
            await openGalleryPanel(page);
        }
        await expect(latestHistoryCard).toBeVisible();
        await expect(latestHistoryCard.getByTestId('history-stage-source-queued-imported-turn-2')).toBeVisible();
        await expect
            .poll(() =>
                page.evaluate(() => {
                    const raw = localStorage.getItem('nbu_workspaceSnapshot');
                    if (!raw) {
                        return null;
                    }

                    const snapshot = JSON.parse(raw);
                    return snapshot.viewState?.selectedHistoryId ?? null;
                }),
            )
            .toBe('queued-imported-turn-2');

        await expect(panel.getByTestId('queued-batch-job-job-failed')).toContainText('Failed storyboard batch');
        await expect(panel.getByTestId('queued-batch-job-job-failed-state')).toContainText(
            tt('queuedBatchStateFailed'),
        );
        await expect(panel.getByTestId('queued-batch-job-job-failed')).toContainText('Upstream batch failed.');
        await expect(panel.getByTestId('queued-batch-job-job-failed')).toContainText(tt('queuedBatchTimelineClosed'));
    });

    test('versions detail keeps restore source routing on the owner surface', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(page);
        await dismissRestoreNotice(page);

        await openProgressDetailModal(page);
        await expect(page.getByTestId('workspace-progress-detail-modal').getByTestId('session-continuity-source-card')).toHaveCount(
            0,
        );
        await closeProgressDetailModal(page);

        await withVersionsDetailModal(page, async () => {
            await expect(activeBranchCard(page)).toContainText('Imported branch turn');
            await expect(activeBranchCard(page).getByTestId('active-branch-open-latest')).toBeVisible();
            await expect(activeBranchCard(page).getByTestId('active-branch-continue-latest')).toBeVisible();
        });
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
        await openResponseDetailModal(page);
        await expect(page.getByTestId('workspace-response-detail-modal')).toContainText(
            'Browser official conversation reply',
        );
        await closeResponseDetailModal(page);
        await assertOfficialConversationPostGenerateState(page, prompt);
    });

    test('startup restore preserves official conversation continuity without an extra restore action', async ({
        page,
    }) => {
        await openWorkspaceWithSnapshot(page, restoredOfficialConversationSnapshot);

        await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
        await expect(page.getByText(tt('workspaceRestoreTitle'))).toBeVisible();
        await expect(composer(page)).toHaveValue('Restored official conversation workspace');
        await assertCurrentStageSourceCard(page, {
            sourceLabel: tt('stageOriginHistory'),
            actionLabel: 'Continue',
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

    test('startup restore sends the official conversation payload on the next browser generate request', async ({
        page,
    }) => {
        const capturedBodies = await installOfficialConversationGenerateCaptureRoute(page);
        const prompt = 'Browser restored official continuation';

        await openWorkspaceWithSnapshot(page, restoredOfficialConversationSnapshot);

        await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
        await composer(page).fill(prompt);
        await generateButton(page).click();

        await expect.poll(() => capturedBodies.length).toBe(1);
        assertOfficialConversationGeneratePayload(capturedBodies[0], prompt);
        await openResponseDetailModal(page);
        await expect(page.getByTestId('workspace-response-detail-modal')).toContainText(
            'Browser official conversation reply',
        );
        await closeResponseDetailModal(page);
        await assertOfficialConversationPostGenerateState(page, prompt);
    });

    test('memory restore keeps the send-intent toggle and reset action aligned with the active state', async ({
        page,
    }) => {
        await openWorkspaceWithSnapshot(page, restoredOfficialConversationSnapshot);

        const sendIntentToggle = page.getByTestId('composer-sticky-send-intent-toggle');
        const sendIntentInfoCard = page.getByTestId('composer-sticky-send-intent-info-card');
        const independentSendButton = page.getByTestId('composer-sticky-send-intent-independent');
        const memorySendButton = page.getByTestId('composer-sticky-send-intent-memory');
        const newConversationButton = page.getByRole('button', { name: tt('workspaceViewerNewConversation') });

        await expect(page.getByTestId('workspace-restore-notice')).toHaveCount(0);
        await expect(sendIntentToggle).toHaveAttribute('data-active-intent', 'memory');
        await expect(sendIntentToggle).toHaveAttribute('aria-pressed', 'true');
        await expect(sendIntentInfoCard).toHaveCount(0);
        await expect(independentSendButton).toHaveAttribute('data-selected', 'false');
        await expect(memorySendButton).toHaveAttribute('data-selected', 'true');
        await expect(newConversationButton).toBeVisible();

        await sendIntentToggle.click();

        await expect(sendIntentToggle).toHaveAttribute('data-active-intent', 'independent');
        await expect(sendIntentToggle).toHaveAttribute('aria-pressed', 'false');
        await expect(sendIntentInfoCard).toContainText(tt('composerSendIntentHelperIndependent'));
        await expect(independentSendButton).toHaveAttribute('data-selected', 'true');
        await expect(memorySendButton).toHaveAttribute('data-selected', 'false');
        await expect(newConversationButton).toHaveCount(0);

        await sendIntentToggle.click();

        await expect(sendIntentToggle).toHaveAttribute('data-active-intent', 'memory');
        await expect(sendIntentToggle).toHaveAttribute('aria-pressed', 'true');
        await expect(sendIntentInfoCard).toContainText(tt('composerSendIntentHelperMemory'));
        await expect(independentSendButton).toHaveAttribute('data-selected', 'false');
        await expect(memorySendButton).toHaveAttribute('data-selected', 'true');
        await expect(newConversationButton).toBeVisible();
    });

    test('blocked whole-button toggle keeps independent active and opens the memory explanation card', async ({
        page,
    }) => {
        await openWorkspaceWithSnapshot(page, restoredBlockedMemoryIntentSnapshot);

        const sendIntentToggle = page.getByTestId('composer-sticky-send-intent-toggle');
        const sendIntentInfoCard = page.getByTestId('composer-sticky-send-intent-info-card');

        await expect(sendIntentToggle).toHaveAttribute('data-active-intent', 'independent');
        await expect(sendIntentToggle).toHaveAttribute('data-memory-available', 'false');
        await expect(page.getByRole('button', { name: tt('workspaceViewerNewConversation') })).toHaveCount(0);

        await sendIntentToggle.click();

        await expect(sendIntentToggle).toHaveAttribute('data-active-intent', 'independent');
        await expect(sendIntentInfoCard).toContainText(tt('composerSendIntentHelperMemory'));
        await expect(sendIntentInfoCard).toContainText(tt('composerSendIntentDisabledReason'));
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
        await openSourcesDetailModal(page);

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
        await openSourcesDetailModal(page);

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
        await openSourcesDetailModal(page);

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
        await openSourcesDetailModal(page);

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

    test('reload keeps persisted workflow logs surfaced in current work summary', async ({ page }) => {
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
        await openProgressDetailModal(page);
        await expect(page.getByTestId('workspace-progress-detail-modal')).toContainText('Reload log history loaded');
        await closeProgressDetailModal(page);
    });

    test('narrow shell owner routes keep image tools, advanced settings, and workflow log reachable after import', async ({
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

        const composerPanel = page.getByTestId('composer-settings-panel').first();
        await expect(composerPanel).toBeVisible();
        const sideTools = page.locator('[data-testid="workspace-side-tool-panel"]:visible').first();
        await expect(sideTools).toBeVisible();
        await expect(composerPanel.getByTestId('workspace-side-tool-panel')).toBeVisible();
        await expect(composerPanel.getByTestId('composer-style-strip')).toBeVisible();
        await expect(composerPanel.getByTestId('composer-style-button')).toContainText(tt('styleNone'));
        await expect(composerPanel.getByTestId('composer-style-clear')).toHaveCount(0);
        await expect(sideTools.getByTestId('workspace-side-tool-panel-disclosure')).toBeVisible();
        await sideTools.getByTestId('workspace-side-tool-panel-summary').click();
        await expect(sideTools.getByTestId('workspace-side-tools-actions')).toBeVisible();
        const referencesToggle = sideTools.getByTestId('workspace-side-tools-references-toggle');
        await expect(referencesToggle).toHaveAttribute('aria-expanded', 'false');
        await expect(sideTools.getByTestId('workspace-side-tool-references')).toHaveCount(0);
        await expect(sideTools.getByTestId('workspace-side-tools-references-summary-object')).toContainText(
            tt('workspacePickerObjects'),
        );
        await expect(sideTools.getByTestId('workspace-side-tools-references-summary-object')).toContainText(/\d+\/\d+/);
        await expect(sideTools.getByTestId('workspace-side-tools-references-summary-character')).toContainText(
            tt('workspacePickerCharacters'),
        );
        await expect(sideTools.getByTestId('workspace-side-tools-references-summary-character')).toContainText(
            /\d+\/\d+/,
        );
        await referencesToggle.click();
        await expect(referencesToggle).toHaveAttribute('aria-expanded', 'true');
        await expect(sideTools.getByTestId('workspace-side-tool-references')).toBeVisible();
        await expect(
            sideTools
                .locator('label')
                .filter({ hasText: tt('objectRefs') })
                .first(),
        ).toBeVisible();
        await expect(
            sideTools
                .locator('label')
                .filter({ hasText: tt('characterRefs') })
                .first(),
        ).toBeVisible();
        await expect(page.getByTestId('composer-reference-context-button')).toHaveCount(0);
        await page.keyboard.press('Escape');
        await expect(sideTools.getByTestId('workspace-side-tool-references')).toHaveCount(0);

        await sideTools.getByTestId('side-tools-open-sketchpad').click();
        await expect(page.getByText(tt('loadingPrepareSketchPad'), { exact: true })).toBeVisible();
        await expect(page.getByTestId('sketchpad')).toBeVisible();
        await page.getByTestId('sketchpad-close').click();
        await expect(page.getByTestId('sketchpad')).toHaveCount(0);

        await expect(composerPanel.getByTestId('composer-advanced-settings-disclosure')).toBeVisible();
        await composerPanel.getByTestId('composer-advanced-settings-disclosure-summary').click();
        await composerPanel.getByTestId('composer-advanced-settings-button').click();
        await expect(
            page
                .getByTestId('composer-advanced-settings-dialog')
                .getByRole('heading', { name: tt('composerAdvancedTitle') })
                .first(),
        ).toBeVisible();
        await page.getByTestId('composer-advanced-settings-close').click();
        await expect(page.getByTestId('composer-advanced-settings-dialog')).toHaveCount(0);

        const mobileInsights = page.locator('[data-testid="workspace-insights-collapsible"]:visible').first();
        await mobileInsights.evaluate((element) => {
            if (element instanceof HTMLDetailsElement) {
                element.open = true;
            }
        });
        await openProgressDetailModal(page);
        const progressModal = page.getByTestId('workspace-progress-detail-modal');
        await expect(progressModal.getByTestId('workspace-progress-workflow-summary')).toBeVisible();
        await expect(progressModal).toContainText(
            localizedMessageByKey('workspaceSnapshotImportedLog', 'ui-import-provenance-live-workspace.json', '1'),
        );
        await expect(progressModal.getByTestId('workspace-progress-detail-list')).toBeVisible();
        await closeProgressDetailModal(page);
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

        await assertShellChromePinnedToViewport(page);

        const composerPanel = page.getByTestId('composer-settings-panel').first();
        await expect(composerPanel).toBeVisible();
        await openResponseDetailModal(page);
        const responseRail = page
            .getByTestId('workspace-response-detail-modal')
            .locator('[data-testid="workspace-response-rail"]:visible')
            .first();
        await expect(responseRail).toBeVisible();
        await expect(responseRail.getByTestId('workspace-model-output-card')).toBeVisible();
        await expect(responseRail.getByTestId('workspace-response-text-card')).toBeVisible();
        await expect(responseRail.getByTestId('workspace-thoughts-card')).toHaveCount(0);
        await closeResponseDetailModal(page);

        const sideTools = page.locator('[data-testid="workspace-side-tool-panel"]:visible').first();
        await expect(sideTools).toBeVisible();
        await expect(composerPanel.getByTestId('workspace-side-tool-panel')).toBeVisible();

        await openSourcesDetailModal(page);
        const provenancePanel = visibleProvenancePanel(page.getByTestId('workspace-sources-detail-modal'));
        await expect(provenancePanel).toBeVisible();
        await expect(provenancePanel.getByTestId('provenance-summary')).toBeVisible();
        await closeSourcesDetailModal(page);

        const desktopInsights = page.locator('[data-testid="workspace-insights-collapsible"]:visible').first();
        await desktopInsights.evaluate((element) => {
            if (element instanceof HTMLDetailsElement) {
                element.open = true;
            }
        });
        await openProgressDetailModal(page);
        const progressModal = page.getByTestId('workspace-progress-detail-modal');
        await expect(progressModal.getByTestId('workspace-progress-workflow-summary')).toBeVisible();
        await expect(progressModal).toContainText(
            localizedMessageByKey('workspaceSnapshotImportedLog', 'ui-import-provenance-live-workspace.json', '1'),
        );
        await expect(progressModal.getByTestId('workspace-progress-detail-list')).toBeVisible();
        await expect(progressModal).toContainText(
            tt('groundingProvenanceThoughtNotRequested'),
        );
        await closeProgressDetailModal(page);
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

        await openResponseDetailModal(page);
        const responseRail = page
            .getByTestId('workspace-response-detail-modal')
            .locator('[data-testid="workspace-response-rail"]:visible')
            .first();
        await expect(responseRail.getByTestId('workspace-model-output-card')).toBeVisible();
        await expect(responseRail.getByTestId('workspace-thoughts-card')).toHaveCount(0);
        await closeResponseDetailModal(page);

        await openSourcesDetailModal(page);
        const provenancePanel = visibleProvenancePanel(page.getByTestId('workspace-sources-detail-modal'));
        await expect(provenancePanel).toBeVisible();
        await expect(provenancePanel.getByTestId('provenance-summary')).toBeVisible();
        await closeSourcesDetailModal(page);

        const desktopInsights = page.locator('[data-testid="workspace-insights-collapsible"]:visible').first();
        await desktopInsights.evaluate((element) => {
            if (element instanceof HTMLDetailsElement) {
                element.open = true;
            }
        });
        await openProgressDetailModal(page);
        const progressModal = page.getByTestId('workspace-progress-detail-modal');
        await expect(progressModal.getByTestId('workspace-progress-workflow-summary')).toBeVisible();
        await expect(progressModal).toContainText(
            localizedMessageByKey('workspaceSnapshotImportedLog', 'ui-import-provenance-live-workspace.json', '1'),
        );
        await expect(progressModal.getByTestId('workspace-progress-detail-list')).toBeVisible();
        await expect(progressModal).toContainText(
            tt('groundingProvenanceThoughtNotRequested'),
        );
        await closeProgressDetailModal(page);

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

        await openResponseDetailModal(page);
        const responseRail = page
            .getByTestId('workspace-response-detail-modal')
            .locator('[data-testid="workspace-response-rail"]:visible')
            .first();
        await expect(responseRail).toBeVisible();
        await expect(responseRail.getByTestId('workspace-model-output-card')).toContainText(
            tt('workspaceViewerStructuredOutput'),
        );
        await expect(responseRail.getByTestId('workspace-model-output-card')).toContainText('Night portrait');
        await expect(responseRail.getByTestId('workspace-thoughts-card')).toHaveCount(0);
        await closeResponseDetailModal(page);

        await ensureWorkspaceInsightsExpanded(page);
        await openProgressDetailModal(page);
        await expect(progressDetailThoughtEntry(page)).toBeVisible();
        await closeProgressDetailModal(page);

        await openFirstHistoryViewer(page);

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

        await viewer.getByTestId('workspace-viewer-close').click();
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

        await openResponseDetailModal(page);
        const responseRail = page
            .getByTestId('workspace-response-detail-modal')
            .locator('[data-testid="workspace-response-rail"]:visible')
            .first();
        await expect(responseRail).toBeVisible();
        await expect(responseRail.getByTestId('structured-output-prompt-ready-hint')).toBeVisible();

        await responseRail.getByTestId('structured-output-append-prompt-testPrompts-0').click();
        await expect(composer(page)).toHaveValue('Base composer prompt\n\nkeep B framing, add 15% more rear haze');

        await responseRail.getByTestId('structured-output-replace-prompt-section-recommendedNextMove').click();
        await expect(composer(page)).toHaveValue(
            'Keep Variation B as the base and borrow only the rear fog density from Variation C.',
        );
        await closeResponseDetailModal(page);
    });

    test('provenance reuse updates the composer through append and replace actions', async ({ page }) => {
        await openFreshWorkspace(page);
        await replaceWithImportedWorkspace(
            page,
            liveProvenanceSnapshotFilePath,
            'ui-import-provenance-live-workspace.json',
        );
        await dismissRestoreNotice(page);
        await openSourcesDetailModal(page);

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
});
