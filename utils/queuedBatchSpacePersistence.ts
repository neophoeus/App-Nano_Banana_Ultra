import { QueuedBatchJob } from '../types';
import {
    DEBUG_TERMINAL_REQUEST_ID_HEADER,
    createDebugTerminalCorrelationId,
    emitDebugTerminalEvent,
} from './debugTerminalEvents';
import { sanitizeQueuedBatchJobs } from './workspacePersistence';

export const QUEUED_BATCH_SPACE_STORAGE_KEY = 'nbu_queuedBatchSpace';
export const SHARED_QUEUED_BATCH_SPACE_ENDPOINT = '/api/queued-batch-space';
const LOCAL_QUEUED_BATCH_SPACE_ROUTE = 'local-storage';

export type QueuedBatchSpaceSnapshot = {
    queuedJobs: QueuedBatchJob[];
};

export type SharedQueuedBatchSpaceLoadResult = {
    snapshot: QueuedBatchSpaceSnapshot | null;
    reachable: boolean;
};

const EMPTY_QUEUED_BATCH_SPACE_SNAPSHOT: QueuedBatchSpaceSnapshot = {
    queuedJobs: [],
};

const buildQueuedBatchSpaceDebugPayload = (snapshot: QueuedBatchSpaceSnapshot) => ({
    queuedJobCount: snapshot.queuedJobs.length,
    states: Array.from(new Set(snapshot.queuedJobs.map((job) => job.state))).slice(0, 4),
    names: snapshot.queuedJobs.slice(0, 3).map((job) => job.name || job.localId),
});

const buildQueuedBatchSpaceDebugSummary = (snapshot: QueuedBatchSpaceSnapshot): string =>
    `${snapshot.queuedJobs.length} queued job(s)`;

const emitQueuedBatchSpaceDebugEvent = ({
    kind,
    label,
    summary,
    payload,
    route,
    endpoint,
    method,
    correlationId,
    status,
    phase,
}: {
    kind: 'request' | 'response' | 'error' | 'log';
    label: string;
    summary?: string;
    payload?: unknown;
    route: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'SET' | 'DELETE';
    correlationId: string;
    status?: number;
    phase?: string;
}) => {
    emitDebugTerminalEvent({
        kind,
        label,
        summary,
        payload,
        source: 'batch',
        route,
        endpoint,
        method,
        operation: 'Queued batch space',
        correlationId,
        status,
        phase,
    });
};

