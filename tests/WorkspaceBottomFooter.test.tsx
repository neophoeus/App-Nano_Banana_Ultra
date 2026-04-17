import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceBottomFooter from '../components/WorkspaceBottomFooter';

describe('WorkspaceBottomFooter', () => {
    it('renders the fixed bottom footer with the requested copy and external link', () => {
        const markup = renderToStaticMarkup(<WorkspaceBottomFooter />);

        expect(markup).toContain('workspace-bottom-footer');
        expect(markup).toContain('workspace-bottom-footer-bar');
        expect(markup).toContain('workspace-bottom-footer-link');
        expect(markup).toContain('fixed inset-x-0 bottom-0');
        expect(markup).toContain('rounded-t-[24px]');
        expect(markup).toContain('rounded-b-none');
        expect(markup).toContain('🍌 NANO BANANA ULTRA');
        expect(markup).toContain('Designed by');
        expect(markup).toContain('Neophoeus Art');
        expect(markup).toContain('Powered by Gemini');
        expect(markup).toContain('href="https://neophoeus.art/"');
        expect(markup).toContain('target="_blank"');
        expect(markup).toContain('rel="noreferrer"');
    });
});
