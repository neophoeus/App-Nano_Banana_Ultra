import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceProgressCard from '../components/WorkspaceProgressCard';

describe('WorkspaceProgressCard', () => {
    it('renders a compact progress launcher with a signal indicator', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceProgressCard
                currentLanguage="en"
                thoughtsText="Checked lighting continuity and tightened the facial framing before the next turn."
                onOpenDetails={() => undefined}
            />,
        );

        expect(markup).toContain('workspace-progress-open-details');
        expect(markup).toContain('Progress');
        expect(markup).toContain('workspace-progress-signal');
        expect(markup).toContain('h-3.5 w-3.5');
        expect(markup).toContain('animate-pulse');
        expect(markup).toContain('bg-amber-300/60');
        expect(markup).not.toContain('context-workflow-summary');
        expect(markup).not.toContain('View details');
        expect(markup).not.toContain('Processing queued import.');
    });

    it('renders a muted slate off-state when no thoughts are available', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceProgressCard currentLanguage="en" thoughtsText={null} onOpenDetails={() => undefined} />,
        );

        expect(markup).toContain('workspace-progress-signal');
        expect(markup).toContain('bg-slate-200/65');
        expect(markup).toContain('bg-slate-500/70');
        expect(markup).not.toContain('bg-white/90');
        expect(markup).not.toContain('animate-pulse');
    });
});
