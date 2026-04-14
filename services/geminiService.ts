import { GenerateOptions, GenerateResponse, ImageReceivedResult, ImageStyle, QueuedBatchJobStats } from '../types';
import { getStylePromptDescriptor } from '../utils/styleRegistry';
import { Language } from '../utils/translations';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

function isAbortLikeError(error: unknown): boolean {
    return (
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.message === 'ABORTED')
    );
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    let response: Response;

    try {
        response = await fetch(input, init);
    } catch (error) {
        if (isAbortLikeError(error)) {
            throw new Error('ABORTED');
        }
        throw error;
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const errorMessage =
            payload && typeof payload.error === 'string'
                ? payload.error
                : `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }

    return payload as T;
}

// Helper to ensure we get the key
export const checkApiKey = async (): Promise<boolean> => {
    try {
        const payload = await fetchJson<{ hasApiKey: boolean }>('/api/runtime-config');
        return payload.hasApiKey;
    } catch {
        return false;
    }
};

export const promptForApiKey = async (): Promise<void> => {
    window.alert('Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.');
};

// --- Text Utilities (Prompt Engineering) ---

export const enhancePromptWithGemini = async (currentPrompt: string, lang: Language): Promise<string> => {
    const response = await fetchJson<{ text: string }>('/api/prompt/enhance', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ currentPrompt, lang }),
    });

    const promptText = response.text?.trim();
    if (!promptText) {
        throw new Error('Prompt enhancement returned empty text.');
    }

    return promptText;
};

export const generateRandomPrompt = async (lang: Language): Promise<string> => {
    const response = await fetchJson<{ text: string }>('/api/prompt/random', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ lang }),
    });

    const promptText = response.text?.trim();
    if (!promptText) {
        throw new Error('Random prompt generation returned empty text.');
    }

    return promptText;
};

export const generatePromptFromImage = async (imageDataUrl: string, lang: Language): Promise<string> => {
    const response = await fetchJson<{ text: string }>('/api/prompt/image-to-prompt', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ imageDataUrl, lang }),
    });

    const promptText = response.text?.trim();
    if (!promptText) {
        throw new Error('Image to prompt returned empty text.');
    }

    return promptText;
};

// --- Image Generation Logic ---

const generateSingleImage = async (
    options: GenerateOptions,
    imgIndex: number = 1,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
): Promise<GenerateResponse> => {
    let finalPrompt = options.prompt;
    const hasInputImages =
        (options.objectImageInputs && options.objectImageInputs.length > 0) ||
        (options.characterImageInputs && options.characterImageInputs.length > 0);

    if (!finalPrompt || finalPrompt.trim() === '') {
        finalPrompt = hasInputImages
            ? 'High resolution, seamless integration with surrounding context, maintain consistent lighting and texture.'
            : 'A creative image.';
    }

    if (options.style && options.style !== 'None') {
        const styleKeywords = getStylePromptDescriptor(options.style);
        finalPrompt = `${finalPrompt}, ${styleKeywords}`;
    }

    try {
        onLog?.(`Image #${imgIndex}: Sending request...`);

        if (abortSignal?.aborted) {
            throw new Error('ABORTED');
        }

        const response = await fetchJson<GenerateResponse>('/api/images/generate', {
            method: 'POST',
            headers: jsonHeaders,
            signal: abortSignal,
            body: JSON.stringify({
                prompt: finalPrompt,
                model: options.model,
                aspectRatio: options.aspectRatio,
                imageSize: options.model === 'gemini-2.5-flash-image' ? undefined : options.imageSize,
                editingInput: options.editingInput,
                objectImageInputs: options.objectImageInputs,
                characterImageInputs: options.characterImageInputs,
                outputFormat: options.outputFormat,
                structuredOutputMode: options.structuredOutputMode,
                temperature: options.temperature,
                thinkingLevel: options.thinkingLevel,
                includeThoughts: options.includeThoughts,
                googleSearch: options.googleSearch,
                imageSearch: options.imageSearch,
                executionMode: options.executionMode,
                conversationContext: options.conversationContext,
            }),
        });

        onLog?.(`Image #${imgIndex}: Success.`);
        return response;
    } catch (error: any) {
        if (isAbortLikeError(error)) {
            throw new Error('ABORTED');
        }

        const errorMessage = error.message || 'Unknown error';

        if (errorMessage.includes('limit: 0')) {
            throw new Error('API key quota exceeded. This model requires a paid API key or billing enabled.');
        }

        if (errorMessage === 'Model returned no image data.') {
            throw new Error('Server returned empty response. Likely a temporary server issue or silent safety block.');
        }

        throw new Error(errorMessage);
    }
};

