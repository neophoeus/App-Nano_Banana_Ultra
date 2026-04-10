import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceResponseRail from '../components/WorkspaceResponseRail';

describe('WorkspaceResponseRail', () => {
    it('renders the response rail without a thoughts block', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceResponseRail
                currentLanguage="en"
                resultText="Fresh response text from the model."
                structuredData={null}
                structuredOutputMode={null}
                formattedStructuredOutput={null}
                resultPlaceholder="Result placeholder"
            />,
        );

        expect(markup).toContain('workspace-response-rail');
        expect(markup).toContain('workspace-model-output-card');
        expect(markup).toContain('Response');
        expect(markup).toContain('Result Text');
        expect(markup).toContain('Fresh response text from the model.');
        expect(markup).not.toContain('Thoughts');
        expect(markup).not.toContain('workspace-thoughts-card');
        expect(markup).not.toContain('workspace-thoughts-details');
        expect(markup).not.toContain('workspace-thoughts-summary');
        expect(markup).not.toContain('workspace-progress-open-details');
        expect(markup).not.toContain('Queued Batch Jobs');
        expect(markup).not.toContain('Grounded result');
        expect(markup).not.toContain('xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.92fr)]');
        expect(markup).toContain('bg-emerald-500');
    });

    it('shows the response placeholder once without rendering a thoughts fallback block', () => {
        const placeholder = 'Result placeholder';
        const markup = renderToStaticMarkup(
            <WorkspaceResponseRail
                currentLanguage="en"
                resultText={null}
                structuredData={null}
                structuredOutputMode={null}
                formattedStructuredOutput={null}
                resultPlaceholder="Result placeholder"
            />,
        );

        expect(markup).not.toContain('workspace-thoughts-card');
        expect(markup).not.toContain('Latest Thoughts');
        expect(markup.split(placeholder)).toHaveLength(2);
    });

    it('renders as modal detail content without the collapsible summary wrapper when requested', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceResponseRail
                currentLanguage="en"
                resultText="Fresh response text from the model."
                structuredData={null}
                structuredOutputMode={null}
                formattedStructuredOutput={null}
                resultPlaceholder="Result placeholder"
                presentation="detail-panel"
            />,
        );

        expect(markup).toContain('workspace-response-rail');
        expect(markup).toContain('workspace-model-output-card');
        expect(markup).toContain('border-emerald-200/80 bg-white/85');
        expect(markup).toContain('dark:bg-[#10201a]');
        expect(markup).not.toContain('workspace-response-rail-summary');
        expect(markup).not.toContain('<summary');
    });

    it('renders scene-brief structured output as readable sections instead of raw JSON only', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceResponseRail
                currentLanguage="en"
                resultText="Ignored because structured output exists"
                structuredData={{
                    summary: 'A lone traveler crosses a rain-soaked plaza under neon signage.',
                    sceneType: 'Cyberpunk street scene',
                    primarySubjects: ['traveler', 'umbrellas', 'neon storefronts'],
                    visualStyle: ['cinematic', 'wet reflections'],
                    colorPalette: ['electric blue', 'magenta', 'charcoal'],
                    compositionNotes: 'Wide framing with the subject offset left and signage depth on the right.',
                }}
                structuredOutputMode="scene-brief"
                formattedStructuredOutput={JSON.stringify({ summary: 'raw fallback' }, null, 2)}
                resultPlaceholder="Result placeholder"
                onAppendPrompt={() => undefined}
                onReplacePrompt={() => undefined}
            />,
        );

        expect(markup).toContain('Structured Output');
        expect(markup).toContain('structured-output-display');
        expect(markup).toContain('structured-output-summary');
        expect(markup).toContain('Cyberpunk street scene');
        expect(markup).toContain('traveler');
        expect(markup).toContain('electric blue');
        expect(markup).toContain('Wide framing with the subject offset left');
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
        expect(markup).toContain('Export Markdown');
        expect(markup).not.toContain('Replace prompt');
    });

    it('renders replace-prompt actions for high-value structured output fields', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceResponseRail
                currentLanguage="en"
                resultText="Ignored because structured output exists"
                structuredData={{
                    comparisonSummary: 'Variation B keeps the silhouette cleaner.',
                    recommendedNextMove:
                        'Keep Variation B as the base and borrow only the rear fog density from Variation C.',
                    testPrompts: ['keep B framing, add 15% more rear haze'],
                }}
                structuredOutputMode="variation-compare"
                formattedStructuredOutput={JSON.stringify({ comparisonSummary: 'raw fallback' }, null, 2)}
                resultPlaceholder="Result placeholder"
                onReplacePrompt={() => undefined}
                onAppendPrompt={() => undefined}
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

    it('renders prompt-kit guidance in the response rail without implying direct prompt replacement', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceResponseRail
                currentLanguage="en"
                resultText="Ignored because structured output exists"
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
                resultPlaceholder="Result placeholder"
                onReplacePrompt={() => undefined}
                onAppendPrompt={() => undefined}
            />,
        );

        expect(markup).toContain('structured-output-prompt-ready-hint');
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