const withQueuedBatchSpaceDebugHeaders = (headers: Record<string, string>, correlationId: string): Record<string, string> => ({
    ...headers,
    [DEBUG_TERMINAL_REQUEST_ID_HEADER]: correlationId,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const sortQueuedJobs = (jobs: QueuedBatchJob[]): QueuedBatchJob[] =>
    [...jobs].sort((left, right) => right.updatedAt - left.updatedAt);

export const mergeQueuedBatchSpaceJobs = (...collections: Array<QueuedBatchJob[] | undefined>): QueuedBatchJob[] => {
    const merged: QueuedBatchJob[] = [];

    collections.forEach((collection) => {
        (collection || []).forEach((job) => {
            const existingIndex = merged.findIndex(
                (candidate) => candidate.localId === job.localId || candidate.name === job.name,
            );

            if (existingIndex < 0) {
                merged.push(job);
                return;
            }

            const existing = merged[existingIndex];
            merged[existingIndex] = existing.updatedAt > job.updatedAt ? existing : job;
        });
    });

    return sortQueuedJobs(merged);
};

export const sanitizeQueuedBatchSpaceSnapshot = (value: unknown): QueuedBatchSpaceSnapshot => {
    if (!isRecord(value)) {
        return EMPTY_QUEUED_BATCH_SPACE_SNAPSHOT;
    }

    return {
        queuedJobs: mergeQueuedBatchSpaceJobs(sanitizeQueuedBatchJobs(value.queuedJobs)),
    };
};

export const loadQueuedBatchSpaceSnapshot = (): QueuedBatchSpaceSnapshot => {
    const correlationId = createDebugTerminalCorrelationId('batchspace');
    const raw = localStorage.getItem(QUEUED_BATCH_SPACE_STORAGE_KEY);
    let persistedSnapshot = EMPTY_QUEUED_BATCH_SPACE_SNAPSHOT;

    if (raw) {
        try {
            persistedSnapshot = sanitizeQueuedBatchSpaceSnapshot(JSON.parse(raw));
        } catch (error) {
            emitQueuedBatchSpaceDebugEvent({
                kind: 'error',
                label: 'Local queued batch space parse failed',
                summary: error instanceof Error ? error.message : 'Unknown parse error',
                payload: { rawLength: raw.length },
                route: LOCAL_QUEUED_BATCH_SPACE_ROUTE,
                endpoint: QUEUED_BATCH_SPACE_STORAGE_KEY,
                method: 'GET',
                correlationId,
            });
            persistedSnapshot = EMPTY_QUEUED_BATCH_SPACE_SNAPSHOT;
        }
    }

    const snapshot = {
        queuedJobs: mergeQueuedBatchSpaceJobs(persistedSnapshot.queuedJobs),
    };

    emitQueuedBatchSpaceDebugEvent({
        kind: 'response',
        label: 'Local queued batch space load',
        summary: buildQueuedBatchSpaceDebugSummary(snapshot),
        payload: buildQueuedBatchSpaceDebugPayload(snapshot),
        route: LOCAL_QUEUED_BATCH_SPACE_ROUTE,
        endpoint: QUEUED_BATCH_SPACE_STORAGE_KEY,
        method: 'GET',
        correlationId,
    });

    return snapshot;
};

export const loadSharedQueuedBatchSpaceSnapshot = async (): Promise<SharedQueuedBatchSpaceLoadResult> => {
    const correlationId = createDebugTerminalCorrelationId('batchspace');

    emitQueuedBatchSpaceDebugEvent({
        kind: 'request',
        label: 'Shared queued batch space load',
        summary: 'Fetching shared queued batch space snapshot',
        route: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
        endpoint: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
        method: 'GET',
        correlationId,
    });

    try {
        const response = await fetch(SHARED_QUEUED_BATCH_SPACE_ENDPOINT, {
            method: 'GET',
            headers: withQueuedBatchSpaceDebugHeaders({
                Accept: 'application/json',
            }, correlationId),
        });

        if (!response.ok) {
            emitQueuedBatchSpaceDebugEvent({
                kind: 'response',
                label: 'Shared queued batch space unavailable',
                summary: `HTTP ${response.status}`,
                route: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
                endpoint: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
                method: 'GET',
                correlationId,
                status: response.status,
            });
            return {
                snapshot: null,
                reachable: false,
            };
        }

        const payload = await response.json();
        const snapshot =
            isRecord(payload) && 'snapshot' in payload
                ? payload.snapshot
                    ? sanitizeQueuedBatchSpaceSnapshot(payload.snapshot)
                    : null
                : sanitizeQueuedBatchSpaceSnapshot(payload);

        emitQueuedBatchSpaceDebugEvent({
            kind: 'response',
            label: 'Shared queued batch space load',
            summary: snapshot ? buildQueuedBatchSpaceDebugSummary(snapshot) : 'No shared queued batch space payload',
            payload: snapshot ? buildQueuedBatchSpaceDebugPayload(snapshot) : { snapshot: null },
            route: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            endpoint: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            method: 'GET',
            correlationId,
            status: response.status,
        });

        return {
            snapshot,
            reachable: true,
        };
    } catch (error) {
        emitQueuedBatchSpaceDebugEvent({
            kind: 'error',
            label: 'Shared queued batch space load failed',
            summary: error instanceof Error ? error.message : 'Unknown queued batch space error',
            route: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            endpoint: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            method: 'GET',
            correlationId,
        });
        return {
            snapshot: null,
            reachable: false,
        };
    }
};

export const saveQueuedBatchSpaceSnapshot = (snapshot: QueuedBatchSpaceSnapshot): void => {
    const correlationId = createDebugTerminalCorrelationId('batchspace');
    const normalized = sanitizeQueuedBatchSpaceSnapshot(snapshot);

    if (normalized.queuedJobs.length === 0) {
        localStorage.removeItem(QUEUED_BATCH_SPACE_STORAGE_KEY);
        emitQueuedBatchSpaceDebugEvent({
            kind: 'response',
            label: 'Local queued batch space cleared',
            summary: 'Removed local queued batch space snapshot',
            payload: buildQueuedBatchSpaceDebugPayload(normalized),
            route: LOCAL_QUEUED_BATCH_SPACE_ROUTE,
            endpoint: QUEUED_BATCH_SPACE_STORAGE_KEY,
            method: 'DELETE',
            correlationId,
            phase: 'clear',
        });
        return;
    }

    emitQueuedBatchSpaceDebugEvent({
        kind: 'request',
        label: 'Local queued batch space save',
        summary: buildQueuedBatchSpaceDebugSummary(normalized),
        payload: buildQueuedBatchSpaceDebugPayload(normalized),
        route: LOCAL_QUEUED_BATCH_SPACE_ROUTE,
        endpoint: QUEUED_BATCH_SPACE_STORAGE_KEY,
        method: 'SET',
        correlationId,
    });

    localStorage.setItem(QUEUED_BATCH_SPACE_STORAGE_KEY, JSON.stringify(normalized));

    emitQueuedBatchSpaceDebugEvent({
        kind: 'response',
        label: 'Local queued batch space saved',
        summary: buildQueuedBatchSpaceDebugSummary(normalized),
        payload: buildQueuedBatchSpaceDebugPayload(normalized),
        route: LOCAL_QUEUED_BATCH_SPACE_ROUTE,
        endpoint: QUEUED_BATCH_SPACE_STORAGE_KEY,
        method: 'SET',
        correlationId,
    });
};

export const saveSharedQueuedBatchSpaceSnapshot = async (
    snapshot: QueuedBatchSpaceSnapshot,
    options?: { allowClearing?: boolean },
): Promise<void> => {
    const normalized = sanitizeQueuedBatchSpaceSnapshot(snapshot);

    if (normalized.queuedJobs.length === 0 && !options?.allowClearing) {
        emitQueuedBatchSpaceDebugEvent({
            kind: 'log',
            label: 'Shared queued batch space save skipped',
            summary: 'No queued batch space content to persist',
            payload: buildQueuedBatchSpaceDebugPayload(normalized),
            route: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            endpoint: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            method: 'POST',
            correlationId: createDebugTerminalCorrelationId('batchspace'),
            phase: 'skip-empty',
        });
        return;
    }

    const correlationId = createDebugTerminalCorrelationId('batchspace');

    emitQueuedBatchSpaceDebugEvent({
        kind: 'request',
        label: 'Shared queued batch space save',
        summary: buildQueuedBatchSpaceDebugSummary(normalized),
        payload: buildQueuedBatchSpaceDebugPayload(normalized),
        route: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
        endpoint: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
        method: 'POST',
        correlationId,
        phase: options?.allowClearing ? 'clear' : undefined,
    });

    try {
        const response = await fetch(SHARED_QUEUED_BATCH_SPACE_ENDPOINT, {
            method: 'POST',
            headers: withQueuedBatchSpaceDebugHeaders({
                'Content-Type': 'application/json',
            }, correlationId),
            body: JSON.stringify(normalized),
            keepalive: true,
        });

        if (response.ok) {
            emitQueuedBatchSpaceDebugEvent({
                kind: 'response',
                label: options?.allowClearing ? 'Shared queued batch space cleared' : 'Shared queued batch space saved',
                summary: buildQueuedBatchSpaceDebugSummary(normalized),
                payload: buildQueuedBatchSpaceDebugPayload(normalized),
                route: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
                endpoint: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
                method: 'POST',
                correlationId,
                status: response.status,
                phase: options?.allowClearing ? 'clear' : undefined,
            });
            return;
        }

        emitQueuedBatchSpaceDebugEvent({
            kind: 'error',
            label: 'Shared queued batch space save failed',
            summary: `HTTP ${response.status}`,
            payload: buildQueuedBatchSpaceDebugPayload(normalized),
            route: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            endpoint: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            method: 'POST',
            correlationId,
            status: response.status,
            phase: options?.allowClearing ? 'clear' : undefined,
        });
    } catch (error) {
        emitQueuedBatchSpaceDebugEvent({
            kind: 'error',
            label: 'Shared queued batch space save failed',
            summary: error instanceof Error ? error.message : 'Unknown queued batch space save error',
            payload: buildQueuedBatchSpaceDebugPayload(normalized),
            route: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            endpoint: SHARED_QUEUED_BATCH_SPACE_ENDPOINT,
            method: 'POST',
            correlationId,
            phase: options?.allowClearing ? 'clear' : undefined,
        });
        // Ignore backup persistence failures and keep local batch-space writes non-blocking.
    }
};

export const clearSharedQueuedBatchSpaceSnapshot = async (): Promise<void> => {
    await saveSharedQueuedBatchSpaceSnapshot(EMPTY_QUEUED_BATCH_SPACE_SNAPSHOT, { allowClearing: true });
};
