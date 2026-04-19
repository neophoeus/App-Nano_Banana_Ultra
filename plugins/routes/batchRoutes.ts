import fs from 'fs';
import os from 'os';
import path from 'path';
import { GoogleGenAI } from '@google/genai/node';
import type { ConversationRequestContext } from '../../types';
import { VALID_IMAGE_MODELS, VALID_IMAGE_SIZES } from '../../utils/modelCapabilities';
import { readJsonBody, sendClassifiedApiError, sendJson } from '../utils/apiHelpers';
import { extractBatchImportResults, serializeBatchJob } from '../utils/batchHelpers';
import { buildGenerateFileParts, normalizeReferenceImages, resolveLocalImageInputFile } from '../utils/imageReferences';
import { buildImageRequestConfig, validateCapabilityRequest } from '../utils/requestConfig';
import { extractGeneratedContent } from './generateRoutes';

type ImageGenerateBody = {
    prompt?: string;
    model?: string;
    aspectRatio?: string;
    imageSize?: string;
    editingInput?: string;
    objectImageInputs?: string[];
    characterImageInputs?: string[];
    outputFormat?: 'images-only' | 'images-and-text';
    temperature?: number;
    thinkingLevel?: 'disabled' | 'minimal' | 'high';
    includeThoughts?: boolean;
    googleSearch?: boolean;
    imageSearch?: boolean;
    executionMode?: 'single-turn' | 'interactive-batch-variants' | 'chat-continuation' | 'queued-batch-job';
    conversationContext?: ConversationRequestContext | null;
};

type BatchCreateBody = ImageGenerateBody & {
    requestCount?: number;
    displayName?: string;
};

type RegisterBatchRoutesArgs = {
    getAIClient: () => GoogleGenAI;
    resolvedDir: string;
};

type UploadedFileLike = {
    name?: string;
    uri?: string;
    mimeType?: string;
    state?: unknown;
    error?: unknown;
};

type GenerateBatchRequest = {
    contents: Array<{ role: 'user'; parts: Array<Record<string, unknown>> }>;
    config: Record<string, unknown>;
};

type BatchRequestBuilder = {
    createInlinedGenerateContentRequest?: (params: {
        model: string;
        src: GenerateBatchRequest[];
        config?: { displayName?: string };
    }) => {
        body?: {
            batch?: {
                inputConfig?: {
                    requests?: {
                        requests?: Array<{ request?: Record<string, unknown> }>;
                    };
                };
            };
        };
    };
};

const BATCH_JSONL_MIME_TYPE = 'jsonl';
const FILE_STATE_PROCESSING = 'PROCESSING';
const FILE_STATE_ACTIVE = 'ACTIVE';
const FILE_STATE_FAILED = 'FAILED';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readErrorMessage = (error: any): string | undefined => {
    if (typeof error === 'string' && error.trim().length > 0) {
        return error.trim();
    }
    if (typeof error?.message === 'string' && error.message.trim().length > 0) {
        return error.message.trim();
    }
    if (typeof error?.details === 'string' && error.details.trim().length > 0) {
        return error.details.trim();
    }

    return undefined;
};

const resolveFileStateName = (state: unknown): string => {
    if (typeof state === 'string' && state.trim().length > 0) {
        return state;
    }
    if (
        state &&
        typeof state === 'object' &&
        'name' in state &&
        typeof (state as { name?: unknown }).name === 'string'
    ) {
        return (state as { name: string }).name;
    }

    return 'STATE_UNSPECIFIED';
};

const cleanupTempDir = (tempDir: string) => {
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
};

const stripUnsupportedBatchRequestConfig = (requestConfig: Record<string, unknown>): Record<string, unknown> => {
    const normalizedConfig = { ...requestConfig };

    // The live image Batch API currently rejects thinkingConfig inside JSONL request entries.
    delete normalizedConfig.thinkingConfig;

    return normalizedConfig;
};

const createTempDir = (prefix: string) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

async function waitForUploadedFileActive(
    ai: GoogleGenAI,
    file: UploadedFileLike,
    purpose: string,
): Promise<UploadedFileLike> {
    let currentFile = file;

    for (let attempt = 0; attempt < 20; attempt += 1) {
        const state = resolveFileStateName(currentFile?.state);
        if (state === FILE_STATE_ACTIVE) {
            return currentFile;
        }
        if (state === FILE_STATE_FAILED) {
            throw new Error(readErrorMessage(currentFile?.error) || `${purpose} failed during File API processing.`);
        }
        if (state !== FILE_STATE_PROCESSING && currentFile?.uri) {
            return currentFile;
        }
        if (!currentFile?.name) {
            throw new Error(`${purpose} upload did not return a File API resource name.`);
        }

        await delay(Math.min(250 * (attempt + 1), 1000));
        currentFile = await ai.files.get({ name: currentFile.name });
    }

    throw new Error(`${purpose} did not become active in time.`);
}

