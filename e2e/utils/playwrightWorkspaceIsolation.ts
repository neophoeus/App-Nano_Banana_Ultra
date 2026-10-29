import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { PLAYWRIGHT_OUTPUT_DIR } from './playwrightPaths';

export const PLAYWRIGHT_SHARED_SNAPSHOT_FILENAMES = [
    'workspace_snapshot.json',
    'workspace_snapshot.json.tmp',
    'queued_batch_space.json',
    'queued_batch_space.json.tmp',
] as const;

export interface PlaywrightInitScriptTarget {
    addInitScript(script: () => void): Promise<void>;
}

export function resetPlaywrightOutputSnapshots(outputDir: string = PLAYWRIGHT_OUTPUT_DIR): void {
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
        return;
    }

    for (const filename of PLAYWRIGHT_SHARED_SNAPSHOT_FILENAMES) {
        const filePath = path.join(outputDir, filename);
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                if (existsSync(filePath)) {
                    rmSync(filePath, { force: true });
                }
                break;
            } catch (error) {
                const code = (error as NodeJS.ErrnoException)?.code;
                if ((code === 'EBUSY' || code === 'EPERM') && attempt < 2) {
                    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (attempt + 1));
                    continue;
                }
                throw error;
            }
        }
    }
}

export async function installCleanBrowserStorageInitScript(page: PlaywrightInitScriptTarget): Promise<void> {
    await page.addInitScript(() => {
        const guardKey = '__nbu_playwright_storage_cleared__';
        try {
            if (!window.sessionStorage.getItem(guardKey)) {
                window.localStorage.clear();
                window.sessionStorage.clear();
                window.sessionStorage.setItem(guardKey, '1');
            }
        } catch (error) {
            if (!(error instanceof Error && error.name === 'SecurityError')) {
                throw error;
            }
        }
    });
}
