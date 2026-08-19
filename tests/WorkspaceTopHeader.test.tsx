import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceTopHeader from '../components/WorkspaceTopHeader';

describe('WorkspaceTopHeader', () => {
    it('renders the simplified global header chrome only', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceTopHeader headerConsole={<div>console</div>} currentLanguage="en" onLanguageChange={vi.fn()} />,
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

    it('renders grid-cols-2 when 2 support items are provided (Lite mode)', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceTopHeader
                headerConsole={<div>console</div>}
                currentLanguage="en"
                onLanguageChange={vi.fn()}
                supportRail={
                    <>
                        <button type="button">Progress</button>
                        <button type="button">Support</button>
                    </>
                }
            />,
        );

        expect(markup).toContain('grid-cols-2');
        expect(markup).not.toContain('grid-cols-3');
    });

    it('renders grid-cols-3 when 3 support items are provided (Local mode)', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceTopHeader
                headerConsole={<div>console</div>}
                currentLanguage="en"
                onLanguageChange={vi.fn()}
                supportRail={
                    <>
                        <button type="button">Progress</button>
                        <button type="button">Support</button>
                        <button type="button">Queue</button>
                    </>
                }
            />,
        );

        expect(markup).toContain('grid-cols-3');
        expect(markup).not.toContain('grid-cols-2');
    });
});
