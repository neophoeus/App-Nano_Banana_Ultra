/** @vitest-environment jsdom */

import { createRoot, Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useWorkspaceViewerProvenanceState } from '../hooks/useWorkspaceViewerProvenanceState';
import { createImageSidecarMetadataState } from '../utils/imageSidecarMetadata';

type HookHandle = ReturnType<typeof useWorkspaceViewerProvenanceState>;

const dictionary: Record<string, string> = {
    composerVisibilityVisible: 'Visible',
    composerVisibilityHidden: 'Hidden',
    groundingProvenanceInsightActualOutput: 'Actual output',
    groundingProvenanceInsightGrounding: 'Grounding',
    groundingProvenanceInsightOutputFormat: 'Output format',
    groundingProvenanceInsightRequestedSize: 'Requested size',
    groundingProvenanceInsightReturnThoughts: 'Return thoughts',
    groundingProvenanceInsightTemperature: 'Temperature',
    groundingProvenanceInsightThinkingLevel: 'Thinking level',
    groundingProvenanceNoActiveSessionTurn: 'No active turn',
    groundingProvenanceNone: 'None',
    groundingProvenanceSelectionNone: 'Select a source',
    groundingProvenanceSummaryMode: 'Mode',
    groundingProvenanceSummarySourceTurn: 'Source turn',
    groundingProvenanceSummarySources: 'Sources',
    groundingProvenanceSummarySupportBundles: 'Support bundles',
    stageGroundingResultSummary: '{0} · Requested {1} · Actual {2}',
    workspaceInsightsContinuityChatTurns: '{0} chat turns',
    workspaceInsightsContinuityGroundingMetadata: 'grounding metadata',
    workspaceInsightsContinuityGroundingSupports: 'grounding supports',
    workspaceInsightsContinuityHistoryLinked: 'history-linked',
    workspaceInsightsContinuityOfficialChat: 'official chat',
    workspaceInsightsContinuityProvenanceInherited: 'inherited provenance',
    workspaceInsightsContinuityProvenanceLive: 'live provenance',
    workspaceInsightsContinuitySourceFollowUp: 'follow-up',
    workspaceInsightsContinuitySourceGenerated: 'generated',
    workspaceInsightsContinuitySourceHistory: 'history',
    workspaceInsightsContinuitySourceTurn: '{0} turn',
    workspaceInsightsContinuityThoughtSignature: 'thought signature',
    workspaceViewerMetadataLoading: 'Loading metadata',
    workspaceViewerMetadataUnavailable: 'Metadata unavailable',
    workspaceViewerModel: 'Model',
    workspaceViewerRatio: 'Ratio',
    workspaceViewerSize: 'Size',
    workspaceViewerStyle: 'Style',
};

const t = (key: string) => dictionary[key] || key;

