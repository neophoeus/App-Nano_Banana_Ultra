import { describe, expect, it } from 'vitest';
import { GeneratedImage } from '../types';
import { buildBranchSummaries, buildLineagePresentation } from '../utils/lineage';
import { translations } from '../utils/translations';

const buildTurn = (overrides: Partial<GeneratedImage> = {}): GeneratedImage => ({
    id: 'turn-1',
    url: 'https://example.com/image.png',
    prompt: 'Prompt',
    aspectRatio: '1:1',
    size: '1K',
    style: 'None',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: 1,
    status: 'success',
    ...overrides,
});

describe('lineage', () => {
    it('builds localized automatic branch labels when label config is provided', () => {
        const history = [
            buildTurn({ id: 'root-1', rootHistoryId: 'root-1', lineageAction: 'root', createdAt: 1 }),
            buildTurn({
                id: 'turn-2',
                parentHistoryId: 'root-1',
                rootHistoryId: 'root-1',
                lineageAction: 'continue',
                createdAt: 2,
            }),
            buildTurn({
                id: 'branch-1',
                parentHistoryId: 'root-1',
                rootHistoryId: 'root-1',
                lineageAction: 'branch',
                createdAt: 3,
            }),
        ];

        const presentation = buildLineagePresentation(
            history,
            {},
            {
                main: '主線',
                branchNumber: '分支 {0}',
            },
        );

        expect(presentation.branchLabelByTurnId['root-1']).toBe('主線');
        expect(presentation.branchLabelByTurnId['turn-2']).toBe('主線');
        expect(presentation.branchLabelByTurnId['branch-1']).toBe('分支 1');
    });

    it('uses translation-backed english defaults for automatic branch labels', () => {
        const history = [
            buildTurn({ id: 'root-1', rootHistoryId: 'root-1', lineageAction: 'root', createdAt: 1 }),
            buildTurn({
                id: 'branch-1',
                parentHistoryId: 'root-1',
                rootHistoryId: 'root-1',
                lineageAction: 'branch',
                createdAt: 2,
            }),
        ];

        const summaries = buildBranchSummaries(history);

        expect(summaries[0]?.autoBranchLabel).toBe('Branch 1');
        expect(summaries[1]?.autoBranchLabel).toBe('Main');
    });

    it('defines localized automatic branch labels for every supported language', () => {
        for (const language of Object.keys(translations)) {
            expect(translations[language as keyof typeof translations].historyBranchMain).toBeTruthy();
            expect(translations[language as keyof typeof translations].historyBranchNumber).toContain('{0}');
        }
    });
});
