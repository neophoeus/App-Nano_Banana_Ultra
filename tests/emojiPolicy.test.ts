import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ALLOWED_EMOJI = '🍌';
const SCANNED_DIRECTORIES = ['components', 'hooks', 'services', 'utils', 'plugins', 'scripts', 'tests', 'constants'];
const ROOT_SOURCE_FILES = ['App.tsx', 'main.tsx', 'types.ts', 'index.html'];

function collectFiles(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) {
        return [];
    }

    const collected: string[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (
                entry.name !== 'node_modules' &&
                entry.name !== '.git' &&
                entry.name !== 'dev-environment' &&
                entry.name !== 'dist' &&
                entry.name !== 'build'
            ) {
                collected.push(...collectFiles(fullPath));
            }
        } else if (/\.(tsx?|jsx?|html|cjs|mjs)$/.test(entry.name)) {
            collected.push(fullPath);
        }
    }

    return collected;
}

describe('Global Emoji Policy Guardrail', () => {
    it('ensures that only the banana brand emoji (🍌) is allowed throughout the entire application codebase', () => {
        const allFiles: string[] = [];

        for (const dir of SCANNED_DIRECTORIES) {
            allFiles.push(...collectFiles(path.resolve(process.cwd(), dir)));
        }

        for (const file of ROOT_SOURCE_FILES) {
            const fullPath = path.resolve(process.cwd(), file);
            if (fs.existsSync(fullPath)) {
                allFiles.push(fullPath);
            }
        }

        const violations: Array<{ file: string; disallowedEmoji: string; line: number }> = [];
        const emojiRegex = /\p{Extended_Pictographic}|\p{Regional_Indicator}/gu;

        for (const file of allFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');

            lines.forEach((lineText, lineIdx) => {
                const matches = lineText.match(emojiRegex);
                if (matches) {
                    for (const match of matches) {
                        if (match !== ALLOWED_EMOJI) {
                            violations.push({
                                file: path.relative(process.cwd(), file),
                                disallowedEmoji: match,
                                line: lineIdx + 1,
                            });
                        }
                    }
                }
            });
        }

        expect(
            violations,
            `Found unexpected non-banana emojis in codebase: ${JSON.stringify(violations, null, 2)}`,
        ).toEqual([]);
    });
});