describe('useWorkspaceViewerProvenanceState', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;

    const renderHook = ({
        selectedMetadata,
        currentViewedCompletedHistoryMetadata,
        currentViewedCompletedHistoryItem = {
            id: 'turn-1',
            prompt: 'History prompt',
            model: 'gemini-2.5-flash-image',
            savedFilename: 'turn-1.png',
        },
        viewSettings = {
            prompt: 'Composer prompt',
            aspectRatio: '1:1',
            size: '4K',
            style: 'None',
            model: 'gemini-2.5-flash-image',
            batchSize: 1,
            outputFormat: 'images-only',
            temperature: 0.3,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
        },
    }: {
        selectedMetadata: Record<string, unknown> | null;
        currentViewedCompletedHistoryMetadata: Record<string, unknown> | null;
        currentViewedCompletedHistoryItem?: Record<string, unknown> | null;
        viewSettings?: Record<string, unknown>;
    }) => {
        function TestComponent() {
            latestHook = useWorkspaceViewerProvenanceState({
                selectedResultText: null,
                selectedThoughts: null,
                selectedResultParts: null,
                selectedGrounding: null,
                selectedMetadata,
                selectedSessionHints: null,
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
                } as any,
                viewSettings: viewSettings as any,
                activeGroundingSelection: null,
                focusLinkedGroundingItems: false,
                getHistoryTurnById: () => null,
                getShortTurnId: () => 'turn-1',
                currentStageSourceHistoryId: null,
                setPrompt: (() => undefined) as any,
                showNotification: () => undefined,
                addLog: () => undefined,
                t,
                currentLanguage: 'en',
                renderHistoryTurnActionRow: () => null,
                setActiveGroundingSelection: (() => undefined) as any,
                setFocusLinkedGroundingItems: (() => undefined) as any,
                currentViewedCompletedHistoryItem: currentViewedCompletedHistoryItem as any,
                currentViewedCompletedHistoryMetadata,
                getStyleLabel: (style) => String(style),
                getModelLabel: (model) => `label:${String(model)}`,
            });

            return null;
        }

        flushSync(() => {
            root.render(<TestComponent />);
        });
    };

    const getMetadataValue = (label: string) =>
        latestHook?.viewerMetadataItems.find((item) => item.label === label)?.value;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestHook = null;
    });

    afterEach(() => {
        root.unmount();
        container.remove();
        latestHook = null;
    });

    it('keeps viewer metadata bound to persisted history sidecar values', () => {
        const persistedMetadata = {
            model: 'gemini-2.5-flash-image',
            style: 'Anime',
            aspectRatio: '16:9',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'disabled',
            includeThoughts: false,
            actualOutput: {
                width: 1024,
                height: 1024,
                mimeType: 'image/png',
            },
            filename: 'turn-1.png',
            timestamp: '2026-04-19T08:00:00.000Z',
        };

        renderHook({
            selectedMetadata: persistedMetadata,
            currentViewedCompletedHistoryMetadata: persistedMetadata,
        });

        expect(getMetadataValue('Size')).toBe('1K');
        expect(getMetadataValue('Temperature')).toBe('1.0');
        expect(getMetadataValue('Model')).toBe('label:gemini-2.5-flash-image');
        expect(latestHook?.viewerSettingsSnapshot?.imageSize).toBeUndefined();
    });

    it('surfaces loading labels instead of composer fallbacks while sidecar metadata is loading', () => {
        renderHook({
            selectedMetadata: createImageSidecarMetadataState('loading'),
            currentViewedCompletedHistoryMetadata: null,
        });

        expect(latestHook?.viewerMetadataStateMessage).toBe('Loading metadata');
        expect(getMetadataValue('Size')).toBe('Loading metadata');
        expect(getMetadataValue('Model')).toBe('Loading metadata');
    });

    it('renders metadata immediately for AI Studio mode history items without filename or timestamp', () => {
        const aiStudioMetadata = {
            model: 'gemini-3.1-flash-image',
            style: 'Anime',
            aspectRatio: '16:9',
            requestedImageSize: '2K',
            size: '2K',
            outputFormat: 'images-only',
            temperature: 0.8,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
        };

        renderHook({
            selectedMetadata: aiStudioMetadata,
            currentViewedCompletedHistoryMetadata: aiStudioMetadata,
            currentViewedCompletedHistoryItem: {
                id: 'turn-aistudio-1',
                prompt: 'AI Studio prompt',
                model: 'gemini-3.1-flash-image',
                savedFilename: 'turn-aistudio-1.png',
            },
        });

        expect(latestHook?.viewerMetadataStateMessage).toBeNull();
        expect(getMetadataValue('Size')).toBe('2K');
        expect(getMetadataValue('Ratio')).toBe('16:9');
        expect(getMetadataValue('Temperature')).toBe('0.8');
        expect(getMetadataValue('Model')).toBe('label:gemini-3.1-flash-image');
        expect(latestHook?.viewerSettingsSnapshot?.aspectRatio).toBe('16:9');
    });

    it('uses currentViewedCompletedHistoryMetadata when selectedMetadata is null', () => {
        const historyMetadata = {
            model: 'gemini-3.1-flash-image',
            style: 'Cinematic',
            aspectRatio: '4:3',
            requestedImageSize: '1K',
            size: '1K',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: false,
        };

        renderHook({
            selectedMetadata: null,
            currentViewedCompletedHistoryMetadata: historyMetadata,
            currentViewedCompletedHistoryItem: {
                id: 'turn-history-only',
                prompt: 'History prompt',
                model: 'gemini-3.1-flash-image',
                savedFilename: 'turn-history-only.png',
            },
        });

        expect(latestHook?.viewerMetadataStateMessage).toBeNull();
        expect(getMetadataValue('Size')).toBe('1K');
        expect(getMetadataValue('Ratio')).toBe('4:3');
        expect(getMetadataValue('Model')).toBe('label:gemini-3.1-flash-image');
    });
});