export type GenerationResult = {
    slotIndex: number;
    status: 'success' | 'failed';
    url?: string;
    displayUrl?: string;
    error?: string;
    savedFilename?: string;
    text?: string;
    thoughts?: string;
    structuredData?: GenerateResponse['structuredData'];
    metadata?: Record<string, unknown>;
    grounding?: GenerateResponse['grounding'];
    sessionHints?: GenerateResponse['sessionHints'];
    conversation?: GenerateResponse['conversation'];
};

export type RemoteQueuedBatchJob = {
    name: string;
    displayName: string;
    state: string;
    model: string;
    createTime?: string;
    updateTime?: string;
    startTime?: string;
    endTime?: string;
    error?: string | null;
    hasInlinedResponses: boolean;
    batchStats?: QueuedBatchJobStats | null;
};

export type QueuedBatchImportResult = {
    index: number;
    status: 'success' | 'failed';
    imageUrl?: string;
    text?: string;
    thoughts?: string;
    structuredData?: GenerateResponse['structuredData'];
    grounding?: GenerateResponse['grounding'];
    sessionHints?: Record<string, unknown>;
    error?: string;
};

type SubmitQueuedBatchOptions = GenerateOptions & {
    requestCount: number;
    displayName?: string;
};

export const submitQueuedBatchJob = async (options: SubmitQueuedBatchOptions): Promise<RemoteQueuedBatchJob> => {
    const response = await fetchJson<{ job: RemoteQueuedBatchJob }>('/api/batches/create', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
            prompt: options.prompt,
            model: options.model,
            aspectRatio: options.aspectRatio,
            imageSize: options.model === 'gemini-2.5-flash-image' ? undefined : options.imageSize,
            editingInput: options.editingInput,
            objectImageInputs: options.objectImageInputs,
            characterImageInputs: options.characterImageInputs,
            outputFormat: options.outputFormat,
            structuredOutputMode: options.structuredOutputMode,
            temperature: options.temperature,
            thinkingLevel: options.thinkingLevel,
            includeThoughts: options.includeThoughts,
            googleSearch: options.googleSearch,
            imageSearch: options.imageSearch,
            executionMode: 'queued-batch-job',
            requestCount: options.requestCount,
            displayName: options.displayName,
        }),
    });

    return response.job;
};

export const listQueuedBatchJobs = async (pageSize: number = 50): Promise<RemoteQueuedBatchJob[]> => {
    const response = await fetchJson<{ jobs: RemoteQueuedBatchJob[] }>('/api/batches/list', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ pageSize }),
    });

    return Array.isArray(response.jobs) ? response.jobs : [];
};

export const getQueuedBatchJob = async (name: string): Promise<RemoteQueuedBatchJob> => {
    const response = await fetchJson<{ job: RemoteQueuedBatchJob }>('/api/batches/get', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ name }),
    });

    return response.job;
};

export const cancelQueuedBatchJob = async (name: string): Promise<RemoteQueuedBatchJob> => {
    const response = await fetchJson<{ job: RemoteQueuedBatchJob }>('/api/batches/cancel', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ name }),
    });

    return response.job;
};

export const importQueuedBatchJobResults = async (
    name: string,
): Promise<{ job: RemoteQueuedBatchJob; results: QueuedBatchImportResult[] }> => {
    return await fetchJson<{ job: RemoteQueuedBatchJob; results: QueuedBatchImportResult[] }>('/api/batches/import', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ name }),
    });
};

