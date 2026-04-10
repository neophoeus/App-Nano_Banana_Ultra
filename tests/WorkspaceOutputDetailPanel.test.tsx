import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceOutputDetailPanel from '../components/WorkspaceOutputDetailPanel';

describe('WorkspaceOutputDetailPanel', () => {
    it('renders a one-line structured preview above the existing response rail for structured results', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceOutputDetailPanel
                currentLanguage="en"
                resultText="Ignored because structured output exists"
                structuredData={{
                    summary: 'Night portrait with glossy rain reflections and dense backlight haze.',
                    sceneType: 'Editorial portrait',
                }}
                structuredOutputMode="scene-brief"
                formattedStructuredOutput={JSON.stringify({ summary: 'raw fallback' }, null, 2)}
                resultPlaceholder="Result placeholder"
                onReplacePrompt={() => undefined}
                onAppendPrompt={() => undefined}
            />,
        );

        expect(markup).toContain('workspace-output-detail-panel');
        expect(markup).toContain('workspace-output-detail-summary');
        expect(markup).toContain('workspace-output-detail-mode');
        expect(markup).toContain('border-emerald-200/80 bg-white/85');
        expect(markup).toContain('dark:bg-[#0f1916]');
        expect(markup).toContain('dark:bg-[#10201a]');
        expect(markup).toContain('Response');
        expect(markup).toContain('Structured Output');
        expect(markup).toContain('Night portrait with glossy rain reflections and dense backlight haze.');
        expect(markup).toContain('workspace-response-rail');
        expect(markup).toContain('workspace-model-output-card');
        expect(markup).toContain('structured-output-display');
        expect(markup).not.toContain('workspace-thoughts-card');
    });

    it('uses the active result text as the support-family summary when no structured output is present', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceOutputDetailPanel
                currentLanguage="en"
                resultText="Fresh response text from the model with extra detail for the active turn."
                structuredData={null}
                structuredOutputMode={null}
                formattedStructuredOutput={null}
                resultPlaceholder="Result placeholder"
            />,
        );

        expect(markup).toContain('workspace-output-detail-summary-text');
        expect(markup).toContain('Fresh response text from the model with extra detail for the active turn.');
        expect(markup).toContain('Result Text');
        expect(markup).toContain('workspace-response-rail');
    });

    it('falls back to the generic structured-output hint when no compact preview can be extracted', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceOutputDetailPanel
                currentLanguage="en"
                resultText={null}
                structuredData={{ layout: [{ priority: null }, { details: [] }] }}
                structuredOutputMode="scene-brief"
                formattedStructuredOutput={'{\n  "layout": []\n}'}
                resultPlaceholder="Result placeholder"
            />,
        );

        expect(markup).toContain('Compact scan here. Open viewer for the full structured-output layout.');
    });
});
