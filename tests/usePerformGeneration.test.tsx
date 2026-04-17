/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePerformGeneration } from '../hooks/usePerformGeneration';
import { GeneratedImage, StageErrorState } from '../types';
import { buildStyleTransferPrompt } from '../utils/styleRegistry';

const {
    checkApiKeyMock,
    promptForApiKeyMock,
    generateImageWithGeminiMock,
    saveImageToLocalMock,
    generateThumbnailMock,
    persistHistoryThumbnailMock,
} = vi.hoisted(() => ({
    checkApiKeyMock: vi.fn(),
    promptForApiKeyMock: vi.fn(),
    generateImageWithGeminiMock: vi.fn(),
    saveImageToLocalMock: vi.fn(),
    generateThumbnailMock: vi.fn(),
    persistHistoryThumbnailMock: vi.fn(),
}));

vi.mock('../services/geminiService', () => ({
    checkApiKey: checkApiKeyMock,
    promptForApiKey: promptForApiKeyMock,
    generateImageWithGemini: generateImageWithGeminiMock,
}));

vi.mock('../utils/imageSaveUtils', () => ({
    buildSavedImageLoadUrl: (savedFilename: string) => `/api/load-image?filename=${encodeURIComponent(savedFilename)}`,
    extractSavedFilename: (savedPath: string | null | undefined) => savedPath?.split(/[\\/]/).pop(),
    persistHistoryThumbnail: persistHistoryThumbnailMock,
    saveImageToLocal: saveImageToLocalMock,
    generateThumbnail: generateThumbnailMock,
}));

type HookHandle = ReturnType<typeof usePerformGeneration>;
type GenerationSourceOverride = {
    sourceHistoryId: string | null;
    sourceLineageAction?: 'continue' | 'branch' | null;
};

type HookOverrides = {
    objectImages?: string[];
    characterImages?: string[];
};

