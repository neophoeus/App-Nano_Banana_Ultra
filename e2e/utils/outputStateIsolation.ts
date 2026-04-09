import fs from 'fs';
import os from 'os';
import path from 'path';

const MANIFEST_PATH = path.resolve(process.cwd(), 'test-results', '.playwright-output-state-manifest.json');
const MANAGED_OUTPUT_STATE_FILES = [
    'workspace_snapshot.json',
    'workspace_snapshot.json.tmp',
] as const;

type OutputStateManifest = {
    outputDir: string;
    backupDir: string;
    managedFiles: string[];
};

const readManifest = (): OutputStateManifest | null => {
    if (!fs.existsSync(MANIFEST_PATH)) {
        return null;
    }

    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as OutputStateManifest;
};

const cleanupBackupArtifacts = (manifest: OutputStateManifest) => {
    for (const fileName of manifest.managedFiles) {
        const backupPath = path.join(manifest.backupDir, fileName);
        if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
        }
    }

    if (fs.existsSync(manifest.backupDir)) {
        fs.rmSync(manifest.backupDir, { recursive: true, force: true });
    }

    if (fs.existsSync(MANIFEST_PATH)) {
        fs.unlinkSync(MANIFEST_PATH);
    }
};

export const restorePlaywrightOutputState = () => {
    const manifest = readManifest();
    if (!manifest) {
        return;
    }

    fs.mkdirSync(manifest.outputDir, { recursive: true });

    for (const fileName of manifest.managedFiles) {
        const outputPath = path.join(manifest.outputDir, fileName);
        const backupPath = path.join(manifest.backupDir, fileName);

        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, outputPath);
        }
    }

    cleanupBackupArtifacts(manifest);
};

export const isolatePlaywrightOutputState = () => {
    restorePlaywrightOutputState();

    const outputDir = path.resolve(process.cwd(), 'output');
    const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nbu-playwright-output-state-'));

    fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });

    for (const fileName of MANAGED_OUTPUT_STATE_FILES) {
        const outputPath = path.join(outputDir, fileName);
        const backupPath = path.join(backupDir, fileName);

        if (!fs.existsSync(outputPath)) {
            continue;
        }

        fs.copyFileSync(outputPath, backupPath);
        fs.unlinkSync(outputPath);
    }

    const manifest: OutputStateManifest = {
        outputDir,
        backupDir,
        managedFiles: [...MANAGED_OUTPUT_STATE_FILES],
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
};
