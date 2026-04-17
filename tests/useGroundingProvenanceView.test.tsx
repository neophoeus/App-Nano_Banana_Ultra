/** @vitest-environment jsdom */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGroundingProvenanceView } from '../hooks/useGroundingProvenanceView';

type HookHandle = ReturnType<typeof useGroundingProvenanceView>;

const dictionary: Record<string, string> = {
    groundingProvenanceInsightOutputFormat: 'Output format',
    groundingProvenanceInsightTemperature: 'Temperature',
    groundingProvenanceInsightThinkingLevel: 'Thinking level',
    groundingProvenanceInsightReturnThoughts: 'Return thoughts',
    groundingProvenanceInsightGrounding: 'Grounding',
    groundingProvenanceInsightRequestedSize: 'Requested size',
    groundingProvenanceInsightActualOutput: 'Actual output',
    groundingProvenanceNone: 'None',
    groundingProvenanceNoActiveSessionTurn: 'None',
    groundingProvenanceSummaryMode: 'Mode',
    groundingProvenanceSummarySourceTurn: 'Source turn',
    groundingProvenanceSummarySources: 'Sources',
    groundingProvenanceSummarySupportBundles: 'Support bundles',
    groundingProvenanceSelectionNone: 'Select a source',
    groundingProvenanceReferenceCue: 'Reference cue: {0}',
    groundingProvenanceReuseDetail: 'Reuse detail',
    stageGroundingResultSummary: '{0} · Requested {1} · Actual {2}',
    workspaceInsightsContinuitySourceTurn: '{0} turn',
    workspaceInsightsContinuitySourceGenerated: 'generated',
    workspaceInsightsContinuitySourceHistory: 'history',
    workspaceInsightsContinuitySourceFollowUp: 'follow-up',
    workspaceInsightsContinuityHistoryLinked: 'history-linked',
    workspaceInsightsContinuityOfficialChat: 'official chat',
    workspaceInsightsContinuityChatTurns: '{0} chat turns',
    workspaceInsightsContinuityProvenanceInherited: 'inherited provenance',
    workspaceInsightsContinuityProvenanceLive: 'live provenance',
    workspaceInsightsContinuityThoughtSignature: 'thought signature',
    workspaceInsightsContinuityGroundingMetadata: 'grounding metadata',
    workspaceInsightsContinuityGroundingSupports: 'grounding supports',
};

const t = (key: string) => dictionary[key] || key;

describe('useGroundingProvenanceView', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;

    const renderHook = (
        selectedMetadata: Record<string, unknown> | null,
        selectedSessionHints: Record<string, unknown> | null,
        imageSize = '1K',
        workspaceSessionOverrides: Record<string, unknown> = {},
        selectedGrounding: any = null,
    ) => {
        function TestComponent() {
            latestHook = useGroundingProvenanceView({
                selectedResultText: null,
                selectedThoughts: null,
                selectedGrounding,
                selectedMetadata,
                selectedSessionHints,
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
                    ...workspaceSessionOverrides,
                } as any,
                viewSettings: {
                    prompt: 'Restored official conversation workspace',
                    aspectRatio: '1:1',
                    size: imageSize,
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    batchSize: 1,
                    outputFormat: 'images-only',
                    temperature: 1,
                    thinkingLevel: 'minimal',
                    includeThoughts: true,
                    googleSearch: false,
                    imageSearch: false,
                } as any,
                activeGroundingSelection: null,
                focusLinkedGroundingItems: false,
                getHistoryTurnById: () => null,
                getShortTurnId: () => 'none',
                currentStageSourceHistoryId: null,
                setPrompt: () => undefined,
                showNotification: () => undefined,
                addLog: () => undefined,
                t,
            });

            return null;
        }

        flushSync(() => {
            root.render(<TestComponent />);
        });
    };

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

    it('ignores sentinel metadata strings and falls back to the current view size', () => {
        renderHook(
            {
                requestedImageSize: 'undefined',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
            },
            { actualImageDimensions: 'null' },
            '1K',
        );

        expect(latestHook?.requestedImageSize).toBeNull();
        expect(latestHook?.insightRows.find((row) => row.label === 'Requested size')?.value).toBe('1K');
        expect(latestHook?.insightRows.find((row) => row.label === 'Actual output')?.value).toBe('None');
        expect(latestHook?.formatSessionHintValue('actualImageDimensions', 'null')).toBe('None');
    });

    it('redacts inline image data from session hint display values', () => {
        renderHook(null, null, '1K');

        const redactedString = latestHook?.formatSessionHintValue('preview', 'data:image/png;base64,AAAA');
        const redactedObject = latestHook?.formatSessionHintValue('payload', {
            preview: 'data:image/jpeg;base64,BBBB',
            safe: true,
        });

        expect(redactedString).toContain('inline image data omitted');
        expect(redactedString).not.toContain('AAAA');
        expect(redactedObject).toContain('inline image data omitted');
        expect(redactedObject).not.toContain('BBBB');
    });

    it('redacts thought signatures from session hint display values', () => {
        renderHook(null, null, '1K');

        const rawThoughtSignature = 'A'.repeat(512);
        const redactedThoughtSignature = latestHook?.formatSessionHintValue('thoughtSignature', rawThoughtSignature);

        expect(redactedThoughtSignature).toContain('thought signature omitted');
        expect(redactedThoughtSignature).not.toContain(rawThoughtSignature);
    });

    it('falls back to the current composer size when 3.1 flash uses 512', () => {
        renderHook(
            {
                requestedImageSize: 'undefined',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
            },
            { imageSizeRequested: 'null' },
            '512',
        );

        expect(latestHook?.requestedImageSize).toBeNull();
        expect(latestHook?.insightRows.find((row) => row.label === 'Requested size')?.value).toBe('512');
    });

    it('builds localized session continuity signals for provenance summary chips', () => {
        renderHook(null, null, '1K', {
            source: 'history',
            sourceHistoryId: 'SRC-7',
            conversationId: 'conv-1',
            conversationTurnIds: ['turn-1', 'turn-2'],
            provenanceMode: 'live',
            activeResult: {
                sessionHints: {
                    thoughtSignatureReturned: true,
                    groundingMetadataReturned: true,
                    groundingSupportsReturned: true,
                },
            },
        });

        expect(latestHook?.sessionContinuitySignals).toEqual([
            'history turn',
            'history-linked',
            'official chat',
            '2 chat turns',
            'live provenance',
            'thought signature',
            'grounding metadata',
            'grounding supports',
        ]);
    });

    it('keeps the full attribution overview row set available to the panel', () => {
        renderHook(
            null,
            null,
            '1K',
            {},
            {
                enabled: true,
                webQueries: ['alpha', 'beta'],
                imageQueries: ['gamma'],
                searchEntryPointAvailable: true,
                sources: [
                    { title: 'Example One', url: 'https://example.com/one', sourceType: 'web' },
                    { title: 'Example Two', url: 'https://example.com/two', sourceType: 'image' },
                ],
                supports: [
                    {
                        chunkIndices: [0],
                        sourceIndices: [0],
                        sourceTitles: ['Example One'],
                    },
                ],
            },
        );

        expect(latestHook?.attributionOverviewRows.map((row) => row.id)).toEqual([
            'coverage',
            'source-mix',
            'queries',
            'entry-point',
        ]);
    });
});
