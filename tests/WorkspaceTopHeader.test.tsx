import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceTopHeader from '../components/WorkspaceTopHeader';

describe('WorkspaceTopHeader', () => {
    it('renders the simplified global header chrome only', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceTopHeader
                headerConsole={<div>console</div>}
                currentLanguage="en"
                onLanguageChange={vi.fn()}
            />,
        );

        expect(markup).toContain('NANO BANANA ULTRA');
        expect(markup).toContain('workspace-brand-logo');
        expect(markup).toContain('workspace-top-header');
        expect(markup).toContain('workspace-top-header-bar');
        expect(markup).toContain('console');
        expect(markup).toContain('fixed inset-x-0 top-0');
        expect(markup).toContain('rounded-t-none');
        expect(markup).toContain('rounded-b-[24px]');
        expect(markup).not.toContain('>NBU<');
        expect(markup).not.toContain('Ratio:');
        expect(markup).not.toContain('Reference Tray');
    });
});
