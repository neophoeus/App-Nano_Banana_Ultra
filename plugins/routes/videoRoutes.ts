import fs from 'fs';
import os from 'os';
import path from 'path';
import { GoogleGenAI } from '@google/genai/node';
import {
    createApiRequestContext,
    logApiRequest,
    sendClassifiedApiError,
    sendJson,
} from '../utils/apiHelpers';
import {
    MAX_VIDEO_UPLOAD_BYTES,
    normalizeVideoMimeType,
} from '../../utils/videoReferenceUtils';

type RegisterVideoRoutesArgs = {
    getAIClient: () => GoogleGenAI;
};

function resolveFileStateName(state: unknown): string {
    if (typeof state === 'string' && state.trim().length > 0) {
        return state.trim();
    }
    if (
        state &&
        typeof state === 'object' &&
        'name' in state &&
        typeof (state as { name?: unknown }).name === 'string'
    ) {
        return (state as { name: string }).name.trim();
    }
    return '';
}

export function registerVideoRoutes(server: any, { getAIClient }: RegisterVideoRoutesArgs): void {
    server.use('/api/videos/upload', async (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/videos/upload');

        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
            return;
        }

        const rawHeaderFilename = req.headers?.['x-video-filename'];
        let displayName = 'reference_video.mp4';
        if (typeof rawHeaderFilename === 'string' && rawHeaderFilename.trim()) {
            let decoded = rawHeaderFilename.trim();
            try {
                decoded = decodeURIComponent(decoded);
            } catch {
                // Keep raw trimmed value when URI decoding fails
            }
            const sanitizedBase = path
                .basename(decoded.replace(/\\/g, '/'))
                .replace(/[\u0000-\u001f\u007f]/g, '')
                .trim()
                .slice(0, 200);
            if (sanitizedBase) {
                displayName = sanitizedBase;
            }
        }

        const rawHeaderMime = req.headers?.['x-video-mime-type'] || req.headers?.['content-type'];
        const normalizedMime = normalizeVideoMimeType(
            typeof rawHeaderMime === 'string' ? rawHeaderMime : undefined,
            displayName,
        );

        if (!normalizedMime) {
            sendJson(
                res,
                400,
                { error: 'Unsupported video MIME type. Please upload MP4, MOV, WebM, or AVI.' },
                { requestContext, summary: 'Unsupported video MIME type' },
            );
            return;
        }

        logApiRequest(requestContext, {
            displayName,
            mimeType: normalizedMime,
        });

        const rawExt = path.extname(path.basename(displayName));
        const safeExt = /^\.[a-z0-9]{1,8}$/i.test(rawExt) ? rawExt.toLowerCase() : '.mp4';
        const tempFilePath = path.join(
            os.tmpdir(),
            `nbu-video-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safeExt}`,
        );

        let writeStream: fs.WriteStream | null = null;
        let isCleanedUp = false;

        const cleanupTempFile = async () => {
            if (isCleanedUp) return;
            isCleanedUp = true;
            try {
                if (fs.existsSync(tempFilePath)) {
                    await fs.promises.unlink(tempFilePath);
                }
            } catch {
                // Ignore cleanup errors
            }
        };

        try {
            let writtenBytes = 0;
            let isClientAborted = false;

            await new Promise<void>((resolve, reject) => {
                writeStream = fs.createWriteStream(tempFilePath);
                let receivedBytes = 0;
                let isLimitExceeded = false;
                let isStreamFinished = false;

                const handlePrematureClientAbort = () => {
                    if (isStreamFinished || isLimitExceeded || isClientAborted) return;
                    isClientAborted = true;
                    req.unpipe(writeStream);
                    writeStream?.destroy();
                    resolve();
                };

                req.on('aborted', handlePrematureClientAbort);
                req.on('close', () => {
                    if (req.complete === false && !isStreamFinished) {
                        handlePrematureClientAbort();
                    }
                });

                req.on('data', (chunk: Buffer) => {
                    if (isLimitExceeded || isClientAborted) return;
                    receivedBytes += chunk.length;
                    if (receivedBytes > MAX_VIDEO_UPLOAD_BYTES) {
                        isLimitExceeded = true;
                        const error = new Error('Video file exceeds maximum allowed upload size (200MB).');
                        (error as any).statusCode = 413;
                        req.unpipe(writeStream);
                        writeStream?.destroy();
                        req.resume();
                        reject(error);
                    }
                });

                req.on('error', (err: any) => {
                    if (isClientAborted) {
                        resolve();
                        return;
                    }
                    writeStream?.destroy();
                    reject(err);
                });

                writeStream.on('error', (err: any) => {
                    if (isClientAborted) {
                        resolve();
                        return;
                    }
                    reject(err);
                });

                writeStream.on('finish', () => {
                    isStreamFinished = true;
                    if (isClientAborted) {
                        resolve();
                        return;
                    }
                    try {
                        writtenBytes = fs.existsSync(tempFilePath) ? fs.statSync(tempFilePath).size : 0;
                        if (writtenBytes === 0) {
                            const error = new Error('Empty video payload received.');
                            (error as any).statusCode = 400;
                            reject(error);
                        } else {
                            resolve();
                        }
                    } catch (statError) {
                        reject(statError);
                    }
                });

                req.pipe(writeStream);
            });

            if (isClientAborted) {
                return;
            }

            const ai = getAIClient();
            let uploadedFile = await ai.files.upload({
                file: tempFilePath,
                config: {
                    mimeType: normalizedMime,
                    displayName,
                },
            });

            const fileName = uploadedFile.name;
            if (!fileName) {
                throw new Error('Gemini Files API upload did not return a valid file name.');
            }

            // Poll while file is PROCESSING (up to 45 attempts = 90s)
            const maxPollAttempts = 45;
            let attempts = 0;
            let currentState = resolveFileStateName(uploadedFile.state);

            while (currentState === 'PROCESSING' || (currentState === '' && !uploadedFile.uri)) {
                if (res.writableEnded || req.destroyed) {
                    return;
                }

                if (attempts >= maxPollAttempts) {
                    const timeoutError = new Error('Video processing timed out in Gemini Files API.');
                    (timeoutError as any).statusCode = 504;
                    throw timeoutError;
                }
                attempts += 1;

                await new Promise((r) => setTimeout(r, 2000));
                if (res.writableEnded || req.destroyed) {
                    return;
                }
                uploadedFile = await ai.files.get({ name: fileName });
                currentState = resolveFileStateName(uploadedFile.state);

                if (currentState === 'FAILED') {
                    const failedError = new Error('Video processing failed in Gemini Files API.');
                    (failedError as any).statusCode = 422;
                    throw failedError;
                }
                if (currentState === 'ACTIVE') {
                    break;
                }
            }

            if (res.writableEnded || req.destroyed) {
                return;
            }

            if (resolveFileStateName(uploadedFile.state) === 'FAILED') {
                const failedError = new Error('Video processing failed in Gemini Files API.');
                (failedError as any).statusCode = 422;
                throw failedError;
            }

            if (!uploadedFile.uri) {
                throw new Error('Gemini Files API upload did not return a valid file URI.');
            }

            const parsedSdkSize = Number((uploadedFile as any).sizeBytes);
            const effectiveSizeBytes =
                Number.isFinite(parsedSdkSize) && parsedSdkSize > 0 ? parsedSdkSize : writtenBytes;

            sendJson(
                res,
                200,
                {
                    fileUri: uploadedFile.uri,
                    mimeType: uploadedFile.mimeType || normalizedMime,
                    name: uploadedFile.name,
                    displayName: uploadedFile.displayName || displayName,
                    sizeBytes: effectiveSizeBytes,
                    expiresAt: uploadedFile.expirationTime,
                },
                {
                    requestContext,
                    summary: `Video uploaded: ${displayName}`,
                    details: {
                        name: uploadedFile.name,
                        mimeType: uploadedFile.mimeType || normalizedMime,
                        sizeBytes: effectiveSizeBytes,
                    },
                },
            );
        } catch (error: any) {
            sendClassifiedApiError(res, '/api/videos/upload', error, 'Failed to upload video to Gemini Files API', {
                defaultStatus: error.statusCode || 500,
                requestContext,
                details: { displayName, mimeType: normalizedMime },
            });
        } finally {
            await cleanupTempFile();
        }
    });
}
