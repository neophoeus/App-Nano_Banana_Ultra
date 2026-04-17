import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceViewerOverlay from '../components/WorkspaceViewerOverlay';

describe('WorkspaceViewerOverlay', () => {
    it('keeps the viewer inspect-first without duplicate execution or tool actions', () => {
        const longThoughts =
            'These are long viewer thoughts that should stay available for inspection in the overlay without dominating the default inspect layout or turning the viewer into a second full response rail.';
        const markup = renderToStaticMarkup(
            <WorkspaceViewerOverlay
                currentLanguage="en"
                isOpen={true}
                activeViewerImage="https://example.com/result.png"
                generatedImageCount={2}
                prompt="Viewer prompt"
                metadataItems={[
                    { key: 'ratio', label: 'Ratio', value: '1:1' },
                    { key: 'size', label: 'Size', value: '1K' },
                    { key: 'style', label: 'Style', value: 'None' },
                    { key: 'model', label: 'Model', value: 'Gemini 3.1 Flash' },
                    { key: 'temperature', label: 'Temperature', value: '1.2' },
                    { key: 'output-format', label: 'Output format', value: 'Images & text' },
                    { key: 'thinking-level', label: 'Thinking level', value: 'High' },
                    { key: 'grounding', label: 'Grounding', value: 'Google Search' },
                    { key: 'return-thoughts', label: 'Return thoughts', value: 'Visible' },
                ]}
                metadataStateMessage={null}
                effectiveThoughts={longThoughts}
                thoughtStateMessage="No visible thoughts"
                provenancePanel={<div>provenance</div>}
                sessionHintEntries={[
                    ['mode', 'single-turn'],
                    ['grounding', 'search'],
                ]}
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(_key, value) => String(value)}
                onClose={vi.fn()}
                onMoveViewer={vi.fn()}
            />,
        );

        const thoughtsPreview = `${longThoughts.slice(0, 140).trimEnd()}...`;

        expect(markup).not.toContain('workspace-viewer-title');
        expect(markup).not.toContain('workspace-viewer-desc-details');
        expect(markup).not.toContain('workspace-viewer-desc-summary');
        expect(markup).not.toContain('workspace-viewer-desc');
        expect(markup).not.toContain('Inspect the current stage image, result text, and provenance in one place.');
        expect(markup).toContain('workspace-viewer-close');
        expect(markup).toContain('aria-label="Close"');
        expect(markup).toContain('workspace-viewer-sidebar');
        expect(markup).toContain('workspace-viewer-sidebar-scroll');
        expect(markup).toContain('nbu-scrollbar-subtle');
        expect(markup).toContain('overflow-y-auto');
        expect(markup).toContain('relative flex h-full w-full flex-col sm:max-h-[calc(100vh-1.5rem)]');
        expect(markup).toContain('right-3 top-3 z-30');
        expect(markup).toContain('grid-rows-[minmax(48vh,1fr)_minmax(0,auto)]');
        expect(markup).toContain('lg:grid-cols-[minmax(0,1fr)_320px]');
        expect(markup).toContain('bg-white/96');
        expect(markup).toContain('dark:bg-[#05070b]');
        expect(markup).toContain(
            'dark:bg-[radial-gradient(circle_at_top,_rgba(18,26,36,0.34),_rgba(4,6,11,0.9)_42%,_rgba(0,0,0,0.98)_100%)]',
        );
        expect(markup).toContain('dark:bg-[linear-gradient(180deg,_rgba(17,22,30,0.98)_0%,_rgba(9,12,18,0.98)_100%)]');
        expect(markup).toContain('max-h-[42vh]');
        expect(markup).toContain('dark:bg-[#11161d]');
        expect(markup).toContain('dark:bg-[#0f141b]');
        expect(markup).toContain('dark:bg-[#131922]');
        expect(markup).not.toContain('New Conversation');
        expect(markup).not.toContain('Generate Again');
        expect(markup).not.toContain('Follow-up Edit');
        expect(markup).not.toContain('Add To References');
        expect(markup).not.toContain('Open Editor');
        expect(markup).toContain('workspace-viewer-thoughts-details');
        expect(markup).toContain('workspace-viewer-thoughts-summary');
        expect(markup).toContain('workspace-viewer-session-hints-details');
        expect(markup).toContain('workspace-viewer-session-hints-summary');
        expect(markup).toContain('Temperature');
        expect(markup).toContain('>1.2<');
        expect(markup).toContain('Output format');
        expect(markup).toContain('Images &amp; text');
        expect(markup).toContain('Thinking level');
        expect(markup).toContain('Grounding');
        expect(markup).toContain('Return thoughts');
        expect(markup).toContain(thoughtsPreview);
        expect(markup).toContain(longThoughts);
        expect(markup).toContain('mode: single-turn');
        expect(markup).toContain('workspace-viewer-session-hints-count');
        expect(markup).toContain('>2</span>');
    });

    it('redacts inline image data from viewer prompt and thoughts text', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceViewerOverlay
                currentLanguage="en"
                isOpen={true}
                activeViewerImage="https://example.com/result.png"
                generatedImageCount={1}
                prompt="Viewer prompt data:image/png;base64,AAAA"
                metadataItems={[]}
                metadataStateMessage={null}
                effectiveThoughts="Thought data:image/jpeg;base64,BBBB"
                thoughtStateMessage="No visible thoughts"
                provenancePanel={<div>provenance</div>}
                sessionHintEntries={[]}
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(_key, value) => String(value)}
                onClose={vi.fn()}
                onMoveViewer={vi.fn()}
            />,
        );

        expect(markup).toContain('inline image data omitted');
        expect(markup).not.toContain('data:image/png;base64,AAAA');
        expect(markup).not.toContain('data:image/jpeg;base64,BBBB');
    });

    it('shows the NEW badge while the current viewer item is still fresh', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceViewerOverlay
                currentLanguage="en"
                isOpen={true}
                activeViewerImage="https://example.com/result.png"
                activeViewerIsFresh={true}
                generatedImageCount={1}
                prompt="Viewer prompt"
                metadataItems={[]}
                metadataStateMessage={null}
                effectiveThoughts={null}
                thoughtStateMessage="No visible thoughts"
                provenancePanel={<div>provenance</div>}
                sessionHintEntries={[]}
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(_key, value) => String(value)}
                onClose={vi.fn()}
                onMoveViewer={vi.fn()}
            />,
        );

        expect(markup).toContain('workspace-viewer-new-badge');
        expect(markup).toContain('>New<');
        expect(markup).toContain('dark:border-emerald-500');
        expect(markup).toContain('dark:bg-emerald-400');
        expect(markup).toContain('dark:text-slate-950');
    });
});