// F2: Retry helper with exponential backoff
interface RetryOptions {
    backoffMultiplier?: number;
    maxDelay?: number;
    abortSignal?: AbortSignal;
    onLog?: (msg: string) => void;
}
const retryOperation = async <T>(
    operation: () => Promise<T>,
    retries: number,
    delayMs: number = 1500,
    opts?: RetryOptions,
): Promise<T> => {
    const { backoffMultiplier = 2, maxDelay = 8000, abortSignal, onLog } = opts || {};
    try {
        return await operation();
    } catch (error: any) {
        // Never retry these deterministic errors
        const msg = error.message || '';
        if (
            msg.includes('PROMPT_BLOCKED') ||
            msg.includes('SAFETY_BLOCK') ||
            msg.includes('policy') ||
            msg.includes('quota') ||
            msg === 'ABORTED'
        ) {
            throw error;
        }

        if (abortSignal?.aborted) throw new Error('ABORTED');

        if (retries > 0) {
            // Retry transient errors only
            if (
                msg.includes('EMPTY_RESPONSE') ||
                msg.includes('500') ||
                msg.includes('503') ||
                msg.includes('429') ||
                msg.includes('fetch')
            ) {
                // Parse Retry-After header for 429 (rate limit)
                let waitMs = delayMs;
                if (msg.includes('429')) {
                    const retryAfterMatch = msg.match(/retry.?after[:\s]*(\d+)/i);
                    if (retryAfterMatch) waitMs = Math.max(waitMs, parseInt(retryAfterMatch[1]) * 1000);
                }
                onLog?.(`⏳ Retrying in ${(waitMs / 1000).toFixed(1)}s... (${retries} left)`);
                // F1-FIX: Use abortable delay so cancel takes effect during retry wait
                await new Promise<void>((resolve, reject) => {
                    const handler = () => {
                        clearTimeout(timer);
                        reject(new Error('ABORTED'));
                    };
                    const timer = setTimeout(() => {
                        if (abortSignal) abortSignal.removeEventListener('abort', handler);
                        resolve();
                    }, waitMs);
                    if (abortSignal) {
                        if (abortSignal.aborted) {
                            clearTimeout(timer);
                            reject(new Error('ABORTED'));
                            return;
                        }
                        abortSignal.addEventListener('abort', handler, { once: true });
                    }
                });
                const nextDelay = Math.min(waitMs * backoffMultiplier, maxDelay);
                return retryOperation(operation, retries - 1, nextDelay, opts);
            }
        }
        throw error;
    }
};

export const generateImageWithGemini = async (
    options: GenerateOptions,
    batchSize: number = 1,
    onImageReceived?:
        | ((
              url: string,
              slotIndex: number,
          ) => Promise<ImageReceivedResult | undefined> | ImageReceivedResult | undefined)
        | undefined,
    onLog?: (msg: string) => void,
    abortSignal?: AbortSignal,
    onProgress?: (completed: number, total: number) => void, // F4: Batch progress
    onResult?: (result: GenerationResult) => void,
): Promise<GenerationResult[]> => {
    // PARALLEL EXECUTION WITH STAGGER
    const STAGGER_DELAY_MS = 300;
    let completedCount = 0;

    const promises = Array.from({ length: batchSize }).map(async (_, index) => {
        // Stagger delay
        if (index > 0) await new Promise((resolve) => setTimeout(resolve, index * STAGGER_DELAY_MS));

        // F1: Check abort before starting each image
        if (abortSignal?.aborted) {
            const abortedResult = {
                slotIndex: index,
                status: 'failed' as const,
                error: 'Generation cancelled',
            };
            onResult?.(abortedResult);
            return abortedResult;
        }

        try {
            // F2: 3 retries with exponential backoff (1.5s → 3s → 6s)
            const response = await retryOperation(
                () => generateSingleImage(options, index + 1, onLog, abortSignal),
                3,
                1500,
                { backoffMultiplier: 2, maxDelay: 8000, abortSignal, onLog },
            );
            if (!response.imageUrl) {
                throw new Error('Model returned no image data.');
            }
            const receivedResult = onImageReceived ? await onImageReceived(response.imageUrl, index) : undefined;
            const successResult = {
                slotIndex: index,
                status: 'success' as const,
                url: response.imageUrl,
                displayUrl: receivedResult?.displayUrl || response.imageUrl,
                savedFilename: receivedResult?.savedFilename,
                text: response.text,
                thoughts: response.thoughts,
                structuredData: response.structuredData,
                metadata: response.metadata,
                grounding: response.grounding,
                sessionHints: response.sessionHints,
                conversation: response.conversation,
            };
            completedCount++;
            onProgress?.(completedCount, batchSize);
            onResult?.(successResult);
            return successResult;
        } catch (e: any) {
            completedCount++;
            onProgress?.(completedCount, batchSize);
            if (e.message === 'ABORTED') {
                const abortedResult = {
                    slotIndex: index,
                    status: 'failed' as const,
                    error: 'Generation cancelled',
                };
                onResult?.(abortedResult);
                return abortedResult;
            }
            onLog?.(`Image #${index + 1} Failed: ${e.message}`);
            const failedResult = {
                slotIndex: index,
                status: 'failed' as const,
                error: e.message,
            };
            onResult?.(failedResult);
            return failedResult;
        }
    });

    const results = await Promise.all(promises);

    return results;
};
