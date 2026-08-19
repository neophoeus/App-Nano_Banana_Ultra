/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getExecutionModeSetting,
    getResolvedExecutionMode,
    getWorkspaceExecutionCapabilities,
    probeExecutionMode,
    setExecutionModeSetting,
    subscribeWorkspaceExecutionMode,
    WORKSPACE_EXECUTION_MODE_STORAGE_KEY,
} from '../utils/workspaceExecutionMode';

describe('workspaceExecutionMode', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('defaults to auto mode when no storage preference exists', () => {
        expect(getExecutionModeSetting()).toBe('auto');
    });

    it('persists and retrieves manual mode setting', () => {
        setExecutionModeSetting('direct');
        expect(getExecutionModeSetting()).toBe('direct');
        expect(localStorage.getItem(WORKSPACE_EXECUTION_MODE_STORAGE_KEY)).toBe('direct');

        setExecutionModeSetting('local');
        expect(getExecutionModeSetting()).toBe('local');
        expect(localStorage.getItem(WORKSPACE_EXECUTION_MODE_STORAGE_KEY)).toBe('local');
    });

    it('resolves direct mode when explicitly selected', () => {
        setExecutionModeSetting('direct');
        expect(getResolvedExecutionMode()).toBe('direct');
    });

    it('resolves local mode when explicitly selected', () => {
        setExecutionModeSetting('local');
        expect(getResolvedExecutionMode()).toBe('local');
    });

    it('provides correct capabilities for local vs direct modes', () => {
        const localCaps = getWorkspaceExecutionCapabilities('local');
        expect(localCaps.supportsLocalDiskSave).toBe(true);
        expect(localCaps.supportsQueuedBatch).toBe(true);
        expect(localCaps.supportsServerStreaming).toBe(true);

        const directCaps = getWorkspaceExecutionCapabilities('direct');
        expect(directCaps.supportsLocalDiskSave).toBe(false);
        expect(directCaps.supportsQueuedBatch).toBe(false);
        expect(directCaps.supportsServerStreaming).toBe(false);
    });

    it('notifies subscribers on setting change', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeWorkspaceExecutionMode(listener);

        setExecutionModeSetting('direct');
        expect(listener).toHaveBeenCalledWith(
            expect.objectContaining({
                setting: 'direct',
                resolvedMode: 'direct',
            }),
        );

        unsubscribe();
        setExecutionModeSetting('local');
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('probes direct mode when window.aistudio is present', async () => {
        (window as any).aistudio = {
            hasCapability: vi.fn(),
            getApiKey: vi.fn(),
        };

        const resolved = await probeExecutionMode();
        expect(resolved).toBe('direct');
        delete (window as any).aistudio;
    });

    it('probes local mode when on localhost and /api/health responds ok with json', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const resolved = await probeExecutionMode();
        expect(resolved).toBe('local');
        expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.anything());
    });

    it('rejects SPA HTML fallback (200 text/html) and resolves direct mode', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response('<!DOCTYPE html><html><body>SPA Index</body></html>', {
                status: 200,
                headers: { 'content-type': 'text/html' },
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const resolved = await probeExecutionMode();
        expect(resolved).toBe('direct');
    });
});
