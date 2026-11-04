import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_FREE_TIER_MODELS,
    MISSING_API_KEY_ERROR_MESSAGE,
    createApiClientRouter,
    parseFreeTierModels,
    resolveApiKeyConfig,
    resolveApiKeySelection,
    resolveTargetApiKeyTier,
} from '../plugins/utils/apiKeyRouter';
import { classifyApiErrorStatus } from '../plugins/utils/apiHelpers';
import { registerBatchRoutes } from '../plugins/routes/batchRoutes';
import { registerVideoRoutes } from '../plugins/routes/videoRoutes';

// Records which API key each upstream call was made with, so routing can be asserted end-to-end.
const generateContentCalls: Array<{ apiKey: string; model: string }> = [];
const generateContentImpl = vi.fn();

vi.mock('@google/genai/node', () => {
    class MockGoogleGenAI {
        apiKey: string;
        models: { generateContent: (args: { model: string }) => unknown };

        constructor(options: { apiKey: string }) {
            this.apiKey = options.apiKey;
            this.models = {
                generateContent: (args: { model: string }) => {
                    generateContentCalls.push({ apiKey: this.apiKey, model: args.model });
                    return generateContentImpl(args);
                },
            };
        }
    }

    return {
        GoogleGenAI: MockGoogleGenAI,
        HarmBlockThreshold: { OFF: 'OFF', BLOCK_NONE: 'BLOCK_NONE', BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH' },
        HarmCategory: {
            HARM_CATEGORY_HARASSMENT: 'harassment',
            HARM_CATEGORY_HATE_SPEECH: 'hate',
            HARM_CATEGORY_SEXUALLY_EXPLICIT: 'sexual',
            HARM_CATEGORY_DANGEROUS_CONTENT: 'danger',
        },
        Modality: { IMAGE: 'IMAGE', TEXT: 'TEXT' },
        ThinkingLevel: { MINIMAL: 'MINIMAL', LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
        PartMediaResolutionLevel: {
            MEDIA_RESOLUTION_UNSPECIFIED: 'MEDIA_RESOLUTION_UNSPECIFIED',
            MEDIA_RESOLUTION_LOW: 'MEDIA_RESOLUTION_LOW',
            MEDIA_RESOLUTION_MEDIUM: 'MEDIA_RESOLUTION_MEDIUM',
            MEDIA_RESOLUTION_HIGH: 'MEDIA_RESOLUTION_HIGH',
            MEDIA_RESOLUTION_ULTRA_HIGH: 'MEDIA_RESOLUTION_ULTRA_HIGH',
        },
    };
});

type MiddlewareHandler = (req: any, res: any) => void | Promise<void>;

const ONE_BY_ONE_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRWQAAAAASUVORK5CYII=';

const invokeRoute = async (handler: MiddlewareHandler, body?: unknown, method = 'POST') => {
    const request = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as Readable & {
        method: string;
        url: string;
        headers: Record<string, string>;
    };
    request.method = method;
    request.url = '/';
    request.headers = { host: '127.0.0.1:22287' };

    return await new Promise<{ status: number; body: any; raw: string }>((resolve, reject) => {
        let status = 200;
        const res = {
            writeHead(nextStatus: number) {
                status = nextStatus;
            },
            end(payload: string) {
                try {
                    resolve({ status, body: JSON.parse(payload), raw: payload });
                } catch (error) {
                    reject(error);
                }
            },
        };

        Promise.resolve(handler(request, res)).catch(reject);
    });
};

const configurePluginHandlers = async (options: Record<string, unknown>) => {
    const { imageSavePlugin } = await import('../plugins/imageSavePlugin');
    const handlers = new Map<string, MiddlewareHandler>();
    const plugin = imageSavePlugin(options as any);
    const configureServer =
        typeof plugin.configureServer === 'function' ? plugin.configureServer : plugin.configureServer?.handler;

    configureServer?.({
        middlewares: {
            use(route: string, handler: MiddlewareHandler) {
                handlers.set(route, handler);
            },
        },
    } as any);

    return handlers;
};

const IMAGE_RESPONSE = {
    candidates: [
        {
            content: { parts: [{ inlineData: { mimeType: 'image/png', data: ONE_BY_ONE_PNG_BASE64 } }] },
        },
    ],
    promptFeedback: {},
};

const EMPTY_ENV: Record<string, string | undefined> = {};

describe('apiKeyRouter', () => {
    describe('parseFreeTierModels', () => {
        it('defaults to free-tier models (gemini-3.8-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite) when nothing is configured', () => {
            expect([...parseFreeTierModels()]).toEqual([...DEFAULT_FREE_TIER_MODELS]);
            expect([...parseFreeTierModels('  , ,')]).toEqual([...DEFAULT_FREE_TIER_MODELS]);
            expect([...parseFreeTierModels([])]).toEqual([...DEFAULT_FREE_TIER_MODELS]);
        });

        it('parses comma-separated strings and arrays with trimming', () => {
            expect([...parseFreeTierModels(' gemini-3.8-flash , gemini-3.5-flash-lite ')]).toEqual([
                'gemini-3.8-flash',
                'gemini-3.5-flash-lite',
            ]);
            expect([...parseFreeTierModels(['gemini-3.1-flash-lite', ' '])]).toEqual(['gemini-3.1-flash-lite']);
        });
    });

    describe('resolveApiKeyConfig', () => {
        it('resolves dual mode from explicit options', () => {
            const config = resolveApiKeyConfig({
                geminiPaidApiKey: 'paid-key',
                geminiFreeApiKey: 'free-key',
                env: EMPTY_ENV,
            });

            expect(config).toEqual(
                expect.objectContaining({
                    paidApiKey: 'paid-key',
                    freeApiKey: 'free-key',
                    hasApiKey: true,
                    hasPaidApiKey: true,
                    hasFreeApiKey: true,
                    apiKeyTierMode: 'dual',
                }),
            );
        });

        it('treats legacy GEMINI_API_KEY as the paid key and prefers explicit paid key over it', () => {
            expect(resolveApiKeyConfig({ geminiApiKey: 'legacy', env: EMPTY_ENV }).paidApiKey).toBe('legacy');
            expect(
                resolveApiKeyConfig({ geminiApiKey: 'legacy', geminiPaidApiKey: 'paid', env: EMPTY_ENV }).paidApiKey,
            ).toBe('paid');
            expect(resolveApiKeyConfig({ env: { GEMINI_API_KEY: 'env-legacy' } }).apiKeyTierMode).toBe('paid-only');
        });

        it('reads keys from env when options are absent', () => {
            const config = resolveApiKeyConfig({
                env: {
                    GEMINI_PAID_API_KEY: 'env-paid',
                    GEMINI_FREE_API_KEY: 'env-free',
                    GEMINI_FREE_TIER_MODELS: 'gemini-3.8-flash,gemini-3.5-flash-lite',
                },
            });

            expect(config.paidApiKey).toBe('env-paid');
            expect(config.freeApiKey).toBe('env-free');
            expect(config.freeTierModels.has('gemini-3.5-flash-lite')).toBe(true);
        });

        it('ignores blank, quoted-blank, and template placeholder values', () => {
            const config = resolveApiKeyConfig({
                geminiApiKey: 'YOUR_API_KEY_HERE',
                geminiPaidApiKey: '   ',
                geminiFreeApiKey: '""',
                env: { GEMINI_FREE_API_KEY: 'YOUR_FREE_API_KEY_HERE', GEMINI_PAID_API_KEY: "'YOUR_PAID_API_KEY_HERE'" },
            });

            expect(config.hasApiKey).toBe(false);
            expect(config.apiKeyTierMode).toBe('missing');
        });

        it('strips surrounding quotes and whitespace from real keys', () => {
            const config = resolveApiKeyConfig({ geminiFreeApiKey: '  "free-key"  ', env: EMPTY_ENV });

            expect(config.freeApiKey).toBe('free-key');
            expect(config.apiKeyTierMode).toBe('free-only');
        });
    });

    describe('resolveTargetApiKeyTier', () => {
        it('routes free-tier models to free and everything else to paid', () => {
            expect(resolveTargetApiKeyTier({ model: 'gemini-3.8-flash' })).toBe('free');
            expect(resolveTargetApiKeyTier('gemini-3.8-flash')).toBe('free');
            expect(resolveTargetApiKeyTier({ model: 'gemini-3.5-flash-lite' })).toBe('free');
            expect(resolveTargetApiKeyTier({ model: 'gemini-3.1-flash-lite' })).toBe('free');
            expect(resolveTargetApiKeyTier({ model: 'gemini-nano-banana-2.1' })).toBe('paid');
            expect(resolveTargetApiKeyTier({ model: 'gemini-3-pro-image' })).toBe('paid');
            expect(resolveTargetApiKeyTier()).toBe('paid');
        });

        it('honours an explicit tier request', () => {
            expect(resolveTargetApiKeyTier({ model: 'gemini-nano-banana-2.1', tier: 'free' })).toBe('free');
            expect(resolveTargetApiKeyTier({ model: 'gemini-3.8-flash', tier: 'paid' })).toBe('paid');
        });

        it('forces paid for grounding, batch, and files API even when free is requested', () => {
            const freeModels = new Set(['gemini-3.8-flash', 'gemini-3.1-flash-lite-image']);

            expect(resolveTargetApiKeyTier({ model: 'gemini-3.8-flash', googleSearch: true }, freeModels)).toBe('paid');
            expect(
                resolveTargetApiKeyTier({ model: 'gemini-3.1-flash-lite-image', imageSearch: true }, freeModels),
            ).toBe('paid');
            expect(resolveTargetApiKeyTier({ tier: 'free', requiresBatch: true }, freeModels)).toBe('paid');
            expect(resolveTargetApiKeyTier({ tier: 'free', requiresFilesApi: true }, freeModels)).toBe('paid');
        });

        it('lets custom free tier models route to free', () => {
            const freeModels = new Set(['gemini-3.1-flash-lite-image']);
            expect(resolveTargetApiKeyTier({ model: 'gemini-3.1-flash-lite-image' }, freeModels)).toBe('free');
            expect(resolveTargetApiKeyTier({ model: 'gemini-3.8-flash' }, freeModels)).toBe('paid');
        });
    });

    describe('resolveApiKeySelection', () => {
        const dualConfig = resolveApiKeyConfig({
            geminiPaidApiKey: 'paid-key',
            geminiFreeApiKey: 'free-key',
            env: EMPTY_ENV,
        });

        it('selects the matching key in dual mode without fallback', () => {
            expect(resolveApiKeySelection(dualConfig, { model: 'gemini-3.8-flash' })).toEqual({
                apiKey: 'free-key',
                effectiveTier: 'free',
                requestedTier: 'free',
                isFallback: false,
            });
            expect(resolveApiKeySelection(dualConfig, { model: 'gemini-nano-banana-2.1' })).toEqual({
                apiKey: 'paid-key',
                effectiveTier: 'paid',
                requestedTier: 'paid',
                isFallback: false,
            });
        });

        it('falls back to the paid key when only a paid/legacy key exists', () => {
            const config = resolveApiKeyConfig({ geminiApiKey: 'legacy-key', env: EMPTY_ENV });

            expect(resolveApiKeySelection(config, { model: 'gemini-3.8-flash' })).toEqual({
                apiKey: 'legacy-key',
                effectiveTier: 'paid',
                requestedTier: 'free',
                isFallback: true,
            });
        });

        it('falls back to the free key when only a free key exists', () => {
            const config = resolveApiKeyConfig({ geminiFreeApiKey: 'free-key', env: EMPTY_ENV });

            expect(resolveApiKeySelection(config, { model: 'gemini-nano-banana-2.1' })).toEqual({
                apiKey: 'free-key',
                effectiveTier: 'free',
                requestedTier: 'paid',
                isFallback: true,
            });
        });

        it('throws a 503-classified missing key error when no key is configured', () => {
            const config = resolveApiKeyConfig({ env: EMPTY_ENV });
            let caught: unknown;

            try {
                resolveApiKeySelection(config, { model: 'gemini-3.8-flash' });
            } catch (error) {
                caught = error;
            }

            expect(caught).toBeInstanceOf(Error);
            expect((caught as Error).message).toBe(MISSING_API_KEY_ERROR_MESSAGE);
            expect(classifyApiErrorStatus(caught, 500)).toBe(503);
        });
    });

    describe('createApiClientRouter', () => {
        it('caches one client per distinct API key and isolates free/paid clients', () => {
            const clientFactory = vi.fn((apiKey: string) => ({ apiKey }) as any);
            const router = createApiClientRouter(
                { geminiPaidApiKey: 'paid-key', geminiFreeApiKey: 'free-key', env: EMPTY_ENV },
                clientFactory,
            );

            const freeClientA = router.getAIClient({ model: 'gemini-3.8-flash', tier: 'free' });
            const freeClientB = router.getAIClient('gemini-3.8-flash');
            const paidClientA = router.getAIClient({ model: 'gemini-nano-banana-2.1' });
            const paidClientB = router.getAIClient({ tier: 'paid', requiresBatch: true });

            expect(freeClientA).toBe(freeClientB);
            expect(paidClientA).toBe(paidClientB);
            expect(freeClientA).not.toBe(paidClientA);
            expect((freeClientA as any).apiKey).toBe('free-key');
            expect((paidClientA as any).apiKey).toBe('paid-key');
            expect(clientFactory).toHaveBeenCalledTimes(2);
        });

        it('shares a single client when only one key is configured', () => {
            const clientFactory = vi.fn((apiKey: string) => ({ apiKey }) as any);
            const router = createApiClientRouter({ geminiApiKey: 'legacy-key', env: EMPTY_ENV }, clientFactory);

            expect(router.getAIClient('gemini-3.8-flash')).toBe(router.getAIClient('gemini-3-pro-image'));
            expect(clientFactory).toHaveBeenCalledTimes(1);
        });

        it('reads env lazily so keys added later are picked up', () => {
            const env: Record<string, string | undefined> = {};
            const clientFactory = vi.fn((apiKey: string) => ({ apiKey }) as any);
            const router = createApiClientRouter({ env }, clientFactory);

            expect(() => router.getAIClient('gemini-3.8-flash')).toThrow(MISSING_API_KEY_ERROR_MESSAGE);
            env.GEMINI_FREE_API_KEY = 'late-free-key';

            expect((router.getAIClient('gemini-3.8-flash') as any).apiKey).toBe('late-free-key');
            expect(router.getConfig().apiKeyTierMode).toBe('free-only');
            expect(router.getSelection('gemini-3.8-flash').effectiveTier).toBe('free');
        });
    });
});

describe('dual API key routing through backend routes', () => {
    beforeEach(() => {
        generateContentCalls.length = 0;
        generateContentImpl.mockReset();
        // Keep developer machine env keys from leaking into routing assertions.
        vi.stubEnv('GEMINI_API_KEY', '');
        vi.stubEnv('GEMINI_PAID_API_KEY', '');
        vi.stubEnv('GEMINI_FREE_API_KEY', '');
        vi.stubEnv('GEMINI_FREE_TIER_MODELS', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('sends prompt tools with the free key in eco mode and image generation with the paid key', async () => {
        generateContentImpl.mockResolvedValueOnce({ text: 'An enhanced prompt' }).mockResolvedValueOnce(IMAGE_RESPONSE);
        const handlers = await configurePluginHandlers({ geminiPaidApiKey: 'paid-key', geminiFreeApiKey: 'free-key' });

        const enhanceResponse = await invokeRoute(handlers.get('/api/prompt/enhance')!, {
            currentPrompt: 'a cat',
            lang: 'en',
            optimizationMode: 'eco',
        });
        const generateResponse = await invokeRoute(handlers.get('/api/images/generate')!, {
            prompt: 'a cat',
            model: 'gemini-nano-banana-2.1',
            imageSize: '1K',
            outputFormat: 'images-only',
            thinkingLevel: 'minimal',
        });

        expect(enhanceResponse.status).toBe(200);
        expect(generateResponse.status).toBe(200);
        expect(generateContentCalls).toEqual([
            { apiKey: 'free-key', model: 'gemini-3.8-flash' },
            { apiKey: 'paid-key', model: 'gemini-nano-banana-2.1' },
        ]);
    });

    it('sends prompt tools with the paid key in quality mode', async () => {
        generateContentImpl.mockResolvedValueOnce({ text: 'An enhanced prompt in quality mode' });
        const handlers = await configurePluginHandlers({ geminiPaidApiKey: 'paid-key', geminiFreeApiKey: 'free-key' });

        const enhanceResponse = await invokeRoute(handlers.get('/api/prompt/enhance')!, {
            currentPrompt: 'a cat',
            lang: 'en',
            optimizationMode: 'quality',
        });

        expect(enhanceResponse.status).toBe(200);
        expect(generateContentCalls).toEqual([{ apiKey: 'paid-key', model: 'gemini-3.8-flash' }]);
    });

    it('routes a custom free-tier image model to the free key unless grounding is enabled', async () => {
        generateContentImpl.mockResolvedValue(IMAGE_RESPONSE);
        const handlers = await configurePluginHandlers({
            geminiPaidApiKey: 'paid-key',
            geminiFreeApiKey: 'free-key',
            freeTierModels: 'gemini-3.8-flash,gemini-nano-banana-2.1',
        });
        const generateHandler = handlers.get('/api/images/generate')!;
        const baseBody = {
            prompt: 'a lighthouse',
            model: 'gemini-nano-banana-2.1',
            imageSize: '1K',
            outputFormat: 'images-only',
            thinkingLevel: 'minimal',
        };

        const plainResponse = await invokeRoute(generateHandler, baseBody);
        const groundedResponse = await invokeRoute(generateHandler, { ...baseBody, googleSearch: true });
        const videoResponse = await invokeRoute(generateHandler, {
            ...baseBody,
            videoInput: 'https://generativelanguage.googleapis.com/v1beta/files/clip-1',
            videoMimeType: 'video/mp4',
        });

        expect(plainResponse.status).toBe(200);
        expect(groundedResponse.status).toBe(200);
        expect(videoResponse.status).toBe(200);
        // Files API video URIs belong to the paid project, so they force the paid key like grounding does.
        expect(generateContentCalls.map((call) => call.apiKey)).toEqual(['free-key', 'paid-key', 'paid-key']);
    });

    it('runs safety keyword analysis with the free key after a paid image generation is blocked', async () => {
        generateContentImpl
            .mockResolvedValueOnce({ candidates: [{ finishReason: 'IMAGE_SAFETY', content: { parts: [] } }] })
            .mockResolvedValueOnce({ text: 'weapon' });
        const handlers = await configurePluginHandlers({ geminiPaidApiKey: 'paid-key', geminiFreeApiKey: 'free-key' });

        const response = await invokeRoute(handlers.get('/api/images/generate')!, {
            prompt: 'a blocked prompt',
            model: 'gemini-nano-banana-2.1',
            imageSize: '1K',
            outputFormat: 'images-only',
            thinkingLevel: 'minimal',
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.failure?.code).toBe('safety-blocked');
        expect(generateContentCalls).toEqual([
            { apiKey: 'paid-key', model: 'gemini-nano-banana-2.1' },
            { apiKey: 'free-key', model: 'gemini-3.8-flash' },
        ]);
    });

    it('falls back to the legacy single key for prompt tools when no free key is configured', async () => {
        generateContentImpl.mockResolvedValueOnce({ text: 'Random prompt' });
        const handlers = await configurePluginHandlers({ geminiApiKey: 'legacy-key' });

        const response = await invokeRoute(handlers.get('/api/prompt/random')!, { lang: 'en' });

        expect(response.status).toBe(200);
        expect(generateContentCalls).toEqual([{ apiKey: 'legacy-key', model: 'gemini-3.8-flash' }]);
    });

    it('returns 503 from prompt tools when no key is configured at all', async () => {
        const handlers = await configurePluginHandlers({});

        const response = await invokeRoute(handlers.get('/api/prompt/enhance')!, { currentPrompt: 'x', lang: 'en' });

        expect(response.status).toBe(503);
        expect(response.body.error).toContain('Missing GEMINI_API_KEY');
        expect(generateContentCalls).toHaveLength(0);
    });

    it('reports dual key status on runtime-config and health without exposing key values', async () => {
        const handlers = await configurePluginHandlers({
            geminiPaidApiKey: 'paid-secret-value',
            geminiFreeApiKey: 'free-secret-value',
        });

        const runtimeResponse = await invokeRoute(handlers.get('/api/runtime-config')!, undefined, 'GET');
        const healthResponse = await invokeRoute(handlers.get('/api/health')!, undefined, 'GET');

        expect(runtimeResponse.body).toEqual({
            hasApiKey: true,
            hasPaidApiKey: true,
            hasFreeApiKey: true,
            apiKeyTierMode: 'dual',
        });
        expect(healthResponse.body).toEqual(
            expect.objectContaining({
                ok: true,
                hasApiKey: true,
                hasPaidApiKey: true,
                hasFreeApiKey: true,
                apiKeyTierMode: 'dual',
            }),
        );
        for (const raw of [runtimeResponse.raw, healthResponse.raw]) {
            expect(raw).not.toContain('paid-secret-value');
            expect(raw).not.toContain('free-secret-value');
        }
    });

    it('reports paid-only mode for a legacy single key and missing mode without keys', async () => {
        const legacyHandlers = await configurePluginHandlers({ geminiApiKey: 'legacy-key' });
        const missingHandlers = await configurePluginHandlers({});

        const legacyResponse = await invokeRoute(legacyHandlers.get('/api/runtime-config')!, undefined, 'GET');
        const missingResponse = await invokeRoute(missingHandlers.get('/api/runtime-config')!, undefined, 'GET');

        expect(legacyResponse.body).toEqual({
            hasApiKey: true,
            hasPaidApiKey: true,
            hasFreeApiKey: false,
            apiKeyTierMode: 'paid-only',
        });
        expect(missingResponse.body).toEqual({
            hasApiKey: false,
            hasPaidApiKey: false,
            hasFreeApiKey: false,
            apiKeyTierMode: 'missing',
        });
    });

    it('requests the paid batch client for batch routes', async () => {
        const handlers = new Map<string, MiddlewareHandler>();
        const batchesGet = vi.fn().mockResolvedValue({ name: 'batches/job-1', state: 'JOB_STATE_RUNNING' });
        const getAIClient = vi.fn(() => ({ batches: { get: batchesGet } }) as any);

        registerBatchRoutes(
            { use: (route: string, handler: MiddlewareHandler) => handlers.set(route, handler) },
            {
                getAIClient,
                resolvedDir: './output-test',
            },
        );

        const response = await invokeRoute(handlers.get('/api/batches/get')!, { name: 'batches/job-1' });

        expect(response.status).toBe(200);
        expect(getAIClient).toHaveBeenCalledWith({ tier: 'paid', requiresBatch: true });
    });

    it('requests the paid files client for video uploads', async () => {
        const { EventEmitter } = await import('node:events');
        const handlers = new Map<string, MiddlewareHandler>();
        const getAIClient = vi.fn(
            () =>
                ({
                    files: {
                        upload: vi.fn().mockResolvedValue({
                            name: 'files/video-1',
                            uri: 'https://generativelanguage.googleapis.com/v1beta/files/video-1',
                            mimeType: 'video/mp4',
                            state: 'ACTIVE',
                        }),
                        get: vi.fn(),
                    },
                }) as any,
        );

        registerVideoRoutes(
            { use: (route: string, handler: MiddlewareHandler) => handlers.set(route, handler) },
            {
                getAIClient,
            },
        );

        class VideoRequest extends EventEmitter {
            method = 'POST';
            headers = { 'x-video-filename': 'clip.mp4', 'x-video-mime-type': 'video/mp4' };
            pipe(destination: any) {
                process.nextTick(() => {
                    const chunk = Buffer.from('VIDEO_BYTES');
                    this.emit('data', chunk);
                    destination.write(chunk);
                    destination.end();
                });
                return destination;
            }
        }

        const res = { writeHead: vi.fn(), end: vi.fn() };
        await handlers.get('/api/videos/upload')!(new VideoRequest(), res);

        expect(res.writeHead).toHaveBeenCalledWith(200, expect.anything());
        expect(getAIClient).toHaveBeenCalledWith({ tier: 'paid', requiresFilesApi: true });
    });
});