describe('usePerformGeneration', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;
    let latestHistory: GeneratedImage[];
    let latestGeneratedImageUrls: string[];
    let latestSelectedImageIndex = -1;
    let latestLogs: string[];
    let latestBatchProgress = { completed: -1, total: -1 };
    let latestDisplaySettings: Record<string, unknown> | null;
    let latestGenerationMode = '';
    let latestExecutionMode = '';
    let latestError: StageErrorState | null;
    let latestIsGenerating = false;
    let latestIsEditing = true;
    let latestEditingImageSource: string | null = 'data:image/png;base64,EDIT';
    let notifications: Array<{ message: string; type?: 'info' | 'error' }>;
    let liveProgressEvents: unknown[];
    let liveProgressResetCount = 0;
    let generationLineageContextFactory:
        | ((params: { mode: string; editingInput?: string; sourceOverride?: GenerationSourceOverride | null }) => {
              parentHistoryId: string;
              rootHistoryId: string;
              sourceHistoryId: string;
              lineageAction: 'root' | 'continue' | 'branch' | 'reopen';
              lineageDepth: number;
          })
        | null;
    let conversationContextFactory:
        | ((params: {
              mode: string;
              editingInput?: string;
              batchSize: number;
              sourceOverride?: GenerationSourceOverride | null;
          }) => {
              conversationId: string;
              branchOriginId: string;
              activeSourceHistoryId: string;
              priorTurns: Array<{
                  historyId: string;
                  prompt: string;
                  sourceImage: { savedFilename: string; mimeType: string };
                  outputImage: { savedFilename: string; mimeType: string };
                  text: string;
                  thoughts: string | null;
                  thoughtSignature: string | null;
              }>;
          } | null)
        | null;
    let lastGenerationLineageContextArgs: {
        mode: string;
        editingInput?: string;
        sourceOverride?: GenerationSourceOverride | null;
    } | null;
    let lastConversationContextArgs: {
        mode: string;
        editingInput?: string;
        batchSize: number;
        sourceOverride?: GenerationSourceOverride | null;
    } | null;

    const renderHook = (overrides: HookOverrides = {}) => {
        function Harness() {
            latestHook = usePerformGeneration({
                t: (key) => {
                    const translations: Record<string, string> = {
                        errorNoPrompt: 'Prompt required.',
                        logAutoFillStyle: 'Auto-filled style prompt.',
                        logMode: 'Mode: {0}',
                        logSource: 'Source: {0}',
                        logRequesting: 'Requesting {0} result(s) at {1}',
                        logSaved: 'Saved {0}',
                        logAutoSaveFailed: 'Auto-save failed.',
                        logSuccessFail: 'Success {0}, Fail {1}',
                        errorAllFailed: 'All generations failed.',
                        errorApiKey: 'API key invalid.',
                        logFatalError: 'Fatal: {0}',
                        statusFailed: 'Generation failed.',
                        generationFailureSummaryUnknown: 'Unknown failure summary',
                        generationFailureSummaryPolicy: 'Policy failure summary',
                        generationFailureSummarySafety: 'Safety failure summary',
                        generationFailureSummaryTextOnly: 'Text-only failure summary',
                        generationFailureSummaryEmpty: 'Insufficient signal failure summary',
                        generationFailureSummaryNoImage: 'No-image failure summary',
                        generationFailureDetailRetry: 'Retry detail',
                        generationFailureDetailPromptBlockReason: 'Policy block reason: {0}.',
                        generationFailureDetailSafetyCategories: 'Safety categories: {0}.',
                        generationFailureDetailTextOnly: 'Returned text but no image bytes.',
                        generationFailureDetailThoughtsOnly:
                            'Only thought summaries were returned; no image bytes were emitted.',
                        generationFailureDetailMissingCandidates: 'Missing candidates detail.',
                        generationFailureDetailMissingParts: 'Missing parts detail.',
                        generationFailureDetailPossibleBatchSafetySuppression:
                            'Possible batch safety suppression detail.',
                        generationFailureDetailFinishReason: 'Finish reason: {0}.',
                        modelGemini31Flash: 'Gemini 3.1 Flash',
                    };
                    return translations[key] || key;
                },
                apiKeyReady: true,
                setApiKeyReady: vi.fn(),
                handleApiKeyConnect: vi.fn().mockResolvedValue(true),
                setIsGenerating: (value) => {
                    latestIsGenerating = value;
                },
                setError: (value) => {
                    latestError = value;
                },
                setGeneratedImageUrls: (updater) => {
                    latestGeneratedImageUrls =
                        typeof updater === 'function' ? updater(latestGeneratedImageUrls) : updater;
                },
                setSelectedImageIndex: (value) => {
                    latestSelectedImageIndex = value;
                },
                setLogs: (updater) => {
                    latestLogs = typeof updater === 'function' ? updater(latestLogs) : updater;
                },
                addLog: (message) => {
                    latestLogs = [...latestLogs, message];
                },
                abortControllerRef: { current: null },
                objectImages: overrides.objectImages ?? [],
                characterImages: overrides.characterImages ?? [],
                batchSize: 1,
                aspectRatio: '1:1',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
                setBatchProgress: (value) => {
                    latestBatchProgress = value;
                },
                setGenerationMode: (value) => {
                    latestGenerationMode = value;
                },
                setExecutionMode: (value) => {
                    latestExecutionMode = value;
                },
                setDisplaySettings: (value) => {
                    latestDisplaySettings = value;
                },
                showNotification: (message, type) => {
                    notifications.push({ message, type });
                },
                setHistory: (updater) => {
                    latestHistory = typeof updater === 'function' ? updater(latestHistory) : updater;
                },
                setIsEditing: (value) => {
                    latestIsEditing = value;
                },
                setEditingImageSource: (value) => {
                    latestEditingImageSource = value;
                },
                getGenerationLineageContext: (params) => {
                    lastGenerationLineageContextArgs = params;
                    return (
                        generationLineageContextFactory?.(params) || {
                            parentHistoryId: 'parent-turn',
                            rootHistoryId: 'root-turn',
                            sourceHistoryId: 'source-turn',
                            lineageAction: 'continue',
                            lineageDepth: 2,
                        }
                    );
                },
                getConversationRequestContext: (params) => {
                    lastConversationContextArgs = params;
                    return conversationContextFactory?.(params) || null;
                },
                onLiveProgressEvent: (event) => {
                    liveProgressEvents.push(event);
                },
                onLiveProgressReset: () => {
                    liveProgressResetCount += 1;
                },
            });
            return null;
        }

        act(() => {
            root.render(<Harness />);
        });
    };

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestHook = null;
        latestHistory = [];
        latestGeneratedImageUrls = ['stale-url'];
        latestSelectedImageIndex = 99;
        latestLogs = ['stale log'];
        latestBatchProgress = { completed: -1, total: -1 };
        latestDisplaySettings = null;
        latestGenerationMode = '';
        latestExecutionMode = '';
        latestError = 'stale-error';
        latestIsGenerating = false;
        latestIsEditing = true;
        latestEditingImageSource = 'data:image/png;base64,EDIT';
        notifications = [];
        liveProgressEvents = [];
        liveProgressResetCount = 0;
        generationLineageContextFactory = null;
        conversationContextFactory = null;
        lastGenerationLineageContextArgs = null;
        lastConversationContextArgs = null;

        checkApiKeyMock.mockReset();
        promptForApiKeyMock.mockReset();
        generateImageWithGeminiMock.mockReset();
        saveImageToLocalMock.mockReset();
        generateThumbnailMock.mockReset();
        persistHistoryThumbnailMock.mockReset();

        saveImageToLocalMock.mockResolvedValue('D:/output/generated.png');
        generateThumbnailMock.mockResolvedValue('data:image/jpeg;base64,thumb');
        persistHistoryThumbnailMock.mockResolvedValue({
            url: 'data:image/jpeg;base64,thumb',
        });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
        vi.restoreAllMocks();
    });

    it('stabilizes state after a successful generation completes', async () => {
        generateImageWithGeminiMock.mockImplementation(
            async (_request, _batchSize, onImageReceived, onLog, _signal, onProgress) => {
                onLog('Image #1: Success.');
                onProgress(1, 1);
                const receivedResult = await onImageReceived('data:image/png;base64,AAA', 0);
                return [
                    {
                        slotIndex: 0,
                        status: 'success',
                        url: 'data:image/png;base64,AAA',
                        displayUrl: receivedResult?.displayUrl,
                        savedFilename: receivedResult?.savedFilename,
                        text: 'Generated reply',
                        thoughts: 'Reasoning',
                        metadata: { actualOutput: { width: 2048, height: 2048 } },
                        grounding: null,
                        sessionHints: { source: 'test' },
                        conversation: {
                            used: false,
                            conversationId: 'conv-1',
                            branchOriginId: 'root-turn',
                        },
                    },
                ];
            },
        );

        renderHook();
        expect(latestHook).toBeTruthy();

        await act(async () => {
            await latestHook!.performGeneration(
                'A minimal yellow banana icon on a clean white card',
                '1:1',
                '2K',
                'None',
                'gemini-3.1-flash-image-preview',
                'data:image/png;base64,EDIT',
            );
        });

        expect(generateImageWithGeminiMock).toHaveBeenCalledTimes(1);
        expect(saveImageToLocalMock).toHaveBeenCalledWith(
            'data:image/png;base64,AAA',
            'gemini-3.1-flash-image-preview-edit',
            expect.objectContaining({
                prompt: 'A minimal yellow banana icon on a clean white card',
                size: '2K',
                mode: 'Inpainting',
            }),
        );
        expect(persistHistoryThumbnailMock).toHaveBeenCalledWith(
            'data:image/png;base64,AAA',
            'gemini-3.1-flash-image-preview-edit',
            'generated.png',
        );
        expect(latestGeneratedImageUrls).toEqual([]);
        expect(latestSelectedImageIndex).toBe(0);
        expect(latestGenerationMode).toBe('Inpainting');
        expect(latestExecutionMode).toBe('single-turn');
        expect(latestDisplaySettings).toEqual(
            expect.objectContaining({
                prompt: 'A minimal yellow banana icon on a clean white card',
                size: '2K',
                style: 'None',
            }),
        );
        expect(latestHistory).toHaveLength(1);
        expect(latestHistory[0]).toEqual(
            expect.objectContaining({
                url: 'data:image/jpeg;base64,thumb',
                prompt: 'A minimal yellow banana icon on a clean white card',
                status: 'success',
                text: 'Generated reply',
                thoughts: 'Reasoning',
                savedFilename: 'generated.png',
                openedAt: null,
                conversationId: 'conv-1',
                conversationBranchOriginId: 'root-turn',
                parentHistoryId: 'parent-turn',
                rootHistoryId: 'root-turn',
                sourceHistoryId: 'source-turn',
                lineageAction: 'continue',
                lineageDepth: 2,
                metadata: expect.objectContaining({
                    batchResultIndex: 0,
                }),
            }),
        );
        expect(latestLogs).toContain('Image #1: Success.');
        expect(latestLogs).toContain('Saved generated.png');
        expect(latestLogs).toContain('Success 1, Fail 0');
        expect(latestBatchProgress).toEqual({ completed: 0, total: 0 });
        expect(latestError).toBeNull();
        expect(latestIsGenerating).toBe(false);
        expect(latestIsEditing).toBe(true);
        expect(latestEditingImageSource).toBe('data:image/png;base64,EDIT');
        expect(notifications).toEqual([]);
    });

    it('forwards live progress events and resets transient state around generation', async () => {
        generateImageWithGeminiMock.mockImplementation(
            async (_request, _batchSize, onImageReceived, _onLog, _signal, onProgress, _onResult, onLiveProgressEvent) => {
                onLiveProgressEvent?.({ type: 'start', sessionId: 'stream-session-1' });
                onLiveProgressEvent?.({
                    type: 'result-part',
                    sessionId: 'stream-session-1',
                    part: {
                        sequence: 0,
                        kind: 'thought-text',
                        text: 'Streaming thought',
                    },
                });
                onLiveProgressEvent?.({
                    type: 'summary',
                    sessionId: 'stream-session-1',
                    summary: {
                        transportOpened: true,
                        orderingStable: true,
                        preCompletionArtifactCount: 1,
                        firstPreCompletionArtifactKind: 'thought-text',
                        thoughtSignatureObserved: false,
                        finalRenderArrived: true,
                        truthfulnessOutcome: 'live-progress',
                    },
                });
                onProgress(1, 1);
                const receivedResult = await onImageReceived('data:image/png;base64,LIVE', 0);
                return [
                    {
                        slotIndex: 0,
                        status: 'success',
                        url: 'data:image/png;base64,LIVE',
                        displayUrl: receivedResult?.displayUrl,
                        savedFilename: receivedResult?.savedFilename,
                        text: 'Final result',
                        thoughts: 'Streaming thought',
                        resultParts: [
                            {
                                sequence: 0,
                                kind: 'thought-text',
                                text: 'Streaming thought',
                            },
                        ],
                    },
                ];
            },
        );

        renderHook();

        await act(async () => {
            await latestHook!.performGeneration(
                'A live progress banana card',
                '1:1',
                '2K',
                'None',
                'gemini-3.1-flash-image-preview',
            );
        });

        expect(liveProgressEvents).toEqual([
            { type: 'start', sessionId: 'stream-session-1' },
            {
                type: 'result-part',
                sessionId: 'stream-session-1',
                part: {
                    sequence: 0,
                    kind: 'thought-text',
                    text: 'Streaming thought',
                },
            },
            {
                type: 'summary',
                sessionId: 'stream-session-1',
                summary: {
                    transportOpened: true,
                    orderingStable: true,
                    preCompletionArtifactCount: 1,
                    firstPreCompletionArtifactKind: 'thought-text',
                    thoughtSignatureObserved: false,
                    finalRenderArrived: true,
                    truthfulnessOutcome: 'live-progress',
                },
            },
        ]);
        expect(liveProgressResetCount).toBe(2);
    });

    it('auto-fills style-transfer prompts from the shared registry helper', async () => {
        generateImageWithGeminiMock.mockResolvedValue([
            {
                status: 'success',
                url: 'data:image/png;base64,EEE',
                savedFilename: 'style-transfer.png',
                metadata: { actualOutput: { width: 1024, height: 1024 } },
                grounding: null,
                sessionHints: null,
            },
        ]);

        renderHook({
            objectImages: ['data:image/png;base64,REF'],
        });

        await act(async () => {
            await latestHook!.performGeneration(
                '',
                '1:1',
                '1K',
                'Digital Illustration',
                'gemini-3.1-flash-image-preview',
            );
        });

        expect(generateImageWithGeminiMock).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: buildStyleTransferPrompt('Digital Illustration'),
                objectImageInputs: ['data:image/png;base64,REF'],
            }),
            1,
            expect.any(Function),
            expect.any(Function),
            expect.any(AbortSignal),
            expect.any(Function),
            expect.any(Function),
            expect.any(Function),
        );
    });

    it('forwards editor source overrides into lineage and official conversation context', async () => {
        const sourceOverride: GenerationSourceOverride = {
            sourceHistoryId: 'editor-source-turn',
            sourceLineageAction: 'branch',
        };

        generationLineageContextFactory = (params) => ({
            parentHistoryId: params.sourceOverride?.sourceHistoryId || 'parent-turn',
            rootHistoryId: params.sourceOverride?.sourceHistoryId || 'root-turn',
            sourceHistoryId: params.sourceOverride?.sourceHistoryId || 'source-turn',
            lineageAction: params.sourceOverride?.sourceLineageAction === 'branch' ? 'branch' : 'continue',
            lineageDepth: 4,
        });
        conversationContextFactory = (params) =>
            params.sourceOverride
                ? {
                      conversationId: 'conversation-99',
                      branchOriginId:
                          params.sourceOverride.sourceLineageAction === 'branch'
                              ? (params.sourceOverride.sourceHistoryId as string)
                              : 'root-turn',
                      activeSourceHistoryId: params.sourceOverride.sourceHistoryId as string,
                      priorTurns: [],
                  }
                : null;
        generateImageWithGeminiMock.mockResolvedValue([
            {
                status: 'success',
                url: 'data:image/png;base64,DDD',
                savedFilename: 'override.png',
                metadata: { actualOutput: { width: 1024, height: 1024 } },
                grounding: null,
                sessionHints: null,
            },
        ]);

        renderHook();

        await act(async () => {
            await latestHook!.performGeneration(
                'Editor lineage override',
                '1:1',
                '1K',
                'None',
                'gemini-3.1-flash-image-preview',
                'data:image/png;base64,EDIT',
                1,
                undefined,
                'Editor Edit',
                undefined,
                undefined,
                sourceOverride,
            );
        });

        expect(lastGenerationLineageContextArgs).toEqual(
            expect.objectContaining({
                sourceOverride,
            }),
        );
        expect(lastConversationContextArgs).toEqual(
            expect.objectContaining({
                sourceOverride,
            }),
        );
        expect(generateImageWithGeminiMock).toHaveBeenCalledWith(
            expect.objectContaining({
                conversationContext: expect.objectContaining({
                    branchOriginId: 'editor-source-turn',
                    activeSourceHistoryId: 'editor-source-turn',
                }),
            }),
            1,
            expect.any(Function),
            expect.any(Function),
            expect.any(AbortSignal),
            expect.any(Function),
            expect.any(Function),
            expect.any(Function),
        );
        expect(latestHistory[0]).toEqual(
            expect.objectContaining({
                parentHistoryId: 'editor-source-turn',
                rootHistoryId: 'editor-source-turn',
                sourceHistoryId: 'editor-source-turn',
                lineageAction: 'branch',
                lineageDepth: 4,
                conversationBranchOriginId: 'editor-source-turn',
                conversationSourceHistoryId: 'editor-source-turn',
            }),
        );
    });

    it('sends official conversation context and records returned continuation metadata', async () => {
        conversationContextFactory = () => ({
            conversationId: 'conversation-42',
            branchOriginId: 'root-turn',
            activeSourceHistoryId: 'follow-up-turn',
            priorTurns: [
                {
                    historyId: 'follow-up-turn',
                    prompt: 'Earlier follow-up',
                    sourceImage: {
                        savedFilename: 'root.png',
                        mimeType: 'image/png',
                    },
                    outputImage: {
                        savedFilename: 'follow-up.png',
                        mimeType: 'image/png',
                    },
                    text: 'Earlier reply',
                    thoughts: null,
                    thoughtSignature: 'sig-1',
                },
            ],
        });

        generateImageWithGeminiMock.mockImplementation(async (request) => [
            {
                status: 'success',
                url: 'data:image/png;base64,BBB',
                savedFilename: 'conversation.png',
                text: 'Conversation reply',
                thoughts: 'Conversation reasoning',
                metadata: { actualOutput: { width: 1024, height: 1024 } },
                grounding: null,
                sessionHints: { officialConversationUsed: true },
                conversation: {
                    used: true,
                    conversationId: 'conversation-42',
                    branchOriginId: 'root-turn',
                    activeSourceHistoryId: 'follow-up-turn',
                    priorTurnCount: 1,
                    historyLength: 4,
                },
            },
        ]);

        renderHook();

        await act(async () => {
            await latestHook!.performGeneration(
                'Continue this official chat',
                '1:1',
                '1K',
                'None',
                'gemini-3.1-flash-image-preview',
            );
        });

        expect(generateImageWithGeminiMock).toHaveBeenCalledTimes(1);
        expect(generateImageWithGeminiMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionMode: 'chat-continuation',
                conversationContext: expect.objectContaining({
                    conversationId: 'conversation-42',
                    branchOriginId: 'root-turn',
                    activeSourceHistoryId: 'follow-up-turn',
                    priorTurns: expect.arrayContaining([
                        expect.objectContaining({
                            historyId: 'follow-up-turn',
                            thoughtSignature: 'sig-1',
                        }),
                    ]),
                }),
            }),
            1,
            expect.any(Function),
            expect.any(Function),
            expect.any(AbortSignal),
            expect.any(Function),
            expect.any(Function),
            expect.any(Function),
        );
        expect(latestExecutionMode).toBe('chat-continuation');
        expect(latestHistory).toHaveLength(1);
        expect(latestHistory[0]).toEqual(
            expect.objectContaining({
                status: 'success',
                prompt: 'Continue this official chat',
                text: 'Conversation reply',
                thoughts: 'Conversation reasoning',
                conversationId: 'conversation-42',
                conversationBranchOriginId: 'root-turn',
                conversationSourceHistoryId: 'follow-up-turn',
                conversationTurnIndex: 1,
            }),
        );
    });

    it('drops oversized opaque thought signatures from stored session hints while preserving the returned flag', async () => {
        const opaqueThoughtSignature = 'A'.repeat(512);
        generateImageWithGeminiMock.mockResolvedValue([
            {
                status: 'success',
                url: 'data:image/png;base64,CCC',
                savedFilename: 'opaque-signature.png',
                metadata: { actualOutput: { width: 1024, height: 1024 } },
                grounding: null,
                sessionHints: {
                    thoughtSignatureReturned: true,
                    thoughtSignature: opaqueThoughtSignature,
                },
            },
        ]);

        renderHook();

        await act(async () => {
            await latestHook!.performGeneration(
                'Opaque thought signature test',
                '1:1',
                '1K',
                'None',
                'gemini-3.1-flash-image-preview',
            );
        });

        expect(latestHistory).toHaveLength(1);
        expect(latestHistory[0].sessionHints).toEqual({
            thoughtSignatureReturned: true,
        });
    });

    it('stores failure metadata on history items and exposes localized stage errors when every result fails', async () => {
        generateImageWithGeminiMock.mockResolvedValue([
            {
                slotIndex: 0,
                status: 'failed',
                error: 'Model returned text-only content instead of image data.',
                failure: {
                    code: 'text-only',
                    message: 'Model returned text-only content instead of image data.',
                    returnedTextContent: true,
                },
            },
        ]);

        renderHook();

        await act(async () => {
            await latestHook!.performGeneration(
                'Failed text-only result',
                '1:1',
                '1K',
                'None',
                'gemini-3.1-flash-image-preview',
            );
        });

        expect(latestHistory).toHaveLength(1);
        expect(latestHistory[0]).toEqual(
            expect.objectContaining({
                status: 'failed',
                error: 'Model returned text-only content instead of image data.',
                failure: expect.objectContaining({
                    code: 'text-only',
                }),
            }),
        );
        expect(latestError).toEqual(
            expect.objectContaining({
                summary: 'Text-only failure summary',
            }),
        );
        expect(latestError?.detail).toContain('Returned text but no image bytes.');
        expect(latestError?.detail).toContain('Retry detail');
    });

    it('persists thought result parts even when the final generation status is failed', async () => {
        saveImageToLocalMock.mockResolvedValueOnce('D:/output/thought-process.png');
        generateImageWithGeminiMock.mockResolvedValue([
            {
                slotIndex: 0,
                status: 'failed',
                error: 'Model returned no image data (finish reason: STOP).',
                failure: {
                    code: 'no-image-data',
                    message: 'Model returned no image data (finish reason: STOP).',
                    finishReason: 'STOP',
                    extractionIssue: 'no-image-data',
                    returnedTextContent: false,
                    returnedThoughtContent: true,
                },
                thoughts: 'Visible thought survives the failed render',
                resultParts: [
                    {
                        sequence: 0,
                        kind: 'thought-image',
                        imageUrl: 'data:image/png;base64,THOUGHT',
                        mimeType: 'image/png',
                    },
                ],
            },
        ]);

        renderHook();

        await act(async () => {
            await latestHook!.performGeneration(
                'Failed stream should still persist its process image',
                '1:1',
                '1K',
                'None',
                'gemini-3.1-flash-image-preview',
            );
        });

        expect(saveImageToLocalMock).toHaveBeenCalledWith(
            'data:image/png;base64,THOUGHT',
            'gemini-3.1-flash-image-preview-gen-thought',
            expect.objectContaining({
                kind: 'thought-image',
                slotIndex: 0,
                sequence: 0,
            }),
            'gemini-3.1-flash-image-preview-gen-01-part-00',
        );
        expect(latestHistory).toHaveLength(1);
        expect(latestHistory[0]).toEqual(
            expect.objectContaining({
                status: 'failed',
                resultParts: [
                    {
                        sequence: 0,
                        kind: 'thought-image',
                        imageUrl: '/api/load-image?filename=thought-process.png',
                        mimeType: 'image/png',
                        savedFilename: 'thought-process.png',
                    },
                ],
            }),
        );
    });

    it('adds sibling safety context to ambiguous batch failures without rewriting their canonical code', async () => {
        generateImageWithGeminiMock.mockResolvedValue([
            {
                slotIndex: 0,
                status: 'failed',
                error: 'Model returned a candidate without content parts.',
                failure: {
                    code: 'empty-response',
                    message: 'Model returned a candidate without content parts.',
                    extractionIssue: 'missing-parts',
                },
            },
            {
                slotIndex: 1,
                status: 'failed',
                error: 'Model output was blocked by safety filters.',
                failure: {
                    code: 'safety-blocked',
                    message: 'Model output was blocked by safety filters.',
                    finishReason: 'IMAGE_SAFETY',
                },
            },
        ]);

        renderHook();

        await act(async () => {
            await latestHook!.performGeneration(
                'Mixed ambiguous and safety failures',
                '1:1',
                '1K',
                'None',
                'gemini-3.1-flash-image-preview',
                undefined,
                2,
            );
        });

        const ambiguousItem = latestHistory.find((item) => item.metadata?.batchResultIndex === 0);
        const safetyItem = latestHistory.find((item) => item.metadata?.batchResultIndex === 1);

        expect(ambiguousItem).toEqual(
            expect.objectContaining({
                status: 'failed',
                failure: expect.objectContaining({
                    code: 'empty-response',
                }),
                failureContext: {
                    hasSiblingSafetyBlockedFailure: true,
                },
            }),
        );
        expect(safetyItem).toEqual(
            expect.objectContaining({
                status: 'failed',
                failure: expect.objectContaining({
                    code: 'safety-blocked',
                }),
            }),
        );
        expect(safetyItem?.failureContext).toBeUndefined();
        expect(latestError).toEqual(
            expect.objectContaining({
                summary: 'Insufficient signal failure summary',
            }),
        );
        expect(latestError?.detail).toContain('Missing parts detail.');
        expect(latestError?.detail).toContain('Possible batch safety suppression detail.');
    });

    it('keeps all-ambiguous empty-response batches neutral when no sibling safety signal exists', async () => {
        generateImageWithGeminiMock.mockResolvedValue([
            {
                slotIndex: 0,
                status: 'failed',
                error: 'Model returned a candidate without content parts.',
                failure: {
                    code: 'empty-response',
                    message: 'Model returned a candidate without content parts.',
                    extractionIssue: 'missing-parts',
                },
            },
            {
                slotIndex: 1,
                status: 'failed',
                error: 'Model returned a candidate without content parts.',
                failure: {
                    code: 'empty-response',
                    message: 'Model returned a candidate without content parts.',
                    extractionIssue: 'missing-parts',
                },
            },
        ]);

        renderHook();

        await act(async () => {
            await latestHook!.performGeneration(
                'All ambiguous failures',
                '1:1',
                '1K',
                'None',
                'gemini-3.1-flash-image-preview',
                undefined,
                2,
            );
        });

        expect(latestHistory).toHaveLength(2);
        expect(latestHistory.every((item) => item.failure?.code === 'empty-response')).toBe(true);
        expect(latestHistory.every((item) => item.failureContext === undefined)).toBe(true);
        expect(latestError).toEqual(
            expect.objectContaining({
                summary: 'Insufficient signal failure summary',
            }),
        );
        expect(latestError?.detail).toContain('Missing parts detail.');
        expect(latestError?.detail).not.toContain('Possible batch safety suppression detail.');
    });

    it('surfaces IMAGE_OTHER failures as no-image-data instead of insufficient-signal empty responses', async () => {
        generateImageWithGeminiMock.mockResolvedValue([
            {
                slotIndex: 0,
                status: 'failed',
                error: 'Model returned no image data (finish reason: IMAGE_OTHER).',
                failure: {
                    code: 'no-image-data',
                    message: 'Model returned no image data (finish reason: IMAGE_OTHER).',
                    finishReason: 'IMAGE_OTHER',
                    extractionIssue: 'missing-parts',
                },
            },
        ]);

        renderHook();

        await act(async () => {
            await latestHook!.performGeneration(
                'Explicit IMAGE_OTHER failure',
                '1:1',
                '1K',
                'None',
                'gemini-3.1-flash-image-preview',
            );
        });

        expect(latestHistory).toHaveLength(1);
        expect(latestHistory[0]).toEqual(
            expect.objectContaining({
                status: 'failed',
                failure: expect.objectContaining({
                    code: 'no-image-data',
                    finishReason: 'IMAGE_OTHER',
                    extractionIssue: 'missing-parts',
                }),
            }),
        );
        expect(latestError).toEqual(
            expect.objectContaining({
                summary: 'No-image failure summary',
            }),
        );
        expect(latestError?.detail).toContain('Finish reason: IMAGE_OTHER.');
        expect(latestError?.detail).toContain('Retry detail');
        expect(latestError?.detail).not.toContain('Missing parts detail.');
    });

    it('serializes thumbnail generation for multi-image batches and commits them in visual order', async () => {
        generateImageWithGeminiMock.mockResolvedValue([
            {
                slotIndex: 0,
                status: 'success',
                url: 'data:image/png;base64,AAA',
                savedFilename: 'first.png',
                metadata: { actualOutput: { width: 4096, height: 4096 } },
                grounding: null,
                sessionHints: null,
            },
            {
                slotIndex: 1,
                status: 'success',
                url: 'data:image/png;base64,BBB',
                savedFilename: 'second.png',
                metadata: { actualOutput: { width: 4096, height: 4096 } },
                grounding: null,
                sessionHints: null,
            },
        ]);

        let activeThumbnailJobs = 0;
        persistHistoryThumbnailMock.mockImplementation(async (imageUrl: string) => {
            activeThumbnailJobs += 1;
            expect(activeThumbnailJobs).toBe(1);
            await Promise.resolve();
            activeThumbnailJobs -= 1;
            return { url: `${imageUrl}-thumb` };
        });

        renderHook();

        await act(async () => {
            await latestHook!.performGeneration(
                'Render four detailed variants',
                '1:1',
                '4K',
                'None',
                'gemini-3.1-flash-image-preview',
                undefined,
                2,
            );
        });

        expect(persistHistoryThumbnailMock.mock.calls.map(([url]) => url)).toEqual([
            'data:image/png;base64,AAA',
            'data:image/png;base64,BBB',
        ]);
        expect(latestHistory).toHaveLength(2);
        expect(latestHistory.map((item) => item.url)).toEqual([
            'data:image/png;base64,BBB-thumb',
            'data:image/png;base64,AAA-thumb',
        ]);
        expect(latestHistory.map((item) => item.metadata?.batchResultIndex)).toEqual([1, 0]);
    });
});
