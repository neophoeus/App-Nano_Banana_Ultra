import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useWorkspaceBranchPresentation } from '../hooks/useWorkspaceBranchPresentation';
import { getTranslation } from '../utils/translations';

describe('useWorkspaceBranchPresentation', () => {
    it('normalizes legacy editor-follow-up lineage to continue for presentation labels and descriptions', () => {
        let labelForEditorFollowUp = '';
        let descriptionForEditorFollowUp = '';
        let labelForBranch = '';

        const TestHarness = () => {
            const { getLineageActionLabel, getLineageActionDescription } = useWorkspaceBranchPresentation({
                autoBranchLabelByOriginId: {},
                branchLabelByOriginId: {},
                branchLabelByTurnId: {},
                branchOriginIdByTurnId: {},
                branchRenameDialog: null,
                branchRenameDraft: '',
                openBranchRenameDialog: vi.fn(),
                closeBranchRenameDialog: vi.fn(),
                setBranchNameOverrides: vi.fn(),
                showNotification: vi.fn(),
                addLog: vi.fn(),
                getShortTurnId: (historyId) => historyId || '--------',
                t: (key) => getTranslation('en', key),
            });

            labelForEditorFollowUp = getLineageActionLabel('editor-follow-up');
            descriptionForEditorFollowUp = getLineageActionDescription('editor-follow-up');
            labelForBranch = getLineageActionLabel('branch');
            return null;
        };

        renderToStaticMarkup(<TestHarness />);

        expect(labelForEditorFollowUp).toBe(getTranslation('en', 'lineageActionContinue'));
        expect(descriptionForEditorFollowUp).toBe(getTranslation('en', 'lineageActionDescContinue'));
        expect(labelForBranch).toBe(getTranslation('en', 'lineageActionBranch'));
    });
});