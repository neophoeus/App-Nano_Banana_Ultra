export type DebugTerminalEventKind = 'request' | 'response' | 'error' | 'stream' | 'retry' | 'log';

export type DebugTerminalSource =
    | 'generation'
    | 'prompt-tools'
    | 'batch'
    | 'workspace'
    | 'runtime'
    | 'image-file'
    | 'backend'
    | 'workflow'
    | 'unknown';

export type DebugTerminalEvent = {
    id: string;
    kind: DebugTerminalEventKind;
    label: string;
    timestamp: number;
    requestId?: string;
    correlationId?: string;
    sessionId?: string;
    batchSessionId?: string;
    slotIndex?: number;
    jobName?: string;
    route?: string;
    endpoint?: string;
    method?: string;
    status?: number;
    durationMs?: number;
    phase?: string;
    operation?: string;
    source?: DebugTerminalSource;
    summary?: string;
    payload?: unknown;
};

export type DebugTerminalEventInput = Omit<DebugTerminalEvent, 'id' | 'timestamp' | 'payload'> & {
    id?: string;
    timestamp?: number;
    payload?: unknown;
};

export const DEBUG_TERMINAL_STORAGE_KEY = 'nbu_ultra_debug_terminal_events';
export const DEBUG_TERMINAL_MAX_EVENTS = 500;
export const DEBUG_TERMINAL_MAX_WORKSPACE_EVENTS = 80;
export const DEBUG_TERMINAL_WORKSPACE_COALESCE_WINDOW_MS = 300;
export const DEBUG_TERMINAL_REQUEST_ID_HEADER = 'X-NBU-Debug-Request-ID';

const MAX_STRING_LENGTH = 1200;
const MAX_ARRAY_ITEMS = 24;
const MAX_OBJECT_KEYS = 80;
const MAX_DEPTH = 5;

const SENSITIVE_KEY_PATTERN = /api.?key|authorization|access.?token|bearer|secret|credential|password|token/i;
const IMAGE_FIELD_PATTERN =
    /editingInput|objectImageInputs|characterImageInputs|imageDataUrl|imageUrl|displayUrl|thumbnailUrl|previewUrl|stagePreviewUrl|dataUrl|inlineData/i;
const SNAPSHOT_FIELD_PATTERN = /snapshot|workspaceSnapshot|queuedBatchSpace|history|stagedAssets|workflowLogs/i;
const DATA_URL_PATTERN = /^data:[^;]+;base64,/i;
const BASE64ISH_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

type DebugTerminalListener = (event: DebugTerminalEvent) => void;

const listeners = new Set<DebugTerminalListener>();

export const createDebugTerminalCorrelationId = (prefix = 'dbg'): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createEventId = (): string => createDebugTerminalCorrelationId('event');

const summarizeString = (value: string) => ({
    redacted: true,
    type: value.startsWith('data:') ? 'data-url' : 'base64',
    length: value.length,
    preview: value.startsWith('data:') ? value.slice(0, Math.min(value.indexOf(',') + 1 || 32, 80)) : undefined,
});

const shouldRedactString = (value: string, keyHint?: string): boolean => {
    if (DATA_URL_PATTERN.test(value)) {
        return true;
    }

    if (keyHint && IMAGE_FIELD_PATTERN.test(keyHint) && value.length > 180) {
        return true;
    }

    return value.length > 320 && BASE64ISH_PATTERN.test(value);
};

const truncateString = (value: string): string | { value: string; truncated: true; originalLength: number } => {
    if (value.length <= MAX_STRING_LENGTH) {
        return value;
    }

    return {
        value: value.slice(0, MAX_STRING_LENGTH),
        truncated: true,
        originalLength: value.length,
    };
};

const summarizeArrayPayload = (value: unknown[], keyHint?: string): unknown | null => {
    if (keyHint && IMAGE_FIELD_PATTERN.test(keyHint)) {
        return {
            redacted: true,
            reason: 'image-array',
            count: value.length,
        };
    }

    if (keyHint && SNAPSHOT_FIELD_PATTERN.test(keyHint) && value.length > MAX_ARRAY_ITEMS) {
        return {
            summarized: true,
            reason: 'large-snapshot-array',
            count: value.length,
            sample: value.slice(0, 3).map((item) => summarizeDebugTerminalPayload(item)),
        };
    }

    return null;
};

export const summarizeDebugTerminalPayload = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') {
        return value;
    }

    if (Array.isArray(value)) {
        return {
            summarized: true,
            type: 'array',
            count: value.length,
        };
    }

    const record = value as Record<string, unknown>;
    return {
        summarized: true,
        type: 'object',
        keys: Object.keys(record).slice(0, 16),
        keyCount: Object.keys(record).length,
        ...(typeof record.id === 'string' ? { id: record.id } : {}),
        ...(typeof record.name === 'string' ? { name: record.name } : {}),
        ...(typeof record.status === 'string' ? { status: record.status } : {}),
        ...(typeof record.state === 'string' ? { state: record.state } : {}),
    };
};

