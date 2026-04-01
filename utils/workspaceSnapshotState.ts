import {
    ExecutionMode,
    GeneratedImage,
    GenerationSettings,
    OutputFormat,
    ThinkingLevel,
    WorkspaceComposerState,
    WorkspacePersistenceSnapshot,
} from '../types';
import { EMPTY_WORKSPACE_COMPOSER_STATE, sanitizeWorkspaceSnapshot } from './workspacePersistence';
import { inferExecutionModeFromHistoryItem } from './executionMode';
import { normalizeStructuredOutputMode } from './structuredOutputs';

export type AppliedWorkspaceSnapshotState = {
    snapshot: WorkspacePersistenceSnapshot;
    activeResult: WorkspacePersistenceSnapshot['workspaceSession']['activeResult'];
    displaySettings: GenerationSettings;
    selectedHistoryId: string | null;
    announceRestoreToast: boolean;
};

export const buildDisplaySettingsFromComposerState = (composerState: WorkspaceComposerState): GenerationSettings => ({
    prompt: composerState.prompt,
    aspectRatio: composerState.aspectRatio,
    size: composerState.imageSize,
    style: composerState.imageStyle,
    model: composerState.imageModel,
    batchSize: composerState.batchSize,
    outputFormat: composerState.outputFormat,
    structuredOutputMode: normalizeStructuredOutputMode(composerState.structuredOutputMode),
    temperature: composerState.temperature,
    thinkingLevel: composerState.thinkingLevel,
    includeThoughts: composerState.includeThoughts,
    googleSearch: composerState.googleSearch,
    imageSearch: composerState.imageSearch,
});

export const hasRestorableWorkspaceContent = (snapshot: WorkspacePersistenceSnapshot): boolean => {
    const normalized = sanitizeWorkspaceSnapshot(snapshot);

    return Boolean(
        normalized.history.length ||
        normalized.stagedAssets.length ||
        normalized.workflowLogs.length ||
        normalized.queuedJobs.length ||
        normalized.viewState.generatedImageUrls.length ||
        normalized.viewState.selectedHistoryId ||
        normalized.composerState.prompt.trim() ||
        normalized.workspaceSession.activeResult ||
        normalized.workspaceSession.sourceHistoryId ||
        normalized.workspaceSession.conversationId,
    );
};

export const shouldAnnounceRestoreToastForSnapshot = (snapshot: WorkspacePersistenceSnapshot): boolean =>
    hasRestorableWorkspaceContent(snapshot);

export const shouldShowRestoreNoticeForSnapshot = shouldAnnounceRestoreToastForSnapshot;

export const buildWorkspaceComposerStateFromHistoryItem = (item: GeneratedImage): WorkspaceComposerState => {
    const model = item.model || EMPTY_WORKSPACE_COMPOSER_STATE.imageModel;
    const requestedGoogleSearch =
        typeof item.sessionHints?.googleSearchRequested === 'boolean'
            ? item.sessionHints.googleSearchRequested
            : undefined;
    const requestedImageSearch =
        typeof item.sessionHints?.imageSearchRequested === 'boolean'
            ? item.sessionHints.imageSearchRequested
            : undefined;
    const groundingMode =
        typeof item.sessionHints?.groundingMode === 'string' ? item.sessionHints.groundingMode : undefined;
    const executionMode = inferExecutionModeFromHistoryItem(item);

    return {
        ...EMPTY_WORKSPACE_COMPOSER_STATE,
        prompt: item.prompt,
        aspectRatio: item.aspectRatio,
        imageSize: item.size,
        imageStyle: item.style,
        imageModel: model,
        batchSize: 1,
        outputFormat: (item.metadata?.outputFormat as OutputFormat) || 'images-only',
        structuredOutputMode: normalizeStructuredOutputMode(item.metadata?.structuredOutputMode),
        temperature: typeof item.metadata?.temperature === 'number' ? item.metadata.temperature : 1,
        thinkingLevel:
            (item.metadata?.thinkingLevel as ThinkingLevel) ||
            (model === 'gemini-3.1-flash-image-preview' ? 'minimal' : 'disabled'),
        includeThoughts: Boolean(item.metadata?.includeThoughts),
        googleSearch:
            requestedGoogleSearch ??
            (groundingMode === 'google-search' || groundingMode === 'google-search-plus-image-search'
                ? true
                : Boolean(
                      item.grounding?.enabled &&
                      (!item.grounding?.imageSearch || (item.grounding.webQueries?.length ?? 0) > 0),
                  )),
        imageSearch:
            requestedImageSearch ??
            (groundingMode === 'image-search' || groundingMode === 'google-search-plus-image-search'
                ? true
                : Boolean(item.grounding?.imageSearch)),
        generationMode: item.mode || 'Text to Image',
        executionMode,
    };
};

export const deriveAppliedWorkspaceSnapshotState = (
    incomingSnapshot: unknown,
    options?: { announceRestoreToast?: boolean; showRestoreNotice?: boolean },
): AppliedWorkspaceSnapshotState => {
    const snapshot = sanitizeWorkspaceSnapshot(incomingSnapshot);
    const activeResult = snapshot.workspaceSession.activeResult;

    return {
        snapshot,
        activeResult,
        displaySettings: buildDisplaySettingsFromComposerState(snapshot.composerState),
        selectedHistoryId: snapshot.viewState.selectedHistoryId || activeResult?.historyId || null,
        announceRestoreToast: Boolean(options?.announceRestoreToast ?? options?.showRestoreNotice),
    };
};
