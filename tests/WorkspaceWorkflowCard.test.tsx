import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceWorkflowCard from '../components/WorkspaceWorkflowCard';

describe('WorkspaceWorkflowCard', () => {
    it('renders a one-line workflow status card with a thoughts indicator and detail entry point', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceWorkflowCard
                currentLanguage="en"
                latestWorkflowEntry={{
                    displayMessage: 'Processing queued import.',
                    label: 'Processing',
                    stage: 'processing',
                    timestamp: '10:05',
                }}
                isGenerating={false}
                thoughtsText="Checked lighting continuity and tightened the facial framing before the next turn."
                onOpenDetails={() => undefined}
            />,
        );

        expect(markup).toContain('workspace-workflow-card');
        expect(markup).toContain('context-workflow-summary');
        expect(markup).toContain('Current Work');
        expect(markup).toContain('Processing queued import.');
        expect(markup).toContain('workspace-workflow-thoughts-indicator');
        expect(markup).toContain('border-amber-300/70');
        expect(markup).toContain('workspace-workflow-open-details');
        expect(markup).toContain('View details');
        expect(markup).not.toContain('workspace-workflow-card-summary');
        expect(markup).not.toContain('current-work-thoughts-section');
        expect(markup).not.toContain('current-stage-source');
    });
});
