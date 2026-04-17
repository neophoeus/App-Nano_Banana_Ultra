export function readJsonBody<T>(req: NodeJS.ReadableStream): Promise<T> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}') as T);
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

export function sendJson(res: any, status: number, payload: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

export function startNdjsonStream(res: any, status: number = 200): void {
    res.writeHead(status, {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();
}

export function writeNdjsonEvent(res: any, payload: unknown): void {
    res.write(`${JSON.stringify(payload)}\n`);
}

export function logApiError(route: string, error: unknown, details?: Record<string, unknown>): void {
    const message = error instanceof Error ? error.message : String(error);
    const payload = details ? { route, message, ...details } : { route, message };
    console.error('[Nano Banana API]', payload);
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return fallback;
}

export function classifyApiErrorStatus(error: unknown, fallbackStatus: number): number {
    const statusCandidate = Number((error as any)?.status ?? (error as any)?.statusCode);
    if (Number.isInteger(statusCandidate) && statusCandidate >= 400 && statusCandidate < 600) {
        return statusCandidate;
    }

    const code = typeof (error as any)?.code === 'string' ? String((error as any).code).toUpperCase() : '';
    const message = getApiErrorMessage(error, '').toLowerCase();

    if (error instanceof SyntaxError) {
        return 400;
    }

    if (message.startsWith('missing gemini_api_key')) {
        return 503;
    }

    if (code === 'ENOENT') {
        return 404;
    }

    if (code === 'ENOSPC') {
        return 507;
    }

    if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') {
        return 503;
    }

    if (/quota|rate limit|too many requests/.test(message)) {
        return 429;
    }

    if (
        /timeout|timed out|fetch failed|network|socket hang up|econnreset|econnrefused|enotfound|ehostunreach/.test(
            message,
        )
    ) {
        return 503;
    }

    return fallbackStatus;
}

export function sendClassifiedApiError(
    res: any,
    route: string,
    error: unknown,
    fallbackMessage: string,
    options?: {
        defaultStatus?: number;
        basePayload?: Record<string, unknown>;
        details?: Record<string, unknown>;
    },
): void {
    logApiError(route, error, options?.details);
    sendJson(res, classifyApiErrorStatus(error, options?.defaultStatus ?? 500), {
        ...(options?.basePayload || {}),
        error: getApiErrorMessage(error, fallbackMessage),
    });
}

export function cleanResponseText(text: string | undefined, fallback: string): string {
    return (text?.trim() || fallback).replace(/^["']|["']$/g, '');
}