async function uploadBatchSourceImage(
    ai: GoogleGenAI,
    image: string,
    resolvedDir: string,
    tempDir: string,
): Promise<{ fileUri: string; mimeType: string }> {
    const localImage = resolveLocalImageInputFile(image, resolvedDir, tempDir);

    try {
        const uploadedFile = await ai.files.upload({
            file: localImage.filePath,
            config: {
                displayName: path.basename(localImage.filePath),
                mimeType: localImage.mimeType,
            },
        });
        const activeFile = await waitForUploadedFileActive(ai, uploadedFile, 'Queued batch input image');

        if (!activeFile.uri) {
            throw new Error('Queued batch input image upload did not return a reusable file URI.');
        }

        return {
            fileUri: activeFile.uri,
            mimeType: activeFile.mimeType || localImage.mimeType,
        };
    } finally {
        localImage.cleanup();
    }
}

function buildBatchJsonlRequests(
    ai: GoogleGenAI,
    model: string,
    inlineRequests: GenerateBatchRequest[],
    displayName: string,
): Array<{ key: string; request: Record<string, unknown> }> {
    const batchBuilder = ai.batches as unknown as BatchRequestBuilder;
    if (typeof batchBuilder.createInlinedGenerateContentRequest !== 'function') {
        throw new Error('Installed Google GenAI SDK does not expose the queued batch JSONL request builder.');
    }

    const builtRequest = batchBuilder.createInlinedGenerateContentRequest({
        model,
        src: inlineRequests,
        config: { displayName },
    });
    const transformedRequests = builtRequest?.body?.batch?.inputConfig?.requests?.requests;
    if (!Array.isArray(transformedRequests) || transformedRequests.length !== inlineRequests.length) {
        throw new Error('Failed to prepare queued batch JSONL payload.');
    }

    return transformedRequests.map((entry, index) => ({
        key: `request-${index + 1}`,
        request:
            entry && typeof entry.request === 'object' && entry.request
                ? entry.request
                : (entry as Record<string, unknown>),
    }));
}

function writeBatchJsonlManifest(
    tempDir: string,
    requests: Array<{ key: string; request: Record<string, unknown> }>,
): string {
    const manifestPath = path.join(tempDir, 'queued-batch-input.jsonl');
    const fileContent = requests.map((request) => JSON.stringify(request)).join('\n');
    fs.writeFileSync(manifestPath, fileContent, 'utf8');
    return manifestPath;
}

async function downloadBatchResultJsonl(ai: GoogleGenAI, responseFileName: string, tempDir: string): Promise<string> {
    const safeFilename = responseFileName.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const downloadPath = path.join(tempDir, `${safeFilename}.jsonl`);
    await ai.files.download({ file: responseFileName, downloadPath });
    return fs.readFileSync(downloadPath, 'utf8');
}

