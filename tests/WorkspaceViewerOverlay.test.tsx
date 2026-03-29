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
                aspectRatio="1:1"
                size="1K"
                styleLabel="None"
                model="Gemini 3.1 Flash"
                effectiveResultText="Viewer text"
                structuredData={null}
                structuredOutputMode={null}
                formattedStructuredOutput={null}
                effectiveThoughts={longThoughts}
                thoughtStateMessage="No visible thoughts"
                provenancePanel={<div>provenance</div>}
                sessionHintEntries={[
                    ['mode', 'single-turn'],
                    ['grounding', 'search'],
                ]}
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(value) => String(value)}
                onClose={vi.fn()}
                onMoveViewer={vi.fn()}
                onAppendPrompt={vi.fn()}
                onReplacePrompt={vi.fn()}
            />,
        );

        const thoughtsPreview = `${longThoughts.slice(0, 140).trimEnd()}...`;
        const viewerDescMatches = markup.match(
            /Inspect the current stage image, result text, and provenance in one place\./g,
        );

        expect(markup).toContain('Inspect the current stage image, result text, and provenance in one place.');
        expect(viewerDescMatches).toHaveLength(1);
        expect(markup).toContain('workspace-viewer-desc-details');
        expect(markup).toContain('workspace-viewer-desc-summary');
        expect(markup).toContain('workspace-viewer-desc');
        expect(markup).toContain('>Prompt<');
        expect(markup).toContain('>Result Text<');
        expect(markup).toContain('>Provenance<');
        expect(markup).toContain('>Session Hints<');
        expect(markup).not.toContain('New Conversation');
        expect(markup).not.toContain('Generate Again');
        expect(markup).not.toContain('Follow-up Edit');
        expect(markup).not.toContain('Add To References');
        expect(markup).not.toContain('Open Editor');
        expect(markup).toContain('workspace-viewer-thoughts-details');
        expect(markup).toContain('workspace-viewer-thoughts-summary');
        expect(markup).toContain('workspace-viewer-session-hints-details');
        expect(markup).toContain('workspace-viewer-session-hints-summary');
        expect(markup).toContain(thoughtsPreview);
        expect(markup).toContain(longThoughts);
        expect(markup).toContain('mode: single-turn');
        expect(markup).toContain('workspace-viewer-session-hints-count');
        expect(markup).toContain('>2</span>');
    });

    it('renders scene-brief structured output in the viewer overlay as structured sections', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceViewerOverlay
                currentLanguage="en"
                isOpen={true}
                activeViewerImage="https://example.com/result.png"
                generatedImageCount={1}
                prompt="Viewer prompt"
                aspectRatio="1:1"
                size="1K"
                styleLabel="None"
                model="Gemini 3.1 Flash"
                effectiveResultText="Viewer text"
                structuredData={{
                    summary: 'A rain-lit alley portrait with strong backlight and shallow depth of field.',
                    sceneType: 'Night portrait',
                    primarySubjects: ['subject', 'alley signage'],
                    visualStyle: ['cinematic', 'portrait'],
                    colorPalette: ['teal', 'orange'],
                    compositionNotes: 'Centered subject with signage framing on both edges.',
                }}
                structuredOutputMode="scene-brief"
                formattedStructuredOutput={JSON.stringify({ summary: 'raw fallback' }, null, 2)}
                effectiveThoughts={null}
                thoughtStateMessage="No visible thoughts"
                provenancePanel={<div>provenance</div>}
                sessionHintEntries={[]}
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(value) => String(value)}
                onClose={vi.fn()}
                onMoveViewer={vi.fn()}
                onReplacePrompt={vi.fn()}
                onAppendPrompt={vi.fn()}
            />,
        );

        expect(markup).toContain('Structured Output');
        expect(markup).toContain('Full inspection layout for the same structured output shown in the top rail.');
        expect(markup).toContain('workspace-viewer-structured-output-hint');
        expect(markup).toContain('workspace-viewer-structured-output-hint-trigger');
        expect(markup).toContain('structured-output-display');
        expect(markup).toContain('Night portrait');
        expect(markup).toContain('alley signage');
        expect(markup).toContain('Centered subject with signage framing on both edges.');
        expect(markup).toContain('structured-output-actions');
        expect(markup).toContain('structured-output-actions-menu');
        expect(markup).toContain('structured-output-actions-summary');
        expect(markup).toContain('Actions');
        expect(markup).toContain('structured-output-actions-copy-group-label');
        expect(markup).toContain('structured-output-actions-export-group-label');
        expect(markup).toContain('Copy');
        expect(markup).toContain('Export');
        expect(markup).toContain('Copy JSON');
        expect(markup).toContain('Copy text');
        expect(markup).toContain('Export JSON');
        expect(markup).toContain('Export text');
        expect(markup).not.toContain('Replace prompt');
    });

    it('renders replace-prompt actions in the viewer overlay for high-value structured fields', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceViewerOverlay
                currentLanguage="en"
                isOpen={true}
                activeViewerImage="https://example.com/result.png"
                generatedImageCount={1}
                prompt="Viewer prompt"
                aspectRatio="1:1"
                size="1K"
                styleLabel="None"
                model="Gemini 3.1 Flash"
                effectiveResultText="Viewer text"
                structuredData={{
                    comparisonSummary: 'Variation B keeps the silhouette cleaner.',
                    recommendedNextMove:
                        'Keep Variation B as the base and borrow only the rear fog density from Variation C.',
                    testPrompts: ['keep B framing, add 15% more rear haze'],
                }}
                structuredOutputMode="variation-compare"
                formattedStructuredOutput={JSON.stringify({ comparisonSummary: 'raw fallback' }, null, 2)}
                effectiveThoughts={null}
                thoughtStateMessage="No visible thoughts"
                provenancePanel={<div>provenance</div>}
                sessionHintEntries={[]}
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(value) => String(value)}
                onClose={vi.fn()}
                onMoveViewer={vi.fn()}
                onReplacePrompt={vi.fn()}
                onAppendPrompt={vi.fn()}
            />,
        );

        expect(markup).toContain('Replace prompt');
        expect(markup).toContain('Next prompt');
        expect(markup).toContain('Prompt-ready fields below can replace the composer prompt for the next pass.');
        expect(markup).toContain(
            'Use the recommended move or a test prompt below to drive the next comparison pass quickly.',
        );
        expect(markup).toContain('structured-output-prompt-ready-hint');
        expect(markup).toContain('structured-output-replace-prompt-section-recommendedNextMove');
        expect(markup).toContain('structured-output-prompt-ready-section-recommendedNextMove');
        expect(markup).toContain('structured-output-prompt-candidate-testPrompts-0');
        expect(markup).toContain('structured-output-append-prompt-testPrompts-0');
        expect(markup).toContain('structured-output-replace-prompt-testPrompts-0');
    });

    it('renders prompt-kit guidance in the viewer overlay without implying direct prompt replacement', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceViewerOverlay
                currentLanguage="en"
                isOpen={true}
                activeViewerImage="https://example.com/result.png"
                generatedImageCount={1}
                prompt="Viewer prompt"
                aspectRatio="1:1"
                size="1K"
                styleLabel="None"
                model="Gemini 3.1 Flash"
                effectiveResultText="Viewer text"
                structuredData={{
                    intentSummary: 'Bright editorial fruit still life with crisp studio polish.',
                    subjectCues: ['banana', 'glass bowl', 'linen cloth'],
                    styleCues: ['editorial', 'premium product photography'],
                    lightingCues: ['hard side light', 'clean specular highlights'],
                    compositionCues: ['three-quarter angle', 'negative space on the right'],
                    negativeCues: ['human hands', 'busy background'],
                }}
                structuredOutputMode="prompt-kit"
                formattedStructuredOutput={JSON.stringify({ intentSummary: 'raw fallback' }, null, 2)}
                effectiveThoughts={null}
                thoughtStateMessage="No visible thoughts"
                provenancePanel={<div>provenance</div>}
                sessionHintEntries={[]}
                formatSessionHintKey={(key) => key}
                formatSessionHintValue={(value) => String(value)}
                onClose={vi.fn()}
                onMoveViewer={vi.fn()}
                onReplacePrompt={vi.fn()}
                onAppendPrompt={vi.fn()}
            />,
        );

        expect(markup).toContain('structured-output-prompt-ready-hint');
        expect(markup).toContain('Full inspection layout for the same structured output shown in the top rail.');
        expect(markup).toContain('workspace-viewer-structured-output-hint-trigger');
        expect(markup).toContain('Use the reusable cues below when you want to build the next prompt by hand.');
        expect(markup).toContain('data-prompt-building-section="true"');
        expect(markup).toContain('border-sky-200/80');
        expect(markup).not.toContain('Prompt-ready fields below can replace the composer prompt for the next pass.');
        expect(markup).toContain('Append to prompt');
        expect(markup).toContain('structured-output-append-prompt-section-prompt-draft');
        expect(markup).toContain('Replace prompt');
        expect(markup).toContain('structured-output-replace-prompt-section-prompt-draft');
        expect(markup).toContain('structured-output-prompt-ready-section-prompt-draft');
    });
});
