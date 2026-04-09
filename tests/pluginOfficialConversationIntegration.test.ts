import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ONE_BY_ONE_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRWQAAAAASUVORK5CYII=';
const tempDirs: string[] = [];

const chatSendMessageMock = vi.fn();
const chatCreateMock = vi.fn();
const generateContentMock = vi.fn();
const batchCreateMock = vi.fn();
const batchGetMock = vi.fn();
const batchCancelMock = vi.fn();

vi.mock('@google/genai', () => {
    class MockGoogleGenAI {
        constructor(_options: unknown) {}

        chats = {
            create: chatCreateMock,
        };

        batches = {
            create: batchCreateMock,
            get: batchGetMock,
            cancel: batchCancelMock,
        };

        models = {
            generateContent: generateContentMock,
        };
    }

    return {
        GoogleGenAI: MockGoogleGenAI,
        HarmBlockThreshold: { BLOCK_NONE: 'BLOCK_NONE' },
        HarmCategory: {
            HARM_CATEGORY_HARASSMENT: 'harassment',
            HARM_CATEGORY_HATE_SPEECH: 'hate',
            HARM_CATEGORY_SEXUALLY_EXPLICIT: 'sexual',
            HARM_CATEGORY_DANGEROUS_CONTENT: 'danger',
        },
    };
});

type MiddlewareHandler = (req: any, res: any) => void | Promise<void>;

const buildRequest = ({
    body = '',
    method = 'POST',
    url = '/',
    headers,
}: {
    body?: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
}) => {
    const chunks = body ? [body] : [];
    const request = Readable.from(chunks) as Readable & {
        method: string;
        url?: string;
        headers?: Record<string, string>;
    };
    request.method = method;
    request.url = url;
    request.headers = headers || { host: '127.0.0.1:22287' };
    return request;
};

const invokeJsonRoute = async (handler: MiddlewareHandler, body: unknown) => {
    const req = buildRequest({ body: JSON.stringify(body) });

    return await new Promise<{ status: number; body: any }>((resolve, reject) => {
        let status = 200;
        const res = {
            writeHead(nextStatus: number) {
                status = nextStatus;
            },
            end(payload: string) {
                try {
                    resolve({
                        status,
                        body: JSON.parse(payload),
                    });
                } catch (error) {
                    reject(error);
                }
            },
        };

        Promise.resolve(handler(req, res)).catch(reject);
    });
};

const invokeRawRoute = async (
    handler: MiddlewareHandler,
    body: string,
    options?: { method?: string; url?: string; headers?: Record<string, string> },
) => {
    const req = buildRequest({
        body,
        method: options?.method || 'POST',
        url: options?.url || '/',
        headers: options?.headers,
    });

    return await new Promise<{ status: number; body: any }>((resolve, reject) => {
        let status = 200;
        const res = {
            writeHead(nextStatus: number) {
                status = nextStatus;
            },
            end(payload: string) {
                try {
                    resolve({
                        status,
                        body: JSON.parse(payload),
                    });
                } catch (error) {
                    reject(error);
                }
            },
        };

        Promise.resolve(handler(req, res)).catch(reject);
    });
};

const invokeGetRoute = async (handler: MiddlewareHandler, url = '/') =>
    invokeRawRoute(handler, '', { method: 'GET', url });

