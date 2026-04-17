import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_WORKSPACE_SNAPSHOT } from '../utils/workspacePersistence';

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

    it('falls back to copy-based workspace snapshot replacement when rename hits EPERM', async () => {
        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const handlers = new Map<string, MiddlewareHandler>();
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-shared-workspace-eperm-'));
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

        const initialPayload = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            history: [
                {
                    id: 'shared-turn-ep-1',
                    url: 'https://example.com/shared-ep.png',
                    prompt: 'Shared restore EPERM base',
                    aspectRatio: '1:1',
                    size: '2K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 20,
                },
            ],
            composerState: {
                ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
                prompt: 'Shared restore EPERM base',
            },
        } satisfies WorkspacePersistenceSnapshot;

        const updatedPayload = {
            ...initialPayload,
            composerState: {
                ...initialPayload.composerState,
                prompt: 'Shared restore EPERM updated',
            },
        } satisfies WorkspacePersistenceSnapshot;

        const initialResponse = await invokeJsonRoute(workspaceSnapshotHandler!, initialPayload);
        expect(initialResponse.status).toBe(200);
        expect(initialResponse.body.success).toBe(true);

        const originalRenameSync = fs.renameSync.bind(fs);
        const copyFileSyncSpy = vi.spyOn(fs, 'copyFileSync');
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const renameSyncSpy = vi.spyOn(fs, 'renameSync');
        let shouldThrowRenameEperm = true;

        try {
            renameSyncSpy.mockImplementation(((from: fs.PathLike, to: fs.PathLike) => {
                if (shouldThrowRenameEperm) {
                    shouldThrowRenameEperm = false;
                    const error = Object.assign(new Error('rename blocked by Windows file lock'), { code: 'EPERM' });
                    throw error;
                }

                return originalRenameSync(from, to);
            }) as typeof fs.renameSync);

            const response = await invokeJsonRoute(workspaceSnapshotHandler!, updatedPayload);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(copyFileSyncSpy).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).not.toHaveBeenCalled();

            const persistedPayload = JSON.parse(
                fs.readFileSync(path.join(outputDir, 'workspace_snapshot.json'), 'utf-8'),
            ) as WorkspacePersistenceSnapshot;

            expect(persistedPayload.composerState.prompt).toBe('Shared restore EPERM updated');
            expect(fs.existsSync(path.join(outputDir, 'workspace_snapshot.json.tmp'))).toBe(false);
        } finally {
            renameSyncSpy.mockRestore();
            copyFileSyncSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        }
    });

    it('keeps the fresher temp workspace snapshot when Windows file locks block both rename and copy replacement', async () => {
        const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
        const handlers = new Map<string, MiddlewareHandler>();
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nano-banana-shared-workspace-busy-'));
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

        const initialPayload = {
            ...EMPTY_WORKSPACE_SNAPSHOT,
            history: [
                {
                    id: 'shared-turn-busy-1',
                    url: 'https://example.com/shared-busy.png',
                    prompt: 'Shared restore busy base',
                    aspectRatio: '1:1',
                    size: '2K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    createdAt: 20,
                },
            ],
            composerState: {
                ...EMPTY_WORKSPACE_SNAPSHOT.composerState,
                prompt: 'Shared restore busy base',
            },
        } satisfies WorkspacePersistenceSnapshot;

        const lockedPayload = {
            ...initialPayload,
            composerState: {
                ...initialPayload.composerState,
                prompt: 'Shared restore busy temp wins',
            },
        } satisfies WorkspacePersistenceSnapshot;

        const initialResponse = await invokeJsonRoute(workspaceSnapshotHandler!, initialPayload);
        expect(initialResponse.status).toBe(200);
        expect(initialResponse.body.success).toBe(true);

        const originalRenameSync = fs.renameSync.bind(fs);
        const originalCopyFileSync = fs.copyFileSync.bind(fs);
        const originalWriteFileSync = fs.writeFileSync.bind(fs);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const renameSyncSpy = vi.spyOn(fs, 'renameSync');
        const copyFileSyncSpy = vi.spyOn(fs, 'copyFileSync');
        const writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync');

        try {
            renameSyncSpy.mockImplementation(((from: fs.PathLike, to: fs.PathLike) => {
                if (String(from).endsWith('workspace_snapshot.json.tmp') && String(to).endsWith('workspace_snapshot.json')) {
                    const error = Object.assign(new Error('rename blocked by Windows file lock'), { code: 'EPERM' });
                    throw error;
                }

                return originalRenameSync(from, to);
            }) as typeof fs.renameSync);

            copyFileSyncSpy.mockImplementation(((from: fs.PathLike, to: fs.PathLike, mode?: number) => {
                if (String(from).endsWith('workspace_snapshot.json.tmp') && String(to).endsWith('workspace_snapshot.json')) {
                    const error = Object.assign(new Error('copy blocked by Windows file lock'), { code: 'EBUSY' });
                    throw error;
                }

                return originalCopyFileSync(from, to, mode);
            }) as typeof fs.copyFileSync);

            writeFileSyncSpy.mockImplementation(
                ((file: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView, options?: any) => {
                    if (typeof file === 'string' && file.endsWith('workspace_snapshot.json')) {
                        const error = Object.assign(new Error('final write blocked by Windows file lock'), {
                            code: 'EBUSY',
                        });
                        throw error;
                    }

                    return originalWriteFileSync(file, data as never, options);
                }) as typeof fs.writeFileSync,
            );

            const response = await invokeJsonRoute(workspaceSnapshotHandler!, lockedPayload);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(consoleErrorSpy).not.toHaveBeenCalled();

            const getResponse = await invokeGetRoute(workspaceSnapshotHandler!);
            expect(getResponse.status).toBe(200);
            expect(getResponse.body.composerState.prompt).toBe('Shared restore busy temp wins');
            const primaryPayload = JSON.parse(
                fs.readFileSync(path.join(outputDir, 'workspace_snapshot.json'), 'utf-8'),
            ) as WorkspacePersistenceSnapshot;
            const tempPayload = JSON.parse(
                fs.readFileSync(path.join(outputDir, 'workspace_snapshot.json.tmp'), 'utf-8'),
            ) as WorkspacePersistenceSnapshot;

            expect(primaryPayload.composerState.prompt).toBe('Shared restore busy base');
            expect(tempPayload.composerState.prompt).toBe('Shared restore busy temp wins');
            expect(fs.existsSync(path.join(outputDir, 'workspace_snapshot.json.tmp'))).toBe(true);
        } finally {
            renameSyncSpy.mockRestore();
            copyFileSyncSpy.mockRestore();
            writeFileSyncSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        }
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
        const promptImageToPromptHandler = missingKeyHandlers.get('/api/prompt/image-to-prompt');
        const batchGetHandler = batchHandlers.get('/api/batches/get');

        expect(promptEnhanceHandler).toBeTruthy();
        expect(promptImageToPromptHandler).toBeTruthy();
        expect(batchGetHandler).toBeTruthy();

        const promptResponse = await invokeJsonRoute(promptEnhanceHandler!, {
            currentPrompt: 'Refine this prompt',
            lang: 'en',
        });
        expect(promptResponse.status).toBe(503);
        expect(promptResponse.body.error).toContain('Missing GEMINI_API_KEY');

        const imageToPromptResponse = await invokeJsonRoute(promptImageToPromptHandler!, {
            imageDataUrl: `data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`,
            lang: 'en',
        });
        expect(imageToPromptResponse.status).toBe(503);
        expect(imageToPromptResponse.body.error).toContain('Missing GEMINI_API_KEY');

        const batchResponse = await invokeJsonRoute(batchGetHandler!, {
            name: 'batches/missing-job',
        });
        expect(batchResponse.status).toBe(404);
        expect(batchResponse.body.error).toBe('Batch not found');
    });

    it('registers direct rich enhance and random prompt routes with prompt-only segmentation support', async () => {
        generateContentMock
            .mockResolvedValueOnce({
                text: 'A lone traveler with a weathered face and rain-soaked dark trench coat stands in profile on a neon-lit dusk street, framed in a cinematic medium portrait with reflective puddles and drifting mist.\nCool backlight, warm rim highlights, teal and amber tones, wet fabric texture, slick pavement, atmospheric haze, moody realism, and polished layered depth.',
            })
            .mockResolvedValueOnce({
                text: 'A futuristic courier races through a dense cyberpunk alley with a glowing visor, wind-swept hair, and luminous techwear, captured in a low-angle cinematic shot with diagonal framing.\nTowering holograms, reflective pavement, layered signage, steam vents, electric cyan and magenta highlights, wet concrete, brushed metal, glossy holograms, high contrast, and immersive sci-fi atmosphere.',
            });

        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
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

        const promptEnhanceHandler = handlers.get('/api/prompt/enhance');
        const promptRandomHandler = handlers.get('/api/prompt/random');

        expect(promptEnhanceHandler).toBeTruthy();
        expect(promptRandomHandler).toBeTruthy();

        const enhanceResponse = await invokeJsonRoute(promptEnhanceHandler!, {
            currentPrompt: 'a lone traveler in the rain',
            lang: 'en',
        });
        const randomResponse = await invokeJsonRoute(promptRandomHandler!, {
            lang: 'en',
        });

        expect(enhanceResponse.status).toBe(200);
        expect(enhanceResponse.body.text).toContain('lone traveler');
        expect(enhanceResponse.body.text).toContain('\n');
        expect(enhanceResponse.body.text).toContain('neon-lit dusk street');
        expect(randomResponse.status).toBe(200);
        expect(randomResponse.body.text).toContain('futuristic courier');
        expect(randomResponse.body.text).toContain('\n');
        expect(randomResponse.body.text).toContain('cyberpunk alley');
        expect(generateContentMock).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                model: 'gemini-3-flash-preview',
                config: expect.objectContaining({
                    systemInstruction: expect.stringContaining('2-4 short prompt-only blocks separated by line breaks'),
                    temperature: 0.35,
                }),
                contents: expect.stringContaining('Current prompt: a lone traveler in the rain'),
            }),
        );
        const randomCall = generateContentMock.mock.calls[1]?.[0];

        expect(randomCall).toEqual(
            expect.objectContaining({
                model: 'gemini-3-flash-preview',
                config: expect.objectContaining({
                    systemInstruction: expect.stringContaining(
                        'Treat the scaffold as structure only and invent every subject, environment, prop, mood, style blend, and twist yourself.',
                    ),
                    temperature: 0.7,
                }),
                contents: expect.stringContaining('Scaffold family A - cinematic subject tableau:'),
            }),
        );
        expect(String(randomCall?.contents || '')).not.toContain('Theme:');
        expect(String(randomCall?.contents || '')).toContain('invent every bracketed value yourself');

        randomSpy.mockRestore();
    });

    it('registers the image-to-prompt route, forwards inline image content, and asks Gemini for the restored structured brief format', async () => {
        generateContentMock.mockResolvedValueOnce({
            text: '場景概述\n一張全身棚拍人像立於鮮明純紅背景前，場景極簡、乾淨且高度聚焦主體，淺色地面與紅色背景牆在畫面中形成清楚的交界與平順過渡。整體 setup 帶有專業攝影棚與時尚視覺導向，空間元素被壓到最低，只保留足以支撐主體存在感的舞台式背景。\n\n主體與構圖\n單一女性主體站在垂直畫面的中央區域，採全身入鏡的正面構圖，雙腿大幅分開站穩，形成明確且有張力的下盤支撐。雙臂向下延伸並在身前交叉於手腕位置，雙手握拳，姿態對稱而俐落。頭部略微傾斜，視線直接朝向鏡頭，讓人物與觀看者之間建立正面、強勢的視覺連結。\n\n視覺細節\n人物深色頭髮整齊收攏至耳後，五官乾淨清楚，表情克制而自信。上身穿著白色鈕扣襯衫，領口略開，袖子捲至手肘附近，布料保持俐落挺度並在手臂與軀幹處出現自然摺線。頸部懸掛細藍色識別帶，下身是黑色短裙，搭配貼膚透膚絲襪與黑色尖頭高跟鞋；若識別證文字存在，也應保持保守處理，僅在清楚可辨時才描述。\n\n光線與色彩\n背景紅色高度飽和，並可能帶有由上方較深、中央較亮的細微亮度漸層。人物受光明亮而均勻，接近專業棚燈的正面主光配置，讓白襯衫、黑短裙與紅背景形成鮮明 color blocking。淺色地面承接主體腳下的柔和陰影，整體對比乾淨俐落，輪廓邊緣清楚。\n\n氛圍與風格\n畫面氛圍帶有現代、強勢、帶節奏感的時尚棚拍語氣，兼具表演感與 editorial fashion 視覺。美術方向極簡、當代、色塊鮮明，依靠姿態、剪影與高對比色彩建立張力。\n\n建議提示詞\nA full-body studio fashion portrait of a poised young East Asian woman standing in a strong wide-legged stance against a saturated solid red backdrop, centered in a vertical frame with her arms extended downward and crossed at the wrists, fists clenched, head slightly tilted, and direct eye contact. Crisp white button-down shirt with rolled sleeves, blue lanyard, short black mini skirt, sheer skin-toned hosiery, and black pointed high heels, clean silhouette, structured fabric folds, bright even studio lighting, soft shadow on a pale floor, subtle red backdrop gradient, bold red-white-black color blocking, minimalist editorial staging, modern assertive energy, polished contemporary fashion photography.',
        });

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

        const promptImageToPromptHandler = handlers.get('/api/prompt/image-to-prompt');

        expect(promptImageToPromptHandler).toBeTruthy();

        const response = await invokeJsonRoute(promptImageToPromptHandler!, {
            imageDataUrl: `data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`,
            lang: 'zh_TW',
        });

        expect(response.status).toBe(200);
        expect(response.body.text).toContain('場景概述');
        expect(response.body.text).toContain('主體與構圖');
        expect(response.body.text).toContain('建議提示詞');
        expect(response.body.text).toContain('\n');
        expect(response.body.text).toContain('color blocking');
        const imageToPromptCall = generateContentMock.mock.calls[0]?.[0];

        expect(imageToPromptCall).toEqual(
            expect.objectContaining({
                model: 'gemini-3-flash-preview',
                config: expect.objectContaining({
                    systemInstruction: expect.stringContaining(
                        'Output a plain-text multi-section brief in this exact order: Scene Overview, Subjects and Composition, Visual Details, Lighting and Color, Mood and Style, Final Prompt.',
                    ),
                    temperature: 0.25,
                }),
            }),
        );
        expect(String(imageToPromptCall?.config?.systemInstruction || '')).toContain(
            'In Scene Overview, establish the environment, overall scale, genre or era cues, and any visible creative twist that reframes the scene.',
        );
        expect(String(imageToPromptCall?.config?.systemInstruction || '')).toContain(
            'visible depth-of-field behavior, and any hidden details that are truly present on closer inspection.',
        );
        expect(String(imageToPromptCall?.config?.systemInstruction || '')).toContain(
            'style fusion, and rendering finish.',
        );
        expect(imageToPromptCall?.contents?.[0]).toEqual(
            expect.objectContaining({
                inlineData: expect.objectContaining({
                    mimeType: 'image/png',
                    data: ONE_BY_ONE_PNG_BASE64,
                }),
            }),
        );
        expect(imageToPromptCall?.contents?.[1]).toEqual(
            expect.objectContaining({
                text: expect.stringContaining(
                    'Analyze this image carefully and return a structured image-to-prompt brief in the requested UI language.',
                ),
            }),
        );
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