export function registerBatchRoutes(server: any, { getAIClient, resolvedDir }: RegisterBatchRoutesArgs): void {
    server.use('/api/batches/create', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const body = await readJsonBody<BatchCreateBody>(req);
            const model = String(body.model || 'gemini-3.1-flash-image-preview');
            const requestCount = Math.max(1, Math.floor(Number(body.requestCount) || 0));
            const displayName = body.displayName || `${model}-queued-${new Date().toISOString()}`;

            if (!VALID_IMAGE_MODELS.has(model)) {
                sendJson(res, 400, { error: `Unsupported model: ${model}` });
                return;
            }
            if (body.imageSize && !VALID_IMAGE_SIZES.has(body.imageSize)) {
                sendJson(res, 400, { error: `Unsupported image size: ${body.imageSize}` });
                return;
            }
            if (body.conversationContext) {
                sendJson(res, 400, {
                    error: 'Queued batch jobs do not support conversation-native continuation context.',
                });
                return;
            }

            const capabilityError = validateCapabilityRequest(model, body);
            if (capabilityError) {
                sendJson(res, 400, { error: capabilityError });
                return;
            }

            const { objectImageInputs, characterImageInputs } = normalizeReferenceImages(body);
            const totalReferenceImages =
                objectImageInputs.length + characterImageInputs.length + (body.editingInput ? 1 : 0);
            if (model === 'gemini-2.5-flash-image' && totalReferenceImages > 3) {
                sendJson(res, 400, {
                    error: 'gemini-2.5-flash-image works best with up to 3 input images according to current docs.',
                });
                return;
            }

            const { requestConfig } = buildImageRequestConfig(model, body);
            const batchRequestConfig = stripUnsupportedBatchRequestConfig(requestConfig as Record<string, unknown>);
            const tempDir = createTempDir('nbu-queued-batch-');

            try {
                const parts = await buildGenerateFileParts(body, (image) =>
                    uploadBatchSourceImage(ai, image, resolvedDir, tempDir),
                );
                const inlineRequests: GenerateBatchRequest[] = Array.from({ length: requestCount }, () => ({
                    contents: [{ role: 'user', parts: parts as Array<Record<string, unknown>> }],
                    config: batchRequestConfig,
                }));
                const batchJsonlRequests = buildBatchJsonlRequests(ai, model, inlineRequests, displayName);
                const manifestPath = writeBatchJsonlManifest(tempDir, batchJsonlRequests);
                const uploadedManifest = await ai.files.upload({
                    file: manifestPath,
                    config: {
                        displayName: `${displayName} input`,
                        mimeType: BATCH_JSONL_MIME_TYPE,
                    },
                });
                const activeManifest = await waitForUploadedFileActive(
                    ai,
                    uploadedManifest,
                    'Queued batch input manifest',
                );
                if (!activeManifest.name) {
                    throw new Error('Queued batch input manifest upload did not return a file resource name.');
                }

                const batchJob = await ai.batches.create({
                    model,
                    src: activeManifest.name,
                    config: {
                        displayName,
                    },
                });

                sendJson(res, 200, {
                    job: serializeBatchJob(batchJob),
                });
            } finally {
                cleanupTempDir(tempDir);
            }
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/batches/create', error, 'Queued batch job submission failed', {
                defaultStatus: 502,
            });
        }
    });

    server.use('/api/batches/get', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const body = await readJsonBody<{ name?: string }>(req);
            if (!body.name) {
                sendJson(res, 400, { error: 'Missing batch job name.' });
                return;
            }

            const batchJob = await ai.batches.get({ name: body.name });
            sendJson(res, 200, { job: serializeBatchJob(batchJob) });
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/batches/get', error, 'Failed to load batch job status', {
                defaultStatus: 502,
            });
        }
    });

    server.use('/api/batches/cancel', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const body = await readJsonBody<{ name?: string }>(req);
            if (!body.name) {
                sendJson(res, 400, { error: 'Missing batch job name.' });
                return;
            }

            await ai.batches.cancel({ name: body.name });
            const batchJob = await ai.batches.get({ name: body.name });
            sendJson(res, 200, { job: serializeBatchJob(batchJob) });
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/batches/cancel', error, 'Failed to cancel batch job', {
                defaultStatus: 502,
            });
        }
    });

    server.use('/api/batches/import', async (req: any, res: any) => {
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
        }

        try {
            const ai = getAIClient();
            const body = await readJsonBody<{ name?: string }>(req);
            if (!body.name) {
                sendJson(res, 400, { error: 'Missing batch job name.' });
                return;
            }

            const batchJob = await ai.batches.get({ name: body.name });
            const serializedJob = serializeBatchJob(batchJob);
            if (serializedJob.state !== 'JOB_STATE_SUCCEEDED') {
                sendJson(res, 400, {
                    error: `Batch job is not ready to import. Current state: ${serializedJob.state}.`,
                });
                return;
            }

            const tempDir = createTempDir('nbu-queued-batch-results-');

            try {
                const results = serializedJob.responseFileName
                    ? extractBatchImportResults(
                          batchJob,
                          extractGeneratedContent,
                          await downloadBatchResultJsonl(ai, serializedJob.responseFileName, tempDir),
                      )
                    : extractBatchImportResults(batchJob, extractGeneratedContent);

                sendJson(res, 200, {
                    job: serializedJob,
                    results,
                });
            } finally {
                cleanupTempDir(tempDir);
            }
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/batches/import', error, 'Failed to import queued batch results', {
                defaultStatus: 502,
            });
        }
    });
}