export const sanitizeDebugTerminalPayload = (value: unknown, keyHint?: string, depth = 0): unknown => {
    if (value == null || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        if (keyHint && SENSITIVE_KEY_PATTERN.test(keyHint)) {
            return { redacted: true, reason: 'sensitive-key', length: value.length };
        }

        if (shouldRedactString(value, keyHint)) {
            return summarizeString(value);
        }

        return truncateString(value);
    }

    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
        return String(value);
    }

    if (depth >= MAX_DEPTH) {
        return { truncated: true, reason: 'max-depth' };
    }

    if (Array.isArray(value)) {
        const summary = summarizeArrayPayload(value, keyHint);
        if (summary) {
            return summary;
        }

        const items = value
            .slice(0, MAX_ARRAY_ITEMS)
            .map((item) => sanitizeDebugTerminalPayload(item, keyHint, depth + 1));

        return value.length > MAX_ARRAY_ITEMS
            ? {
                  items,
                  truncated: true,
                  originalLength: value.length,
              }
            : items;
    }

    if (value instanceof Error) {
        const errorWithStatus = value as Error & { status?: number; code?: string; cause?: unknown };
        return {
            name: value.name,
            message: value.message,
            status: errorWithStatus.status,
            code: errorWithStatus.code,
            cause: sanitizeDebugTerminalPayload(errorWithStatus.cause, 'cause', depth + 1),
        };
    }

    const record = value as Record<string, unknown>;
    const entries = Object.entries(record);
    const sanitizedEntries = entries.slice(0, MAX_OBJECT_KEYS).map(([key, nestedValue]) => {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
            return [key, { redacted: true, reason: 'sensitive-key' }];
        }

        if (key === 'data' && typeof nestedValue === 'string' && record.mimeType) {
            return [
                key,
                {
                    redacted: true,
                    reason: 'inline-data',
                    mimeType: record.mimeType,
                    length: nestedValue.length,
                },
            ];
        }

        return [key, sanitizeDebugTerminalPayload(nestedValue, key, depth + 1)];
    });

    return {
        ...Object.fromEntries(sanitizedEntries),
        ...(entries.length > MAX_OBJECT_KEYS
            ? {
                  __truncatedKeys: entries.length - MAX_OBJECT_KEYS,
              }
            : {}),
    };
};

export const trimDebugTerminalEvents = (events: DebugTerminalEvent[]): DebugTerminalEvent[] => {
    if (events.length <= 1) {
        return events;
    }

    // Step 1: Coalesce consecutive routine workspace save events within 300ms window
    const coalesced: DebugTerminalEvent[] = [];
    for (let i = 0; i < events.length; i++) {
        const current = events[i];
        const prev = coalesced.length > 0 ? coalesced[coalesced.length - 1] : null;

        const isRoutineWorkspaceCurrent =
            current.source === 'workspace' &&
            current.kind !== 'error' &&
            (current.operation === 'workspace-snapshot.save' || current.label.toLowerCase().includes('workspace snapshot'));

        const isRoutineWorkspacePrev =
            prev !== null &&
            prev.source === 'workspace' &&
            prev.kind !== 'error' &&
            (prev.operation === 'workspace-snapshot.save' || prev.label.toLowerCase().includes('workspace snapshot'));

        if (
            isRoutineWorkspaceCurrent &&
            isRoutineWorkspacePrev &&
            prev !== null &&
            prev.phase === current.phase &&
            Math.abs(current.timestamp - prev.timestamp) < DEBUG_TERMINAL_WORKSPACE_COALESCE_WINDOW_MS
        ) {
            coalesced[coalesced.length - 1] = current;
        } else {
            coalesced.push(current);
        }
    }

    // Step 2: If routine workspace events exceed DEBUG_TERMINAL_MAX_WORKSPACE_EVENTS,
    // prune older routine workspace events so high-value generation, error, and retry events are preserved.
    const routineWorkspaceIndices: number[] = [];
    coalesced.forEach((ev, idx) => {
        if (ev.source === 'workspace' && ev.kind !== 'error') {
            routineWorkspaceIndices.push(idx);
        }
    });

    let pruned = coalesced;
    if (routineWorkspaceIndices.length > DEBUG_TERMINAL_MAX_WORKSPACE_EVENTS) {
        const excessCount = routineWorkspaceIndices.length - DEBUG_TERMINAL_MAX_WORKSPACE_EVENTS;
        const indicesToRemove = new Set(routineWorkspaceIndices.slice(0, excessCount));
        pruned = coalesced.filter((_, idx) => !indicesToRemove.has(idx));
    }

    // Step 3: Trim to DEBUG_TERMINAL_MAX_EVENTS
    return pruned.slice(-DEBUG_TERMINAL_MAX_EVENTS);
};

export const emitDebugTerminalEvent = (input: DebugTerminalEventInput): DebugTerminalEvent => {
    const event: DebugTerminalEvent = {
        ...input,
        id: input.id || createEventId(),
        timestamp: input.timestamp || Date.now(),
        requestId: input.requestId || input.correlationId,
        correlationId: input.correlationId || input.requestId,
        payload: sanitizeDebugTerminalPayload(input.payload),
    };

    listeners.forEach((listener) => listener(event));
    return event;
};

export const subscribeDebugTerminalEvents = (listener: DebugTerminalListener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const clearDebugTerminalEvents = () => {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(DEBUG_TERMINAL_STORAGE_KEY, '[]');
        } catch {
            // Diagnostic history must never block generation or UI interactions.
        }
        window.dispatchEvent(new Event('nbu_clear_debug_terminal'));
    }
};
