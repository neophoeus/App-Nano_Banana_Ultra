import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';
import { buildGenerateFileParts, buildGenerateParts } from '../plugins/utils/imageReferences';
import { registerBatchRoutes } from '../plugins/routes/batchRoutes';
import { registerGenerateRoutes } from '../plugins/routes/generateRoutes';
import { registerVideoRoutes } from '../plugins/routes/videoRoutes';
import { uploadReferenceVideo } from '../services/geminiService';

describe('videoRoutesAndReferences', () => {
    describe('buildGenerateParts & buildGenerateFileParts', () => {
        it('builds parts for public YouTube URL with default or custom MIME', () => {
            const parts = buildGenerateParts(
                {
                    prompt: 'A cinematic frame',
                    model: 'gemini-3.1-flash-image',
                    videoInput: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                },
                './output',
            );

            expect(parts).toEqual(
                expect.arrayContaining([
                    { text: '[Video_1]' },
                    expect.objectContaining({
                        fileData: {
                            fileUri: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                            mimeType: 'video/mp4',
                        },
                    }),
                    expect.objectContaining({
                        text: 'A cinematic frame',
                    }),
                ]),
            );
        });

        it('builds parts preserving normalized videoMimeType for Files API URIs', () => {
            const parts = buildGenerateParts(
                {
                    prompt: 'Analyze this clip',
                    model: 'gemini-nano-banana-2.1',
                    videoInput: 'https://generativelanguage.googleapis.com/v1beta/files/test1234',
                    videoMimeType: 'video/quicktime',
                },
                './output',
            );

            expect(parts).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        fileData: {
                            fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/test1234',
                            mimeType: 'video/mov',
                        },
                    }),
                ]),
            );
        });

        it('converts inline base64 video to inlineData part in buildGenerateParts', () => {
            const parts = buildGenerateParts(
                {
                    prompt: 'Generate stylized version',
                    model: 'gemini-3.1-flash-image',
                    videoInput: 'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJ8',
                },
                './output',
            );

            expect(parts).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        inlineData: {
                            mimeType: 'video/webm',
                            data: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJ8',
                        },
                    }),
                ]),
            );
        });

        it('handles videoInput in buildGenerateFileParts for batch jobs', async () => {
            const resolveFileMock = vi.fn().mockResolvedValue({
                fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/uploaded-batch-video',
                mimeType: 'video/mp4',
            });

            const parts = await buildGenerateFileParts(
                {
                    prompt: 'Batch video generation',
                    model: 'gemini-3.1-flash-image',
                    videoInput: 'https://www.youtube.com/watch?v=test1234567',
                    videoMimeType: 'video/mp4',
                },
                resolveFileMock,
            );

            expect(parts).toEqual(
                expect.arrayContaining([
                    { text: '[Video_1]' },
                    {
                        fileData: {
                            fileUri: 'https://www.youtube.com/watch?v=test1234567',
                            mimeType: 'video/mp4',
                        },
                    },
                    {
                        text: 'Batch video generation',
                    },
                ]),
            );
        });
    });

    describe('registerVideoRoutes (POST /api/videos/upload)', () => {
        let routeHandler: (req: any, res: any) => Promise<void>;
        const mockServer = {
            use: (path: string, handler: any) => {
                if (path === '/api/videos/upload') {
                    routeHandler = handler;
                }
            },
        };

        const mockFilesUpload = vi.fn();
        const mockFilesGet = vi.fn();
        const mockGetAIClient = vi.fn(() => ({
            files: {
                upload: mockFilesUpload,
                get: mockFilesGet,
            },
        }));

        beforeEach(() => {
            vi.clearAllMocks();
            registerVideoRoutes(mockServer, { getAIClient: mockGetAIClient as any });
        });

        it('rejects non-POST requests with 405', async () => {
            const req = { method: 'GET', headers: {} };
            const res = {
                writeHead: vi.fn(),
                end: vi.fn(),
            };

            await routeHandler(req, res);
            expect(res.writeHead).toHaveBeenCalledWith(405, expect.anything());
        });

        it('rejects unsupported video MIME type with 400', async () => {
            const req = {
                method: 'POST',
                headers: {
                    'x-video-filename': 'sample.pdf',
                    'x-video-mime-type': 'application/pdf',
                },
            };
            const res = {
                writeHead: vi.fn(),
                end: vi.fn(),
            };

            await routeHandler(req, res);
            expect(res.writeHead).toHaveBeenCalledWith(400, expect.anything());
            expect(res.end).toHaveBeenCalledWith(expect.stringContaining('Unsupported video MIME type'));
        });

        it('uploads video, polls PROCESSING to ACTIVE, and returns file details', async () => {
            mockFilesUpload.mockResolvedValueOnce({
                name: 'files/test-upload-name',
                uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-upload-name',
                mimeType: 'video/mp4',
                displayName: 'demo.mp4',
                state: 'PROCESSING',
                expirationTime: '2026-10-31T20:00:00Z',
            });

            mockFilesGet.mockResolvedValueOnce({
                name: 'files/test-upload-name',
                uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-upload-name',
                mimeType: 'video/mp4',
                displayName: 'demo.mp4',
                state: 'ACTIVE',
                expirationTime: '2026-10-31T20:00:00Z',
            });

            class MockRequest extends EventEmitter {
                method = 'POST';
                headers = {
                    'x-video-filename': 'demo.mp4',
                    'x-video-mime-type': 'video/mp4',
                };
                pipe(destination: any) {
                    process.nextTick(() => {
                        const chunk = Buffer.from('FAKE_VIDEO_BINARY_DATA');
                        this.emit('data', chunk);
                        destination.write(chunk);
                        destination.end();
                    });
                    return destination;
                }
            }

            const req = new MockRequest();
            const res = {
                writeHead: vi.fn(),
                end: vi.fn(),
            };

            await routeHandler(req, res);

            expect(mockFilesUpload).toHaveBeenCalledTimes(1);
            expect(mockFilesGet).toHaveBeenCalledWith({ name: 'files/test-upload-name' });
            expect(res.writeHead).toHaveBeenCalledWith(200, expect.anything());
            expect(res.end).toHaveBeenCalledWith(
                expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/files/test-upload-name'),
            );
            const responseJson = JSON.parse(String(res.end.mock.calls[0]?.[0] || '{}'));
            expect(responseJson.sizeBytes).toBe(Buffer.byteLength('FAKE_VIDEO_BINARY_DATA'));
        });

        it('aborts early without calling Gemini Files API when client aborts stream mid-upload', async () => {
            class MidStreamAbortRequest extends EventEmitter {
                method = 'POST';
                headers = {
                    'x-video-filename': '..\\..\\unsafe\u0000name.mp4',
                    'x-video-mime-type': 'video/mp4',
                };
                complete = false;
                unpipe = vi.fn();
                pipe(destination: any) {
                    process.nextTick(() => {
                        const chunk = Buffer.from('PARTIAL_VIDEO_BYTES');
                        this.emit('data', chunk);
                        destination.write(chunk);
                        this.emit('aborted');
                    });
                    return destination;
                }
            }

            const req = new MidStreamAbortRequest();
            const res = {
                writeHead: vi.fn(),
                end: vi.fn(),
            };

            await routeHandler(req, res);
            expect(mockFilesUpload).not.toHaveBeenCalled();
            expect(res.writeHead).not.toHaveBeenCalledWith(200, expect.anything());
        });

        it('rejects uploads exceeding size limit with 413', async () => {
            class OversizedMockRequest extends EventEmitter {
                method = 'POST';
                headers = {
                    'x-video-filename': 'huge.mp4',
                    'x-video-mime-type': 'video/mp4',
                };
                unpipe = vi.fn();
                resume = vi.fn();
                pipe(destination: any) {
                    process.nextTick(() => {
                        // Emit a chunk exceeding 200MB
                        const oversizedChunk = { length: 201 * 1024 * 1024 } as Buffer;
                        this.emit('data', oversizedChunk);
                    });
                    return destination;
                }
            }

            const req = new OversizedMockRequest();
            const res = {
                writeHead: vi.fn(),
                end: vi.fn(),
            };

            await routeHandler(req, res);
            expect(res.writeHead).toHaveBeenCalledWith(413, expect.anything());
            expect(res.end).toHaveBeenCalledWith(expect.stringContaining('200MB'));
        });

        it('returns 422 when Gemini Files API reports state FAILED', async () => {
            mockFilesUpload.mockResolvedValueOnce({
                name: 'files/failed-upload',
                uri: 'https://generativelanguage.googleapis.com/v1beta/files/failed-upload',
                mimeType: 'video/mp4',
                displayName: 'demo.mp4',
                state: 'FAILED',
            });

            class FailedMockRequest extends EventEmitter {
                method = 'POST';
                headers = {
                    'x-video-filename': 'demo.mp4',
                    'x-video-mime-type': 'video/mp4',
                };
                pipe(destination: any) {
                    process.nextTick(() => {
                        const chunk = Buffer.from('FAKE_VIDEO_BINARY_DATA');
                        this.emit('data', chunk);
                        destination.write(chunk);
                        destination.end();
                    });
                    return destination;
                }
            }

            const req = new FailedMockRequest();
            const res = {
                writeHead: vi.fn(),
                end: vi.fn(),
            };

            await routeHandler(req, res);
            expect(res.writeHead).toHaveBeenCalledWith(422, expect.anything());
            expect(res.end).toHaveBeenCalledWith(expect.stringContaining('Video processing failed'));
        });

        it('returns without sending response when client connection is destroyed during polling', async () => {
            mockFilesUpload.mockResolvedValueOnce({
                name: 'files/aborted-upload',
                uri: 'https://generativelanguage.googleapis.com/v1beta/files/aborted-upload',
                mimeType: 'video/mp4',
                displayName: 'demo.mp4',
                state: 'PROCESSING',
            });

            class AbortedMockRequest extends EventEmitter {
                method = 'POST';
                headers = {
                    'x-video-filename': 'demo.mp4',
                    'x-video-mime-type': 'video/mp4',
                };
                destroyed = true;
                pipe(destination: any) {
                    process.nextTick(() => {
                        const chunk = Buffer.from('FAKE_VIDEO_BINARY_DATA');
                        this.emit('data', chunk);
                        destination.write(chunk);
                        destination.end();
                    });
                    return destination;
                }
            }

            const req = new AbortedMockRequest();
            const res = {
                writeHead: vi.fn(),
                end: vi.fn(),
                writableEnded: false,
            };

            await routeHandler(req, res);
            expect(res.writeHead).not.toHaveBeenCalledWith(200, expect.anything());
        });
    });

    describe('uploadReferenceVideo (client service)', () => {
        afterEach(() => {
            vi.unstubAllGlobals();
            vi.restoreAllMocks();
        });

        it('calls /api/videos/upload with octet-stream body and returns parsed response', async () => {
            const mockResponseData = {
                fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/vid-xyz',
                mimeType: 'video/mp4',
                name: 'files/vid-xyz',
                displayName: 'sample.mp4',
                expiresAt: '2026-10-31T22:00:00Z',
            };

            const fetchMock = vi.fn().mockResolvedValue(
                new Response(JSON.stringify(mockResponseData), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }),
            );
            vi.stubGlobal('fetch', fetchMock);

            const file = new File(['mock-bytes'], 'sample.mp4', { type: 'video/mp4' });
            const result = await uploadReferenceVideo(file);

            expect(fetchMock).toHaveBeenCalledWith(
                '/api/videos/upload',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/octet-stream',
                        'X-Video-Filename': 'sample.mp4',
                        'X-Video-Mime-Type': 'video/mp4',
                    }),
                    body: file,
                }),
            );
            expect(result).toEqual(mockResponseData);
        });

        it('throws descriptive error on failure', async () => {
            const fetchMock = vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ error: 'Video upload payload exceeds limit' }), {
                    status: 413,
                    headers: { 'Content-Type': 'application/json' },
                }),
            );
            vi.stubGlobal('fetch', fetchMock);

            const file = new File(['mock-bytes'], 'sample.mp4', { type: 'video/mp4' });
            await expect(uploadReferenceVideo(file)).rejects.toThrow('Video upload payload exceeds limit');
        });
    });

    describe('route-level graceful stripping of videoInput for unsupported models', () => {
        it('ignores residual videoInput on /api/images/generate when model is gemini-3-pro-image', async () => {
            let generateHandler: ((req: any, res: any) => Promise<void>) | null = null;
            const mockServer = {
                use: (routePath: string, handler: any) => {
                    if (routePath === '/api/images/generate') {
                        generateHandler = handler;
                    }
                },
            };
            const generateContentMock = vi.fn().mockResolvedValue({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: 'image/png',
                                        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                                    },
                                },
                            ],
                        },
                    },
                ],
            });

            registerGenerateRoutes(mockServer, {
                getAIClient: () => ({ models: { generateContent: generateContentMock } }) as any,
                resolvedDir: './output',
            });

            class JsonRequest extends EventEmitter {
                method = 'POST';
                headers = { 'content-type': 'application/json' };
            }
            const req = new JsonRequest();
            const res = {
                writeHead: vi.fn(),
                end: vi.fn(),
            };

            const promise = generateHandler!(req, res);
            req.emit(
                'data',
                Buffer.from(
                    JSON.stringify({
                        model: 'gemini-3-pro-image',
                        prompt: 'A pro studio portrait',
                        videoInput: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoMimeType: 'video/mp4',
                    }),
                ),
            );
            req.emit('end');
            await promise;

            expect(res.writeHead).toHaveBeenCalledWith(200, expect.anything());
            expect(generateContentMock).toHaveBeenCalledTimes(1);
            const sentContents = generateContentMock.mock.calls[0]?.[0]?.contents;
            const serializedContents = JSON.stringify(sentContents);
            expect(serializedContents).not.toContain('dQw4w9WgXcQ');
            expect(serializedContents).not.toContain('[Video_1]');
        });

        it('ignores residual videoInput on /api/batches/create when model is gemini-3-pro-image', async () => {
            let batchCreateHandler: ((req: any, res: any) => Promise<void>) | null = null;
            const mockServer = {
                use: (routePath: string, handler: any) => {
                    if (routePath === '/api/batches/create') {
                        batchCreateHandler = handler;
                    }
                },
            };
            const filesUploadMock = vi.fn().mockResolvedValue({
                name: 'files/manifest-1',
                uri: 'https://generativelanguage.googleapis.com/v1beta/files/manifest-1',
                state: 'ACTIVE',
            });
            const batchesCreateMock = vi.fn().mockResolvedValue({
                name: 'batches/job-1',
                displayName: 'pro-batch',
                state: 'JOB_STATE_PENDING',
            });

            registerBatchRoutes(mockServer, {
                getAIClient: () =>
                    ({
                        files: { upload: filesUploadMock, get: vi.fn() },
                        batches: { create: batchesCreateMock },
                    }) as any,
                resolvedDir: './output',
            });

            class JsonRequest extends EventEmitter {
                method = 'POST';
                headers = { 'content-type': 'application/json' };
            }
            const req = new JsonRequest();
            const res = {
                writeHead: vi.fn(),
                end: vi.fn(),
            };

            const promise = batchCreateHandler!(req, res);
            req.emit(
                'data',
                Buffer.from(
                    JSON.stringify({
                        model: 'gemini-3-pro-image',
                        prompt: 'A pro studio batch',
                        requestCount: 1,
                        videoInput: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        videoMimeType: 'video/mp4',
                    }),
                ),
            );
            req.emit('end');
            await promise;

            expect(res.writeHead).toHaveBeenCalledWith(200, expect.anything());
            expect(batchesCreateMock).toHaveBeenCalledTimes(1);
        });
    });
});
