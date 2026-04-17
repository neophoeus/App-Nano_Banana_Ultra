import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildConversationRequestContext } from '../utils/conversationState';
import { generateImageWithGemini } from '../services/geminiService';
import { sanitizeWorkspaceSnapshot } from '../utils/workspacePersistence';
import { getStylePromptDescriptor } from '../utils/styleRegistry';

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
    stagedAssets: [],
    workflowLogs: [],
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
        prompt: 'Imported official conversation workspace',
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
        stickySendIntent: 'memory',
        generationMode: 'Follow-up Edit',
        executionMode: 'chat-continuation',
    },
};

describe('official conversation request path', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('reuses rehydrated official conversation state in the next generate request payload', async () => {
        const snapshot = sanitizeWorkspaceSnapshot(restoredOfficialConversationSnapshot);
        const conversationContext = buildConversationRequestContext({
            activeSourceHistoryId: snapshot.workspaceSession.conversationActiveSourceHistoryId!,
            branchOriginId: snapshot.workspaceSession.conversationBranchOriginId!,
            conversationState: snapshot.conversationState,
            history: snapshot.history,
        });

        expect(snapshot.workspaceSession.conversationId).toBe('chatconv1-restore-path');
        expect(snapshot.workspaceSession.conversationBranchOriginId).toBe('chat-root-turn');
        expect(snapshot.workspaceSession.conversationActiveSourceHistoryId).toBe('chat-follow-up-turn');
        expect(snapshot.workspaceSession.conversationTurnIds).toEqual(['chat-follow-up-turn']);
        expect(conversationContext).toEqual({
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

        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                [
                    JSON.stringify({ type: 'start', sessionId: 'chat-stream-1' }),
                    JSON.stringify({
                        type: 'complete',
                        sessionId: 'chat-stream-1',
                        response: {
                            imageUrl: 'data:image/png;base64,AAA',
                            conversation: {
                                used: true,
                                conversationId: 'chatconv1-restore-path',
                                branchOriginId: 'chat-root-turn',
                                activeSourceHistoryId: 'chat-follow-up-turn',
                                priorTurnCount: 1,
                                historyLength: 1,
                            },
                        },
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
                ].join('\n'),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/x-ndjson' },
                },
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        const results = await generateImageWithGemini(
            {
                prompt: 'Continue the restored official conversation',
                aspectRatio: '1:1',
                imageSize: '1K',
                style: 'None',
                model: 'gemini-3.1-flash-image-preview',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
                executionMode: 'chat-continuation',
                conversationContext,
            },
            1,
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [input, init] = fetchMock.mock.calls[0];
    expect(input).toBe('/api/images/generate-stream');
        expect(init?.method).toBe('POST');
        const requestBody = JSON.parse(String(init?.body));
        expect(requestBody.executionMode).toBe('chat-continuation');
        expect(requestBody.conversationContext).toEqual(conversationContext);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            status: 'success',
            url: 'data:image/png;base64,AAA',
            conversation: {
                used: true,
                conversationId: 'chatconv1-restore-path',
                branchOriginId: 'chat-root-turn',
                activeSourceHistoryId: 'chat-follow-up-turn',
            },
        });
    });

    it('appends registry-backed style descriptors to the submitted prompt payload', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    imageUrl: 'data:image/png;base64,STYLE',
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        await generateImageWithGemini(
            {
                prompt: 'Create a calm bookstore reading nook',
                aspectRatio: '1:1',
                imageSize: '1K',
                style: 'Digital Illustration',
                model: 'gemini-3.1-flash-image-preview',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: false,
                googleSearch: false,
                imageSearch: false,
                executionMode: 'single-turn',
            },
            1,
        );

        const [, init] = fetchMock.mock.calls[0];
        const requestBody = JSON.parse(String(init?.body));
        expect(requestBody.prompt).toBe(
            `Create a calm bookstore reading nook, ${getStylePromptDescriptor('Digital Illustration')}`,
        );
    });

    it('parses NDJSON live progress events before the final image completes', async () => {
        const onLiveProgressEvent = vi.fn();
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                [
                    JSON.stringify({ type: 'start', sessionId: 'live-stream-1' }),
                    JSON.stringify({
                        type: 'result-part',
                        sessionId: 'live-stream-1',
                        part: {
                            sequence: 0,
                            kind: 'thought-text',
                            text: 'First visible thought',
                        },
                    }),
                    JSON.stringify({
                        type: 'complete',
                        sessionId: 'live-stream-1',
                        response: {
                            imageUrl: 'data:image/png;base64,FINAL',
                            text: 'Final caption',
                            thoughts: 'First visible thought',
                            resultParts: [
                                {
                                    sequence: 0,
                                    kind: 'thought-text',
                                    text: 'First visible thought',
                                },
                                {
                                    sequence: 1,
                                    kind: 'output-image',
                                    imageUrl: 'data:image/png;base64,FINAL',
                                    mimeType: 'image/png',
                                },
                            ],
                        },
                        summary: {
                            transportOpened: true,
                            orderingStable: true,
                            preCompletionArtifactCount: 1,
                            firstPreCompletionArtifactKind: 'thought-text',
                            thoughtSignatureObserved: false,
                            finalRenderArrived: true,
                            truthfulnessOutcome: 'live-progress',
                        },
                    }),
                ].join('\n'),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/x-ndjson' },
                },
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        const results = await generateImageWithGemini(
            {
                prompt: 'Show the live stream before the final image completes',
                aspectRatio: '1:1',
                imageSize: '1K',
                style: 'None',
                model: 'gemini-3.1-flash-image-preview',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
                executionMode: 'single-turn',
            },
            1,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            onLiveProgressEvent,
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            slotIndex: 0,
            status: 'success',
            url: 'data:image/png;base64,FINAL',
            text: 'Final caption',
            thoughts: 'First visible thought',
        });
        expect(onLiveProgressEvent.mock.calls.map(([event]) => event)).toEqual([
            {
                type: 'start',
                sessionId: 'live-stream-1',
            },
            {
                type: 'result-part',
                sessionId: 'live-stream-1',
                part: {
                    sequence: 0,
                    kind: 'thought-text',
                    text: 'First visible thought',
                },
            },
            {
                type: 'summary',
                sessionId: 'live-stream-1',
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
    });

    it('recovers a live-progress no-image-data failure with one blocking retry', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    [
                        JSON.stringify({ type: 'start', sessionId: 'recover-stream-1' }),
                        JSON.stringify({
                            type: 'result-part',
                            sessionId: 'recover-stream-1',
                            part: {
                                sequence: 0,
                                kind: 'thought-text',
                                text: 'The stream exposed a thought before failing',
                            },
                        }),
                        JSON.stringify({
                            type: 'failure',
                            sessionId: 'recover-stream-1',
                            error: 'Model returned no image data (finish reason: STOP).',
                            failure: {
                                code: 'no-image-data',
                                message: 'Model returned no image data (finish reason: STOP).',
                                finishReason: 'STOP',
                                extractionIssue: 'no-image-data',
                                returnedTextContent: false,
                                returnedThoughtContent: true,
                            },
                            response: {
                                thoughts: 'The stream exposed a thought before failing',
                                resultParts: [
                                    {
                                        sequence: 0,
                                        kind: 'thought-text',
                                        text: 'The stream exposed a thought before failing',
                                    },
                                ],
                            },
                            summary: {
                                transportOpened: true,
                                orderingStable: true,
                                preCompletionArtifactCount: 1,
                                firstPreCompletionArtifactKind: 'thought-text',
                                thoughtSignatureObserved: false,
                                finalRenderArrived: false,
                                truthfulnessOutcome: 'live-progress',
                            },
                        }),
                    ].join('\n'),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/x-ndjson' },
                    },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        imageUrl: 'data:image/png;base64,RECOVERED',
                        text: 'Recovered final caption',
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
            );
        vi.stubGlobal('fetch', fetchMock);

        const results = await generateImageWithGemini(
            {
                prompt: 'Recover after a truthful stream no-image response',
                aspectRatio: '1:1',
                imageSize: '1K',
                style: 'None',
                model: 'gemini-3.1-flash-image-preview',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
                executionMode: 'single-turn',
            },
            1,
        );

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls.map(([input]) => input)).toEqual([
            '/api/images/generate-stream',
            '/api/images/generate',
        ]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            slotIndex: 0,
            status: 'success',
            url: 'data:image/png;base64,RECOVERED',
            text: 'Recovered final caption',
        });
    });

    it('preserves streamed partial artifacts when the NDJSON stream ends in failure', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    [
                        JSON.stringify({ type: 'start', sessionId: 'live-stream-failure-1' }),
                        JSON.stringify({
                            type: 'result-part',
                            sessionId: 'live-stream-failure-1',
                            part: {
                                sequence: 0,
                                kind: 'thought-text',
                                text: 'Reasoning stayed visible',
                            },
                        }),
                        JSON.stringify({
                            type: 'failure',
                            sessionId: 'live-stream-failure-1',
                            error: 'Model returned no image data (finish reason: STOP).',
                            failure: {
                                code: 'no-image-data',
                                message: 'Model returned no image data (finish reason: STOP).',
                                finishReason: 'STOP',
                                extractionIssue: 'no-image-data',
                                returnedTextContent: false,
                                returnedThoughtContent: true,
                            },
                            response: {
                                thoughts: 'Reasoning stayed visible',
                                resultParts: [
                                    {
                                        sequence: 0,
                                        kind: 'thought-text',
                                        text: 'Reasoning stayed visible',
                                    },
                                    {
                                        sequence: 1,
                                        kind: 'thought-image',
                                        imageUrl: 'data:image/png;base64,THOUGHT',
                                        mimeType: 'image/png',
                                    },
                                ],
                            },
                            summary: {
                                transportOpened: true,
                                orderingStable: true,
                                preCompletionArtifactCount: 2,
                                firstPreCompletionArtifactKind: 'thought-text',
                                thoughtSignatureObserved: true,
                                finalRenderArrived: false,
                                truthfulnessOutcome: 'live-progress',
                            },
                        }),
                    ].join('\n'),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/x-ndjson' },
                    },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        error: 'Model returned no image data (finish reason: STOP).',
                        failure: {
                            code: 'no-image-data',
                            message: 'Model returned no image data (finish reason: STOP).',
                            finishReason: 'STOP',
                            extractionIssue: 'no-image-data',
                            returnedTextContent: false,
                            returnedThoughtContent: false,
                        },
                    }),
                    {
                        status: 502,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
            );
        vi.stubGlobal('fetch', fetchMock);

        const results = await generateImageWithGemini(
            {
                prompt: 'Keep streamed artifacts even if the final image never arrives',
                aspectRatio: '1:1',
                imageSize: '1K',
                style: 'None',
                model: 'gemini-3.1-flash-image-preview',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
                executionMode: 'single-turn',
            },
            1,
        );

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls.map(([input]) => input)).toEqual([
            '/api/images/generate-stream',
            '/api/images/generate',
        ]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            slotIndex: 0,
            status: 'failed',
            error: 'Model returned no image data (finish reason: STOP).',
            failure: {
                code: 'no-image-data',
                message: 'Model returned no image data (finish reason: STOP).',
                finishReason: 'STOP',
                extractionIssue: 'no-image-data',
                returnedTextContent: false,
                returnedThoughtContent: false,
            },
            thoughts: 'Reasoning stayed visible',
        });
        expect(results[0].resultParts).toEqual([
            {
                sequence: 0,
                kind: 'thought-text',
                text: 'Reasoning stayed visible',
            },
            {
                sequence: 1,
                kind: 'thought-image',
                imageUrl: 'data:image/png;base64,THOUGHT',
                mimeType: 'image/png',
            },
        ]);
    });

    it('reconstructs streamed failure artifacts when the failure event carries no partial response payload', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    [
                        JSON.stringify({ type: 'start', sessionId: 'live-stream-failure-2' }),
                        JSON.stringify({
                            type: 'result-part',
                            sessionId: 'live-stream-failure-2',
                            part: {
                                sequence: 0,
                                kind: 'thought-text',
                                text: 'Recovered from the streamed client accumulator',
                            },
                        }),
                        JSON.stringify({
                            type: 'result-part',
                            sessionId: 'live-stream-failure-2',
                            part: {
                                sequence: 1,
                                kind: 'thought-image',
                                imageUrl: 'data:image/png;base64,ACCUMULATED',
                                mimeType: 'image/png',
                            },
                        }),
                        JSON.stringify({
                            type: 'failure',
                            sessionId: 'live-stream-failure-2',
                            error: 'Model returned no image data (finish reason: STOP).',
                            failure: {
                                code: 'no-image-data',
                                message: 'Model returned no image data (finish reason: STOP).',
                                finishReason: 'STOP',
                                extractionIssue: 'no-image-data',
                                returnedTextContent: false,
                                returnedThoughtContent: true,
                            },
                            summary: {
                                transportOpened: true,
                                orderingStable: true,
                                preCompletionArtifactCount: 2,
                                firstPreCompletionArtifactKind: 'thought-text',
                                thoughtSignatureObserved: false,
                                finalRenderArrived: false,
                                truthfulnessOutcome: 'live-progress',
                            },
                        }),
                    ].join('\n'),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/x-ndjson' },
                    },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        error: 'Model returned no image data (finish reason: STOP).',
                        failure: {
                            code: 'no-image-data',
                            message: 'Model returned no image data (finish reason: STOP).',
                            finishReason: 'STOP',
                            extractionIssue: 'no-image-data',
                            returnedTextContent: false,
                            returnedThoughtContent: false,
                        },
                    }),
                    {
                        status: 502,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
            );
        vi.stubGlobal('fetch', fetchMock);

        const results = await generateImageWithGemini(
            {
                prompt: 'Keep visible streamed artifacts even if the failure payload is empty',
                aspectRatio: '1:1',
                imageSize: '1K',
                style: 'None',
                model: 'gemini-3.1-flash-image-preview',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
                executionMode: 'single-turn',
            },
            1,
        );

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            slotIndex: 0,
            status: 'failed',
            thoughts: 'Recovered from the streamed client accumulator',
        });
        expect(results[0].resultParts).toEqual([
            {
                sequence: 0,
                kind: 'thought-text',
                text: 'Recovered from the streamed client accumulator',
            },
            {
                sequence: 1,
                kind: 'thought-image',
                imageUrl: 'data:image/png;base64,ACCUMULATED',
                mimeType: 'image/png',
            },
        ]);
    });

    it('fans out interactive batch variants into slot-aware single-image live streams', async () => {
        const onLiveProgressEvent = vi.fn();
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    [
                        JSON.stringify({ type: 'start', sessionId: 'fanout-stream-1' }),
                        JSON.stringify({
                            type: 'result-part',
                            sessionId: 'fanout-stream-1',
                            part: {
                                sequence: 0,
                                kind: 'thought-text',
                                text: 'Slot one thought',
                            },
                        }),
                        JSON.stringify({
                            type: 'complete',
                            sessionId: 'fanout-stream-1',
                            response: {
                                imageUrl: 'data:image/png;base64,SLOT1',
                                thoughts: 'Slot one thought',
                                resultParts: [
                                    {
                                        sequence: 0,
                                        kind: 'thought-text',
                                        text: 'Slot one thought',
                                    },
                                ],
                            },
                            summary: {
                                transportOpened: true,
                                orderingStable: true,
                                preCompletionArtifactCount: 1,
                                firstPreCompletionArtifactKind: 'thought-text',
                                thoughtSignatureObserved: false,
                                finalRenderArrived: true,
                                truthfulnessOutcome: 'live-progress',
                            },
                        }),
                    ].join('\n'),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/x-ndjson' },
                    },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    [
                        JSON.stringify({ type: 'start', sessionId: 'fanout-stream-2' }),
                        JSON.stringify({
                            type: 'result-part',
                            sessionId: 'fanout-stream-2',
                            part: {
                                sequence: 0,
                                kind: 'thought-text',
                                text: 'Slot two thought',
                            },
                        }),
                        JSON.stringify({
                            type: 'complete',
                            sessionId: 'fanout-stream-2',
                            response: {
                                imageUrl: 'data:image/png;base64,SLOT2',
                                thoughts: 'Slot two thought',
                                resultParts: [
                                    {
                                        sequence: 0,
                                        kind: 'thought-text',
                                        text: 'Slot two thought',
                                    },
                                ],
                            },
                            summary: {
                                transportOpened: true,
                                orderingStable: true,
                                preCompletionArtifactCount: 1,
                                firstPreCompletionArtifactKind: 'thought-text',
                                thoughtSignatureObserved: false,
                                finalRenderArrived: true,
                                truthfulnessOutcome: 'live-progress',
                            },
                        }),
                    ].join('\n'),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/x-ndjson' },
                    },
                ),
            );
        vi.stubGlobal('fetch', fetchMock);

        const results = await generateImageWithGemini(
            {
                prompt: 'Generate two thought-enabled variants through live fan-out',
                aspectRatio: '1:1',
                imageSize: '1K',
                style: 'None',
                model: 'gemini-3.1-flash-image-preview',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
                executionMode: 'interactive-batch-variants',
                liveProgressBatchSessionId: 'fanout-batch-1',
            },
            2,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            onLiveProgressEvent,
        );

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls.map(([input]) => input)).toEqual([
            '/api/images/generate-stream',
            '/api/images/generate-stream',
        ]);

        const requestBodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
        expect(requestBodies.every((body) => body.executionMode === 'single-turn')).toBe(true);

        expect(results).toEqual([
            expect.objectContaining({
                slotIndex: 0,
                status: 'success',
                url: 'data:image/png;base64,SLOT1',
                thoughts: 'Slot one thought',
            }),
            expect.objectContaining({
                slotIndex: 1,
                status: 'success',
                url: 'data:image/png;base64,SLOT2',
                thoughts: 'Slot two thought',
            }),
        ]);

        expect(onLiveProgressEvent.mock.calls.map(([event]) => event)).toEqual([
            {
                type: 'start',
                sessionId: 'fanout-stream-1',
                slotIndex: 0,
                batchSessionId: 'fanout-batch-1',
            },
            {
                type: 'result-part',
                sessionId: 'fanout-stream-1',
                slotIndex: 0,
                batchSessionId: 'fanout-batch-1',
                part: {
                    sequence: 0,
                    kind: 'thought-text',
                    text: 'Slot one thought',
                },
            },
            {
                type: 'summary',
                sessionId: 'fanout-stream-1',
                slotIndex: 0,
                batchSessionId: 'fanout-batch-1',
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
            {
                type: 'start',
                sessionId: 'fanout-stream-2',
                slotIndex: 1,
                batchSessionId: 'fanout-batch-1',
            },
            {
                type: 'result-part',
                sessionId: 'fanout-stream-2',
                slotIndex: 1,
                batchSessionId: 'fanout-batch-1',
                part: {
                    sequence: 0,
                    kind: 'thought-text',
                    text: 'Slot two thought',
                },
            },
            {
                type: 'summary',
                sessionId: 'fanout-stream-2',
                slotIndex: 1,
                batchSessionId: 'fanout-batch-1',
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
    });

    it('serializes retryable batch slot recovery after an initial no-image-data failure', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        imageUrl: 'data:image/png;base64,FIRST',
                        text: 'First variant',
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        error: 'Model returned no image data (finish reason: STOP).',
                        failure: {
                            code: 'no-image-data',
                            message: 'Model returned no image data (finish reason: STOP).',
                            finishReason: 'STOP',
                            extractionIssue: 'no-image-data',
                            returnedTextContent: false,
                            returnedThoughtContent: false,
                        },
                    }),
                    {
                        status: 502,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        imageUrl: 'data:image/png;base64,SECOND-RECOVERED',
                        text: 'Recovered second variant',
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
            );
        vi.stubGlobal('fetch', fetchMock);

        const results = await generateImageWithGemini(
            {
                prompt: 'Recover a failed batch slot once',
                aspectRatio: '1:1',
                imageSize: '1K',
                style: 'None',
                model: 'gemini-3.1-flash-image-preview',
                outputFormat: 'images-only',
                temperature: 1,
                thinkingLevel: 'minimal',
                includeThoughts: true,
                googleSearch: false,
                imageSearch: false,
            },
            2,
        );

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls.map(([input]) => input)).toEqual([
            '/api/images/generate',
            '/api/images/generate',
            '/api/images/generate',
        ]);
        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({
            slotIndex: 0,
            status: 'success',
            url: 'data:image/png;base64,FIRST',
            text: 'First variant',
        });
        expect(results[1]).toMatchObject({
            slotIndex: 1,
            status: 'success',
            url: 'data:image/png;base64,SECOND-RECOVERED',
            text: 'Recovered second variant',
        });
    });
});
