import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceSourcesCitationsPanel from '../components/WorkspaceSourcesCitationsPanel';

describe('WorkspaceSourcesCitationsPanel', () => {
    it('renders sources and citations as an independent shell panel', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSourcesCitationsPanel
                currentLanguage="en"
                hasContent
                statusLabel="Enabled"
                onOpenDetails={() => undefined}
            >
                <div data-testid="provenance-panel-light">Grounding evidence</div>
            </WorkspaceSourcesCitationsPanel>,
        );

        expect(markup).toContain('workspace-sources-citations-panel');
        expect(markup).toContain('Sources &amp; Citations');
        expect(markup).toContain('Source Trail');
        expect(markup).toContain('context-provenance-section');
        expect(markup).toContain('Grounding evidence');
        expect(markup).toContain('workspace-sources-open-details');
        expect(markup).toContain('View details');
        expect(markup).toContain('bg-emerald-500');
        expect(markup).not.toContain('nbu-soft-well');
    });

    it('shows a standby indicator when no cited content is available yet', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceSourcesCitationsPanel currentLanguage="en" hasContent={false} statusLabel="Standby">
                <div data-testid="provenance-panel-light">No evidence yet</div>
            </WorkspaceSourcesCitationsPanel>,
        );

        expect(markup).toContain('Standby');
        expect(markup).toContain('bg-slate-300');
    });
});
