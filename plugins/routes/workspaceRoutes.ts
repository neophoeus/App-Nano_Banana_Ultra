import fs from 'fs';
import path from 'path';
import { sanitizeQueuedBatchSpaceSnapshot } from '../../utils/queuedBatchSpacePersistence';
import { sanitizeWorkspaceSnapshot } from '../../utils/workspacePersistence';
import { createApiRequestContext, logApiError, logApiRequest, readJsonBody, sendJson } from '../utils/apiHelpers';
import { embedImageMetadata, type EmbeddedNanoBananaMeta } from '../utils/imageMetadataEmbedder';

type RegisterWorkspaceRoutesArgs = {
    geminiApiKey?: string;
    resolvedDir: string;
};

type FileBackedSnapshotRouteArgs<T extends object> = {
    route: string;
    snapshotPath: string;
    sanitizeSnapshot: (value: unknown) => T;
    hasContent: (snapshot: T) => boolean;
    writeErrorMessage: string;
};

export function registerWorkspaceRoutes(server: any, { geminiApiKey, resolvedDir }: RegisterWorkspaceRoutesArgs): void {
    const registerFileBackedSnapshotRoute = <T extends object>({
        route,
        snapshotPath,
        sanitizeSnapshot,
        hasContent,
        writeErrorMessage,
    }: FileBackedSnapshotRouteArgs<T>) => {
        const snapshotTempPath = `${snapshotPath}.tmp`;

        const isRetryableSnapshotWriteError = (error: unknown) => {
            const code = (error as NodeJS.ErrnoException)?.code;
            return code === 'EBUSY' || code === 'EPERM';
        };

        const cleanupSnapshotTempFile = () => {
            if (fs.existsSync(snapshotTempPath)) {
                fs.unlinkSync(snapshotTempPath);
            }
        };

        const getLatestSnapshotCandidatePath = () => {
            const hasPrimarySnapshot = fs.existsSync(snapshotPath);
            const hasTempSnapshot = fs.existsSync(snapshotTempPath);

            if (hasPrimarySnapshot && hasTempSnapshot) {
                try {
                    const primaryStat = fs.statSync(snapshotPath);
                    const tempStat = fs.statSync(snapshotTempPath);
                    return tempStat.mtimeMs >= primaryStat.mtimeMs ? snapshotTempPath : snapshotPath;
                } catch {
                    return snapshotTempPath;
                }
            }

            if (hasPrimarySnapshot) {
                return snapshotPath;
            }

            if (hasTempSnapshot) {
                return snapshotTempPath;
            }

            return null;
        };

        const hasUnchangedSnapshotPayload = (payload: string) => {
            const candidatePath = getLatestSnapshotCandidatePath();
            if (!candidatePath) {
                return false;
            }

            try {
                return fs.readFileSync(candidatePath, 'utf-8') === payload;
            } catch {
                return false;
            }
        };

        const finalizeSnapshotWrite = (payload: string) => {
            try {
                fs.renameSync(snapshotTempPath, snapshotPath);
                return;
            } catch (error) {
                if (!isRetryableSnapshotWriteError(error)) {
                    throw error;
                }
            }

            try {
                fs.copyFileSync(snapshotTempPath, snapshotPath);
                cleanupSnapshotTempFile();
                return;
            } catch (error) {
                if (!isRetryableSnapshotWriteError(error)) {
                    throw error;
                }
            }

            fs.writeFileSync(snapshotPath, payload, 'utf-8');
            cleanupSnapshotTempFile();
        };

        const writeSnapshotWithRetry = (snapshot: T) => {
            const payload = JSON.stringify(snapshot, null, 2);
            let lastError: unknown = null;

            if (hasUnchangedSnapshotPayload(payload)) {
                try {
                    cleanupSnapshotTempFile();
                } catch {
                    // Best-effort cleanup of stale temp state.
                }
                return;
            }

            for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                    fs.writeFileSync(snapshotTempPath, payload, 'utf-8');
                    finalizeSnapshotWrite(payload);
                    return;
                } catch (error) {
                    lastError = error;
                    if (isRetryableSnapshotWriteError(error)) {
                        if (attempt === 2 && fs.existsSync(snapshotTempPath)) {
                            return;
                        }
                    } else {
                        try {
                            cleanupSnapshotTempFile();
                        } catch {
                            // Best-effort temp cleanup before surfacing a non-retryable write failure.
                        }
                    }

                    if (!isRetryableSnapshotWriteError(error) || attempt === 2) {
                        throw error;
                    }

                    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (attempt + 1));
                }
            }

            throw lastError instanceof Error ? lastError : new Error(writeErrorMessage);
        };

        const clearSnapshotFiles = () => {
            if (fs.existsSync(snapshotPath)) {
                fs.unlinkSync(snapshotPath);
            }
            if (fs.existsSync(snapshotTempPath)) {
                fs.unlinkSync(snapshotTempPath);
            }
        };

        const loadSnapshotBackup = () => {
            const candidatePath = getLatestSnapshotCandidatePath();

            if (!candidatePath) {
                return null;
            }

            const data = fs.readFileSync(candidatePath, 'utf-8');
            return sanitizeSnapshot(JSON.parse(data));
        };

        server.use(route, async (req: any, res: any) => {
            const requestContext = createApiRequestContext(req, route);

            if (req.method === 'GET') {
                logApiRequest(requestContext, {
                    source: 'workspace',
                    snapshotPath,
                    phase: 'load',
                });
                try {
                    const snapshot = loadSnapshotBackup();
                    if (!snapshot) {
                        sendJson(
                            res,
                            200,
                            { snapshot: null },
                            {
                                requestContext,
                                summary: 'No snapshot backup found',
                                details: {
                                    source: 'workspace',
                                    snapshotPath,
                                    phase: 'load',
                                },
                            },
                        );
                        return;
                    }

                    sendJson(res, 200, snapshot, {
                        requestContext,
                        summary: 'Snapshot backup loaded',
                        details: {
                            source: 'workspace',
                            snapshotPath,
                            phase: 'load',
                        },
                    });
                } catch (error: any) {
                    logApiError(route, error, { method: 'GET', snapshotPath, phase: 'load' }, requestContext);
                    try {
                        clearSnapshotFiles();
                    } catch {
                        // Best-effort cleanup of a corrupt or half-written backup file.
                    }
                    sendJson(
                        res,
                        200,
                        { snapshot: null, recoveredFromError: true },
                        {
                            requestContext,
                            summary: 'Recovered from corrupt snapshot backup',
                            details: {
                                source: 'workspace',
                                snapshotPath,
                                phase: 'load',
                                recoveredFromError: true,
                            },
                        },
                    );
                }
                return;
            }

            if (req.method !== 'POST') {
                sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
                return;
            }

            try {
                const snapshot = await readJsonBody<Record<string, unknown>>(req);
                const normalizedSnapshot = sanitizeSnapshot(snapshot);
                logApiRequest(requestContext, {
                    source: 'workspace',
                    snapshotPath,
                    phase: 'save',
                    hasContent: hasContent(normalizedSnapshot),
                });

                if (!hasContent(normalizedSnapshot)) {
                    clearSnapshotFiles();
                    sendJson(
                        res,
                        200,
                        { success: true, path: snapshotPath, cleared: true },
                        {
                            requestContext,
                            summary: 'Snapshot backup cleared',
                            details: {
                                source: 'workspace',
                                snapshotPath,
                                phase: 'save',
                                cleared: true,
                            },
                        },
                    );
                    return;
                }

                writeSnapshotWithRetry(normalizedSnapshot);
                sendJson(
                    res,
                    200,
                    { success: true, path: snapshotPath },
                    {
                        requestContext,
                        summary: 'Snapshot backup saved',
                        details: {
                            source: 'workspace',
                            snapshotPath,
                            phase: 'save',
                        },
                    },
                );
            } catch (error: any) {
                logApiError(route, error, { method: 'POST', snapshotPath, phase: 'save' }, requestContext);
                sendJson(
                    res,
                    200,
                    {
                        success: false,
                        path: snapshotPath,
                        error: error.message || writeErrorMessage,
                    },
                    {
                        requestContext,
                        summary: error.message || writeErrorMessage,
                        details: {
                            source: 'workspace',
                            snapshotPath,
                            phase: 'save',
                            success: false,
                        },
                    },
                );
            }
        });
    };

    server.use('/api/health', (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/health');
        logApiRequest(requestContext, {
            source: 'workspace',
            outputDir: resolvedDir,
        });
        sendJson(
            res,
            200,
            {
                ok: true,
                hasApiKey: Boolean(geminiApiKey || process.env.GEMINI_API_KEY),
                outputDir: resolvedDir,
                timestamp: new Date().toISOString(),
            },
            {
                requestContext,
                summary: 'Health check',
                details: {
                    source: 'workspace',
                    hasApiKey: Boolean(geminiApiKey || process.env.GEMINI_API_KEY),
                },
            },
        );
    });

    server.use('/api/runtime-config', (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/runtime-config');
        const hasApiKey = Boolean(geminiApiKey || process.env.GEMINI_API_KEY);
        logApiRequest(requestContext, {
            source: 'runtime',
        });
        sendJson(
            res,
            200,
            { hasApiKey },
            {
                requestContext,
                summary: hasApiKey ? 'API key available' : 'API key missing',
                details: {
                    source: 'runtime',
                    hasApiKey,
                },
            },
        );
    });

    registerFileBackedSnapshotRoute({
        route: '/api/workspace-snapshot',
        snapshotPath: path.join(resolvedDir, 'workspace_snapshot.json'),
        sanitizeSnapshot: sanitizeWorkspaceSnapshot,
        hasContent: ({ history, stagedAssets, workflowLogs, viewState, composerState, workspaceSession }) =>
            Boolean(
                history.length ||
                stagedAssets.length ||
                workflowLogs.length ||
                viewState.generatedImageUrls.length ||
                viewState.selectedHistoryId ||
                composerState.prompt.trim() ||
                workspaceSession.activeResult ||
                workspaceSession.sourceHistoryId ||
                workspaceSession.conversationId,
            ),
        writeErrorMessage: 'Failed to save workspace snapshot backup.',
    });

    registerFileBackedSnapshotRoute({
        route: '/api/queued-batch-space',
        snapshotPath: path.join(resolvedDir, 'queued_batch_space.json'),
        sanitizeSnapshot: sanitizeQueuedBatchSpaceSnapshot,
        hasContent: (normalizedSnapshot) => normalizedSnapshot.queuedJobs.length > 0,
        writeErrorMessage: 'Failed to save queued batch space backup.',
    });

    server.use('/api/export-results', async (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/export-results');
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
            return;
        }

        try {
            const body = await readJsonBody<{
                targetDir?: string;
                items?: Array<{
                    imageUrl: string;
                    baseFilename?: string;
                    metadata: EmbeddedNanoBananaMeta;
                }>;
            }>(req);

            const rawTargetDir = (body?.targetDir || '').trim().replace(/^["']+|["']+$/g, '').trim();
            const pathWithoutDrive = rawTargetDir.replace(/^[a-zA-Z]:/, '');
            if (/[<>:"|?*\x00-\x1F]/.test(pathWithoutDrive)) {
                sendJson(
                    res,
                    400,
                    { success: false, error: 'Invalid target directory path.' },
                    { requestContext, summary: 'Invalid target directory path' },
                );
                return;
            }

            const outputDir = rawTargetDir
                ? (path.isAbsolute(rawTargetDir) ? path.normalize(rawTargetDir) : path.resolve(process.cwd(), rawTargetDir))
                : path.resolve(process.cwd(), 'export');

            if (path.resolve(outputDir).toLowerCase() === path.resolve(resolvedDir).toLowerCase()) {
                sendJson(
                    res,
                    400,
                    { success: false, error: 'Export directory cannot be the same as the workspace output directory.' },
                    { requestContext, summary: 'Target matches source output dir' },
                );
                return;
            }

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const items = Array.isArray(body?.items) ? body.items : [];
            let exportedCount = 0;
            let skippedCount = 0;
            const errors: string[] = [];

            for (const item of items) {
                try {
                    if (!item || !item.imageUrl) {
                        skippedCount += 1;
                        continue;
                    }

                    let imageBuffer: Buffer | null = null;
                    let ext = '.png';

                    if (item.imageUrl.startsWith('data:')) {
                        const match = item.imageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
                        if (match) {
                            const subtype = match[1].toLowerCase();
                            ext = subtype === 'jpeg' ? '.jpg' : `.${subtype}`;
                            imageBuffer = Buffer.from(match[2], 'base64');
                        } else {
                            const commaIdx = item.imageUrl.indexOf(',');
                            if (commaIdx !== -1) {
                                imageBuffer = Buffer.from(item.imageUrl.slice(commaIdx + 1), 'base64');
                            }
                        }
                    } else {
                        let sourceFilename = '';
                        if (item.imageUrl.includes('filename=')) {
                            try {
                                const urlObj = new URL(item.imageUrl, 'http://localhost');
                                sourceFilename = urlObj.searchParams.get('filename') || '';
                            } catch {
                                const match = item.imageUrl.match(/[?&]filename=([^&]+)/);
                                if (match) sourceFilename = decodeURIComponent(match[1]);
                            }
                        }
                        if (!sourceFilename) {
                            sourceFilename = path.basename(item.imageUrl);
                        }

                        const safeSourceFilename = path.basename(sourceFilename);
                        const sourcePath = path.join(resolvedDir, safeSourceFilename);

                        if (fs.existsSync(sourcePath)) {
                            imageBuffer = fs.readFileSync(sourcePath);
                            ext = path.extname(safeSourceFilename) || '.png';

                            const stem = path.parse(safeSourceFilename).name;
                            const sidecarPath = path.join(resolvedDir, `${stem}.json`);
                            if (fs.existsSync(sidecarPath)) {
                                try {
                                    const sidecarMeta = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
                                    if (sidecarMeta && typeof sidecarMeta === 'object') {
                                        item.metadata = {
                                            ...item.metadata,
                                            outputFormat: item.metadata.outputFormat || sidecarMeta.outputFormat,
                                            actualOutput:
                                                item.metadata.actualOutput ||
                                                (sidecarMeta.actualOutput
                                                    ? `${sidecarMeta.actualOutput.width}x${sidecarMeta.actualOutput.height}${sidecarMeta.actualOutput.mimeType ? ` (${sidecarMeta.actualOutput.mimeType})` : ''}`
                                                    : undefined),
                                            groundingMode: item.metadata.groundingMode || sidecarMeta.groundingMode,
                                            groundingSources: item.metadata.groundingSources || sidecarMeta.groundingSources,
                                            temperature:
                                                item.metadata.temperature !== undefined
                                                    ? item.metadata.temperature
                                                    : sidecarMeta.temperature,
                                            thinkingLevel: item.metadata.thinkingLevel || sidecarMeta.thinkingLevel,
                                        };
                                    }
                                } catch {
                                    // ignore sidecar read errors
                                }
                            }
                        } else {
                            skippedCount += 1;
                            errors.push(`Source image not found: ${safeSourceFilename}`);
                            continue;
                        }
                    }

                    if (!imageBuffer || imageBuffer.length === 0) {
                        skippedCount += 1;
                        continue;
                    }

                    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47) {
                        ext = '.png';
                    } else if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
                        ext = '.jpg';
                    } else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x46) {
                        ext = '.webp';
                    }

                    const taggedBuffer = embedImageMetadata(imageBuffer, item.metadata);

                    const rawBaseName = (item.baseFilename || path.parse(item.metadata?.id || 'image').name || 'export')
                        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
                        .trim() || 'export';

                    let finalFilename = `${rawBaseName}${ext}`;
                    let counter = 1;
                    while (fs.existsSync(path.join(outputDir, finalFilename))) {
                        finalFilename = `${rawBaseName}_${counter}${ext}`;
                        counter += 1;
                    }

                    fs.writeFileSync(path.join(outputDir, finalFilename), taggedBuffer);
                    exportedCount += 1;
                } catch (err: any) {
                    skippedCount += 1;
                    errors.push(err?.message || String(err));
                }
            }

            sendJson(
                res,
                200,
                {
                    success: true,
                    outputDir,
                    exportedCount,
                    skippedCount,
                    errors,
                },
                {
                    requestContext,
                    summary: `Exported ${exportedCount} items to ${outputDir}`,
                    details: {
                        source: 'workspace',
                        outputDir,
                        exportedCount,
                        skippedCount,
                    },
                },
            );
        } catch (err: any) {
            logApiError('/api/export-results', err, { source: 'workspace' }, requestContext);
            sendJson(
                res,
                500,
                { success: false, error: err?.message || 'Failed to export results' },
                { requestContext, summary: 'Export failed' },
            );
        }
    });

    server.use('/api/browse-folder', async (req: any, res: any) => {
        const requestContext = createApiRequestContext(req, '/api/browse-folder');
        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' }, { requestContext, summary: 'Method not allowed' });
            return;
        }

        if (process.platform !== 'win32') {
            sendJson(
                res,
                200,
                { cancelled: true, message: 'Native folder dialog is only supported on Windows' },
                { requestContext, summary: 'Non-Windows platform' },
            );
            return;
        }

        try {
            const { exec } = await import('child_process');
            const psCommand = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Export Directory'; $f.ShowNewFolderButton = $true; if ($f.ShowDialog() -eq 'OK') { [Console]::WriteLine($f.SelectedPath) }"`;

            exec(psCommand, { windowsHide: true }, (err, stdout) => {
                if (err) {
                    sendJson(res, 200, { cancelled: true }, { requestContext, summary: 'Folder browser cancelled or failed' });
                    return;
                }
                const selectedPath = (stdout || '').trim();
                if (selectedPath) {
                    sendJson(res, 200, { cancelled: false, path: selectedPath }, { requestContext, summary: 'Folder selected' });
                } else {
                    sendJson(res, 200, { cancelled: true }, { requestContext, summary: 'Folder browser cancelled' });
                }
            });
        } catch {
            sendJson(res, 200, { cancelled: true }, { requestContext, summary: 'Folder browser exception' });
        }
    });
}
