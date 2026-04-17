/** @vitest-environment jsdom */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceSupportDetailSurface from '../components/WorkspaceSupportDetailSurface';

const installMatchMedia = (isDesktop: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: isDesktop && query === '(min-width: 1280px)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
};

describe('WorkspaceSupportDetailSurface', () => {
    beforeEach(() => {
        installMatchMedia(true);
    });

    it('renders as a desktop right sidebar surface above the workspace shell', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSupportDetailSurface
                dataTestId="workspace-support-detail"
                title="Thoughts"
                closeLabel="Close"
                onClose={() => undefined}
                compact={true}
                headerExtra={<div data-testid="workspace-support-detail-tabs">Tabs</div>}
            >
                <div>Support detail content</div>
            </WorkspaceSupportDetailSurface>,
        );

        expect(markup).toContain('workspace-support-detail');
        expect(markup).toContain('justify-end');
        expect(markup).toContain('pt-[64px]');
        expect(markup).toContain('max-w-[840px]');
        expect(markup).toContain('max-h-[calc(100vh-124px)]');
        expect(markup).toContain('Support detail content');
        expect(markup).toContain('workspace-support-detail-tabs');
        expect(markup).toContain('Tabs');
        expect(markup).toContain('Close');
        expect(markup).not.toContain('rounded-b-none');
    });

    it('accepts a wider desktop width for progress-heavy surfaces', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSupportDetailSurface
                dataTestId="workspace-support-detail"
                title="Thoughts"
                closeLabel="Close"
                onClose={() => undefined}
                compact={true}
                desktopWidthClass="max-w-[1120px]"
            >
                <div>Support detail content</div>
            </WorkspaceSupportDetailSurface>,
        );

        expect(markup).toContain('max-w-[1120px]');
        expect(markup).not.toContain('max-w-[840px]');
    });

    it('renders as a mobile bottom sheet when the desktop panel media query is not active', () => {
        installMatchMedia(false);

        const markup = renderToStaticMarkup(
            <WorkspaceSupportDetailSurface
                dataTestId="workspace-support-detail"
                title="Output"
                closeLabel="Close"
                onClose={() => undefined}
            >
                <div>Support detail content</div>
            </WorkspaceSupportDetailSurface>,
        );

        expect(markup).toContain('workspace-support-detail');
        expect(markup).toContain('items-end');
        expect(markup).toContain('justify-stretch');
        expect(markup).toContain('max-w-none');
        expect(markup).toContain('rounded-b-none');
        expect(markup).toContain('max-h-[84vh]');
        expect(markup).toContain('Support detail content');
    });
});
