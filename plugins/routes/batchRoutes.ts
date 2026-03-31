import { GoogleGenAI } from '@google/genai';
import type { ConversationRequestContext, StructuredOutputMode } from '../../types';
import { VALID_IMAGE_MODELS, VALID_IMAGE_SIZES } from '../../utils/modelCapabilities';
import { readJsonBody, sendClassifiedApiError, sendJson } from '../utils/apiHelpers';
import { extractBatchImportResults, serializeBatchJob } from '../utils/batchHelpers';
import { buildGenerateParts, normalizeReferenceImages } from '../utils/imageReferences';
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
    structuredOutputMode?: StructuredOutputMode;
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

            const parts = buildGenerateParts(body, resolvedDir);
            const { requestConfig } = buildImageRequestConfig(model, body);
            const inlineRequests = Array.from({ length: requestCount }, () => ({
                contents: [{ role: 'user', parts }],
                config: requestConfig,
            }));
            const batchJob = await ai.batches.create({
                model,
                src: inlineRequests,
                config: {
                    displayName: body.displayName || `${model}-queued-${new Date().toISOString()}`,
                },
            });

            sendJson(res, 200, {
                job: serializeBatchJob(batchJob),
            });
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

            sendJson(res, 200, {
                job: serializedJob,
                results: extractBatchImportResults(batchJob, extractGeneratedContent),
            });
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/batches/import', error, 'Failed to import queued batch results', {
                defaultStatus: 502,
            });
        }
    });
}
