import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    installCleanBrowserStorageInitScript,
    PLAYWRIGHT_SHARED_SNAPSHOT_FILENAMES,
    resetPlaywrightOutputSnapshots,
} from '../e2e/utils/playwrightWorkspaceIsolation';

describe('playwrightWorkspaceIsolation', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nbu-isolation-test-'));
    });

    afterEach(() => {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore temp dir cleanup errors
        }
    });

    it('defines expected shared snapshot file names', () => {
        expect(PLAYWRIGHT_SHARED_SNAPSHOT_FILENAMES).toEqual([
            'workspace_snapshot.json',
            'workspace_snapshot.json.tmp',
            'queued_batch_space.json',
            'queued_batch_space.json.tmp',
        ]);
    });

    it('removes shared snapshot files while preserving other files in output directory', () => {
        const snapshotFile = path.join(tempDir, 'workspace_snapshot.json');
        const snapshotTmp = path.join(tempDir, 'workspace_snapshot.json.tmp');
        const batchFile = path.join(tempDir, 'queued_batch_space.json');
        const batchTmp = path.join(tempDir, 'queued_batch_space.json.tmp');
        const preservedImage = path.join(tempDir, 'preserved-test-image.png');
        const preservedMeta = path.join(tempDir, 'preserved-test-image.json');

        fs.writeFileSync(snapshotFile, '{"history":[]}');
        fs.writeFileSync(snapshotTmp, '{"history":[]}');
        fs.writeFileSync(batchFile, '{"queuedJobs":[]}');
        fs.writeFileSync(batchTmp, '{"queuedJobs":[]}');
        fs.writeFileSync(preservedImage, 'fake-png');
        fs.writeFileSync(preservedMeta, '{"prompt":"keep"}');

        resetPlaywrightOutputSnapshots(tempDir);

        expect(fs.existsSync(snapshotFile)).toBe(false);
        expect(fs.existsSync(snapshotTmp)).toBe(false);
        expect(fs.existsSync(batchFile)).toBe(false);
        expect(fs.existsSync(batchTmp)).toBe(false);
        expect(fs.existsSync(preservedImage)).toBe(true);
        expect(fs.existsSync(preservedMeta)).toBe(true);
    });

    it('creates missing output directory without error', () => {
        const nonExistentDir = path.join(tempDir, 'nested-missing-dir');
        expect(fs.existsSync(nonExistentDir)).toBe(false);

        resetPlaywrightOutputSnapshots(nonExistentDir);

        expect(fs.existsSync(nonExistentDir)).toBe(true);
    });

    it('registers clean browser storage init script on page target', async () => {
        const addInitScript = vi.fn().mockImplementation(async (cb: () => void) => {
            // Execute script within a mock window context
            const mockLocalStorage = new Map<string, string>();
            const mockSessionStorage = new Map<string, string>();

            mockLocalStorage.set('stale_key', 'value');
            mockSessionStorage.set('stale_session', 'value');

            const windowMock = {
                localStorage: {
                    clear: () => mockLocalStorage.clear(),
                    getItem: (k: string) => mockLocalStorage.get(k) ?? null,
                    setItem: (k: string, v: string) => mockLocalStorage.set(k, v),
                },
                sessionStorage: {
                    clear: () => mockSessionStorage.clear(),
                    getItem: (k: string) => mockSessionStorage.get(k) ?? null,
                    setItem: (k: string, v: string) => mockSessionStorage.set(k, v),
                },
            };

            vi.stubGlobal('window', windowMock);
            try {
                cb();
                expect(mockLocalStorage.size).toBe(0);
                expect(mockSessionStorage.get('__nbu_playwright_storage_cleared__')).toBe('1');
                mockLocalStorage.set('in_test_key', 'preserved');
                cb();
                expect(mockLocalStorage.get('in_test_key')).toBe('preserved');
            } finally {
                vi.unstubAllGlobals();
            }
        });

        await installCleanBrowserStorageInitScript({ addInitScript });
        expect(addInitScript).toHaveBeenCalledTimes(1);
    });
});
