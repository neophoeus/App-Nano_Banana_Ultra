import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import BranchRenameDialog from '../components/BranchRenameDialog';

const baseProps = {
    currentLanguage: 'en' as const,
    branchOriginShortId: 'b7c1d2',
    autoLabel: 'Branch b7c1d2',
    draft: 'Evening color pass',
    onDraftChange: vi.fn(),
    onUseAutomaticLabel: vi.fn(),
    onReset: vi.fn(),
    onClose: vi.fn(),
    onSubmit: vi.fn(),
};

describe('BranchRenameDialog', () => {
    it('keeps rename actions visible without a second restore-guidance block', () => {
        const markup = renderToStaticMarkup(<BranchRenameDialog {...baseProps} />);

        expect(markup).toContain('branch-rename-dialog');
        expect(markup).toContain('Use automatic label');
        expect(markup).toContain('Branch b7c1d2');
        expect(markup).not.toContain('branch-rename-restore-details');
        expect(markup).not.toContain('branch-rename-restore-summary');
        expect(markup).not.toContain('branch-rename-restore-hint');
        expect(markup).not.toContain(
            'Leave this blank, or set it back to Branch b7c1d2, to restore the automatic branch label.',
        );
        expect(markup).toContain('Reset');
        expect(markup).toContain('Save');
        expect(markup).toContain('value="Evening color pass"');
    });
});
