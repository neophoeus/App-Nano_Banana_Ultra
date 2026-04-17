import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(scriptDirectory, '..');
const testsDirectory = resolve(appDirectory, 'tests');
const vitestEntry = resolve(appDirectory, 'dev-environment', 'node_modules', 'vitest', 'vitest.mjs');
const vitestConfig = resolve(appDirectory, 'vitest.config.ts');

if (!existsSync(vitestEntry)) {
    console.error(`Missing ${vitestEntry}`);
    console.error('Run run_install_all.bat or scripts/setup-dev-environment.bat first.');
    process.exit(1);
}

if (!existsSync(vitestConfig)) {
    console.error(`Missing ${vitestConfig}`);
    process.exit(1);
}

const forwardedArgs = process.argv.slice(2);
const hasConfigArg = forwardedArgs.some((arg) => arg === '--config' || arg.startsWith('--config='));
const hasRootArg = forwardedArgs.some((arg) => arg === '--root' || arg.startsWith('--root='));
const hasDirArg = forwardedArgs.some((arg) => arg === '--dir' || arg.startsWith('--dir='));
const vitestArgs = [vitestEntry, ...forwardedArgs];

if (!hasConfigArg) {
    vitestArgs.push('--config', vitestConfig);
}

if (!hasRootArg) {
    vitestArgs.push('--root', appDirectory);
}

if (!hasDirArg) {
    vitestArgs.push('--dir', testsDirectory);
}

const child = spawn(process.execPath, vitestArgs, {
    cwd: appDirectory,
    stdio: 'inherit',
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 1);
});