describe('imageSavePlugin official conversation integration', () => {
    beforeEach(() => {
        chatSendMessageMock.mockReset();
        chatCreateMock.mockReset();
        generateContentMock.mockReset();
        batchCreateMock.mockReset();
        batchGetMock.mockReset();
        batchCancelMock.mockReset();

        chatSendMessageMock.mockResolvedValue({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: 'AAA',
                                },
                            },
                            {
                                text: 'Follow-up response text',
                            },
                        ],
                    },
                },
            ],
            promptFeedback: {},
        });
        chatCreateMock.mockReturnValue({
            sendMessage: chatSendMessageMock,
        });

        batchCreateMock.mockResolvedValue({
            name: 'batches/test-job',
            displayName: 'Queued test job',
            model: 'gemini-3.1-flash-image-preview',
            state: 'JOB_STATE_PENDING',
            createTime: '2025-01-01T00:00:00.000Z',
            updateTime: '2025-01-01T00:00:00.000Z',
        });
        batchGetMock.mockResolvedValue({
            name: 'batches/test-job',
            displayName: 'Queued test job',
            model: 'gemini-3.1-flash-image-preview',
            state: 'JOB_STATE_SUCCEEDED',
            createTime: '2025-01-01T00:00:00.000Z',
            updateTime: '2025-01-01T00:05:00.000Z',
            startTime: '2025-01-01T00:01:00.000Z',
            endTime: '2025-01-01T00:05:00.000Z',
            dest: {
                inlinedResponses: [
                    {
                        response: {
                            candidates: [
                                {
                                    content: {
                                        parts: [
                                            {
                                                inlineData: {
                                                    mimeType: 'image/png',
                                                    data: 'BBB',
                                                },
                                            },
                                            {
                                                text: 'Imported queued batch response',
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        while (tempDirs.length > 0) {
            const dir = tempDirs.pop();
            if (dir) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        }
    });

    it('uses official chat history when a restored conversation continuation request reaches the backend route', async () => {
        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const handlers = new Map<string, MiddlewareHandler>();
        const plugin = imageSavePlugin({ geminiApiKey: 'test-key' });
        const configureServer =
            typeof plugin.configureServer === 'function' ? plugin.configureServer : plugin.configureServer?.handler;
        expect(configureServer).toBeTypeOf('function');

        configureServer?.({
            middlewares: {
                use(route: string, handler: MiddlewareHandler) {
                    handlers.set(route, handler);
                },
            },
        } as any);

        const generateHandler = handlers.get('/api/images/generate');
        expect(generateHandler).toBeTruthy();

        const response = await invokeJsonRoute(generateHandler!, {
            prompt: 'Continue the restored official conversation',
            model: 'gemini-3.1-flash-image-preview',
            aspectRatio: '1:1',
            imageSize: '1K',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
            executionMode: 'chat-continuation',
            conversationContext: {
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
                        thoughtSignature: 'sig-1',
                    },
                ],
            },
        });

        expect(chatCreateMock).toHaveBeenCalledTimes(1);
        expect(chatCreateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                model: 'gemini-3.1-flash-image-preview',
                history: [
                    {
                        role: 'user',
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/gif',
                                    data: 'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                                },
                            },
                            { text: 'Official chat follow-up turn' },
                        ],
                    },
                    {
                        role: 'model',
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/gif',
                                    data: 'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                                },
                                thoughtSignature: 'sig-1',
                            },
                            { text: 'Official chat follow-up text' },
                        ],
                    },
                ],
            }),
        );
        expect(chatSendMessageMock).toHaveBeenCalledTimes(1);
        expect(chatSendMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                message: [{ text: 'Continue the restored official conversation' }],
            }),
        );

        expect(response.status).toBe(200);
        expect(response.body.conversation).toEqual({
            used: true,
            conversationId: 'chatconv1-restore-path',
            branchOriginId: 'chat-root-turn',
            activeSourceHistoryId: 'chat-follow-up-turn',
            priorTurnCount: 1,
            historyLength: 4,
        });
        expect(response.body.sessionHints.officialConversationUsed).toBe(true);
        expect(response.body.imageUrl).toBe('data:image/png;base64,AAA');
    });

    it('creates and imports official queued batch jobs through the backend routes', async () => {
        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const handlers = new Map<string, MiddlewareHandler>();
        const plugin = imageSavePlugin({ geminiApiKey: 'test-key' });
        const configureServer =
            typeof plugin.configureServer === 'function' ? plugin.configureServer : plugin.configureServer?.handler;

        configureServer?.({
            middlewares: {
                use(route: string, handler: MiddlewareHandler) {
                    handlers.set(route, handler);
                },
            },
        } as any);

        const createHandler = handlers.get('/api/batches/create');
        const importHandler = handlers.get('/api/batches/import');

        expect(createHandler).toBeTruthy();
        expect(importHandler).toBeTruthy();

        const createResponse = await invokeJsonRoute(createHandler!, {
            prompt: 'Create a queued panorama',
            model: 'gemini-3.1-flash-image-preview',
            aspectRatio: '16:9',
            imageSize: '1K',
            style: 'None',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
            requestCount: 2,
        });

        expect(createResponse.status).toBe(200);
        expect(batchCreateMock).toHaveBeenCalledTimes(1);
        expect(batchCreateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                model: 'gemini-3.1-flash-image-preview',
                src: expect.any(Array),
            }),
        );
        expect(batchCreateMock.mock.calls[0]?.[0]?.src).toHaveLength(2);
        expect(createResponse.body.job).toEqual(
            expect.objectContaining({
                name: 'batches/test-job',
                state: 'JOB_STATE_PENDING',
            }),
        );

        const importResponse = await invokeJsonRoute(importHandler!, {
            name: 'batches/test-job',
        });

        expect(importResponse.status).toBe(200);
        expect(batchGetMock).toHaveBeenCalledWith({ name: 'batches/test-job' });
        expect(importResponse.body.job).toEqual(
            expect.objectContaining({
                name: 'batches/test-job',
                state: 'JOB_STATE_SUCCEEDED',
            }),
        );
        expect(importResponse.body.results).toEqual([
            expect.objectContaining({
                index: 0,
                status: 'success',
                imageUrl: 'data:image/png;base64,BBB',
                text: 'Imported queued batch response',
            }),
        ]);
    });

    it('resolves file-backed load-image inputs before creating official queued batch jobs', async () => {
        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const handlers = new Map<string, MiddlewareHandler>();
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-batch-file-backed-'));
        tempDirs.push(outputDir);
        fs.writeFileSync(path.join(outputDir, 'queued-source.png'), Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64'));

        const plugin = imageSavePlugin({ geminiApiKey: 'test-key', outputDir });
        const configureServer =
            typeof plugin.configureServer === 'function' ? plugin.configureServer : plugin.configureServer?.handler;

        configureServer?.({
            middlewares: {
                use(route: string, handler: MiddlewareHandler) {
                    handlers.set(route, handler);
                },
            },
        } as any);

        const createHandler = handlers.get('/api/batches/create');
        expect(createHandler).toBeTruthy();

        const response = await invokeJsonRoute(createHandler!, {
            prompt: 'Queue a staged follow-up edit',
            model: 'gemini-3.1-flash-image-preview',
            aspectRatio: '1:1',
            imageSize: '1K',
            editingInput: '/api/load-image?filename=queued-source.png',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
            requestCount: 1,
        });

        expect(response.status).toBe(200);
        expect(batchCreateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                src: [
                    expect.objectContaining({
                        contents: [
                            expect.objectContaining({
                                role: 'user',
                                parts: [
                                    { text: '[Edit_1]' },
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: ONE_BY_ONE_PNG_BASE64,
                                        },
                                    },
                                    { text: 'Queue a staged follow-up edit' },
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        );
    });

    it('persists and reloads the shared workspace snapshot backup route', async () => {
        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const handlers = new Map<string, MiddlewareHandler>();
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-shared-workspace-'));
        tempDirs.push(outputDir);
        const plugin = imageSavePlugin({ outputDir, geminiApiKey: 'test-key' });
        const configureServer =
            typeof plugin.configureServer === 'function' ? plugin.configureServer : plugin.configureServer?.handler;

        configureServer?.({
            middlewares: {
                use(route: string, handler: MiddlewareHandler) {
                    handlers.set(route, handler);
                },
            },
        } as any);

        const workspaceSnapshotHandler = handlers.get('/api/workspace-snapshot');
        expect(workspaceSnapshotHandler).toBeTruthy();

        const payload = {
            history: [
                {
                    id: 'shared-turn-1',
                    url: 'https://example.com/shared.png',
                    prompt: 'Shared restore',
                    aspectRatio: '1:1',
                    size: '2K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 123,
                },
            ],
            stagedAssets: [],
            workflowLogs: ['[10:00] History loaded.'],
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
            conversationState: { byBranchOriginId: {} },
            viewState: {
                generatedImageUrls: ['https://example.com/shared.png'],
                selectedImageIndex: 0,
                selectedHistoryId: 'shared-turn-1',
            },
            composerState: {
                prompt: 'Shared restore',
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

        const postResponse = await invokeJsonRoute(workspaceSnapshotHandler!, payload);
        expect(postResponse.status).toBe(200);
        expect(postResponse.body.success).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'workspace_snapshot.json'))).toBe(true);

        const getResponse = await invokeGetRoute(workspaceSnapshotHandler!);
        expect(getResponse.status).toBe(200);
        expect(getResponse.body.history).toHaveLength(1);
        expect(getResponse.body.composerState.prompt).toBe('Shared restore');

        const clearResponse = await invokeJsonRoute(workspaceSnapshotHandler!, {
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
            conversationState: { byBranchOriginId: {} },
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
        });
        expect(clearResponse.status).toBe(200);
        expect(clearResponse.body.cleared).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'workspace_snapshot.json'))).toBe(false);

        const afterClearResponse = await invokeGetRoute(workspaceSnapshotHandler!);
        expect(afterClearResponse.status).toBe(200);
        expect(afterClearResponse.body.snapshot).toBeNull();
    });

    it('recovers gracefully when the shared workspace snapshot backup is corrupted', async () => {
        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const handlers = new Map<string, MiddlewareHandler>();
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-corrupt-workspace-'));
        tempDirs.push(outputDir);
        fs.writeFileSync(path.join(outputDir, 'workspace_snapshot.json'), '{not-valid-json', 'utf-8');

        const plugin = imageSavePlugin({ outputDir, geminiApiKey: 'test-key' });
        const configureServer =
            typeof plugin.configureServer === 'function' ? plugin.configureServer : plugin.configureServer?.handler;

        configureServer?.({
            middlewares: {
                use(route: string, handler: MiddlewareHandler) {
                    handlers.set(route, handler);
                },
            },
        } as any);

        const workspaceSnapshotHandler = handlers.get('/api/workspace-snapshot');
        expect(workspaceSnapshotHandler).toBeTruthy();

        const response = await invokeGetRoute(workspaceSnapshotHandler!);
        expect(response.status).toBe(200);
        expect(response.body.snapshot).toBeNull();
        expect(response.body.recoveredFromError).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'workspace_snapshot.json'))).toBe(false);
    });

    it('classifies missing API key and upstream batch lookup failures without returning generic 500s', async () => {
        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const missingKeyHandlers = new Map<string, MiddlewareHandler>();
        const batchHandlers = new Map<string, MiddlewareHandler>();
        batchGetMock.mockRejectedValueOnce(Object.assign(new Error('Batch not found'), { status: 404 }));

        const missingKeyPlugin = imageSavePlugin();
        const configureMissingKeyServer =
            typeof missingKeyPlugin.configureServer === 'function'
                ? missingKeyPlugin.configureServer
                : missingKeyPlugin.configureServer?.handler;

        configureMissingKeyServer?.({
            middlewares: {
                use(route: string, handler: MiddlewareHandler) {
                    missingKeyHandlers.set(route, handler);
                },
            },
        } as any);

        const batchPlugin = imageSavePlugin({ geminiApiKey: 'test-key' });
        const configureBatchServer =
            typeof batchPlugin.configureServer === 'function'
                ? batchPlugin.configureServer
                : batchPlugin.configureServer?.handler;

        configureBatchServer?.({
            middlewares: {
                use(route: string, handler: MiddlewareHandler) {
                    batchHandlers.set(route, handler);
                },
            },
        } as any);

        const promptEnhanceHandler = missingKeyHandlers.get('/api/prompt/enhance');
        const batchGetHandler = batchHandlers.get('/api/batches/get');

        expect(promptEnhanceHandler).toBeTruthy();
        expect(batchGetHandler).toBeTruthy();

        const promptResponse = await invokeJsonRoute(promptEnhanceHandler!, {
            currentPrompt: 'Refine this prompt',
            lang: 'en',
        });
        expect(promptResponse.status).toBe(503);
        expect(promptResponse.body.error).toContain('Missing GEMINI_API_KEY');

        const batchResponse = await invokeJsonRoute(batchGetHandler!, {
            name: 'batches/missing-job',
        });
        expect(batchResponse.status).toBe(404);
        expect(batchResponse.body.error).toBe('Batch not found');
    });

    it('treats malformed local image payloads as 400 and removes prompt-history endpoints', async () => {
        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const handlers = new Map<string, MiddlewareHandler>();
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-local-errors-'));
        tempDirs.push(outputDir);
        const plugin = imageSavePlugin({ outputDir, geminiApiKey: 'test-key' });
        const configureServer =
            typeof plugin.configureServer === 'function' ? plugin.configureServer : plugin.configureServer?.handler;

        configureServer?.({
            middlewares: {
                use(route: string, handler: MiddlewareHandler) {
                    handlers.set(route, handler);
                },
            },
        } as any);

        const saveImageHandler = handlers.get('/api/save-image');
        const savePromptsHandler = handlers.get('/api/save-prompts');

        expect(saveImageHandler).toBeTruthy();
        expect(savePromptsHandler).toBeUndefined();

        const badImagePayload = await invokeRawRoute(saveImageHandler!, '{bad-json');
        expect(badImagePayload.status).toBe(400);
        expect(badImagePayload.body.success).toBe(false);
    });

    it('includes editing input when creating queued batch jobs without enabling conversation-native continuation', async () => {
        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const handlers = new Map<string, MiddlewareHandler>();
        const plugin = imageSavePlugin({ geminiApiKey: 'test-key' });
        const configureServer =
            typeof plugin.configureServer === 'function' ? plugin.configureServer : plugin.configureServer?.handler;

        configureServer?.({
            middlewares: {
                use(route: string, handler: MiddlewareHandler) {
                    handlers.set(route, handler);
                },
            },
        } as any);

        const createHandler = handlers.get('/api/batches/create');
        expect(createHandler).toBeTruthy();

        const response = await invokeJsonRoute(createHandler!, {
            prompt: 'Queue a staged follow-up edit',
            model: 'gemini-3.1-flash-image-preview',
            aspectRatio: '1:1',
            imageSize: '1K',
            editingInput: 'data:image/png;base64,EDITAAA',
            objectImageInputs: ['data:image/png;base64,OBJAAA'],
            characterImageInputs: ['data:image/png;base64,CHARAAA'],
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'minimal',
            includeThoughts: true,
            googleSearch: false,
            imageSearch: false,
            requestCount: 1,
        });

        expect(response.status).toBe(200);
        expect(batchCreateMock).toHaveBeenCalledTimes(1);
        expect(batchCreateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                src: [
                    expect.objectContaining({
                        contents: [
                            expect.objectContaining({
                                role: 'user',
                                parts: expect.arrayContaining([
                                    expect.objectContaining({ text: '[Edit_1]' }),
                                    expect.objectContaining({ text: '[Obj_1]' }),
                                    expect.objectContaining({ text: '[Char_1]' }),
                                    expect.objectContaining({ text: 'Queue a staged follow-up edit' }),
                                ]),
                            }),
                        ],
                    }),
                ],
            }),
        );
    });

    it('returns requested and actual output dimensions for grounded image generation and persists actual dimensions in sidecars', async () => {
        generateContentMock.mockResolvedValueOnce({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: ONE_BY_ONE_PNG_BASE64,
                                },
                            },
                            {
                                text: 'Grounded response text',
                            },
                        ],
                    },
                    groundingMetadata: {
                        webSearchQueries: ['taipei night market'],
                        imageSearchQueries: ['lantern reference'],
                    },
                },
            ],
            promptFeedback: {},
        });

        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-plugin-'));
        tempDirs.push(outputDir);

        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const handlers = new Map<string, MiddlewareHandler>();
        const plugin = imageSavePlugin({ geminiApiKey: 'test-key', outputDir });
        const configureServer =
            typeof plugin.configureServer === 'function' ? plugin.configureServer : plugin.configureServer?.handler;

        configureServer?.({
            middlewares: {
                use(route: string, handler: MiddlewareHandler) {
                    handlers.set(route, handler);
                },
            },
        } as any);

        const generateHandler = handlers.get('/api/images/generate');
        const saveHandler = handlers.get('/api/save-image');
        expect(generateHandler).toBeTruthy();
        expect(saveHandler).toBeTruthy();

        const response = await invokeJsonRoute(generateHandler!, {
            prompt: 'Generate a grounded 4K test image',
            model: 'gemini-3.1-flash-image-preview',
            aspectRatio: '1:1',
            imageSize: '4K',
            outputFormat: 'images-only',
            temperature: 1,
            thinkingLevel: 'high',
            includeThoughts: true,
            googleSearch: true,
            imageSearch: true,
        });

        expect(response.status).toBe(200);
        expect(response.body.metadata).toEqual(
            expect.objectContaining({
                requestedImageSize: '4K',
                requestedAspectRatio: '1:1',
                actualOutput: {
                    width: 1,
                    height: 1,
                    mimeType: 'image/png',
                },
            }),
        );
        expect(response.body.sessionHints).toEqual(
            expect.objectContaining({
                imageSizeRequested: '4K',
                actualImageWidth: 1,
                actualImageHeight: 1,
                actualImageDimensions: '1x1',
                responseModalitiesActual: 'IMAGE+TEXT',
            }),
        );

        const saveResponse = await invokeJsonRoute(saveHandler!, {
            data: `data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`,
            filename: 'grounded-proof.png',
            metadata: {
                prompt: 'Generate a grounded 4K test image',
                size: '4K',
            },
        });

        expect(saveResponse.status).toBe(200);
        const sidecar = JSON.parse(fs.readFileSync(path.join(outputDir, 'grounded-proof.json'), 'utf8'));
        expect(sidecar).toEqual(
            expect.objectContaining({
                size: '4K',
                actualOutput: {
                    width: 1,
                    height: 1,
                    mimeType: 'image/png',
                },
            }),
        );
    });
});
