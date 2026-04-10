import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorkspaceEvidenceDetailPanel from '../components/WorkspaceEvidenceDetailPanel';

describe('WorkspaceEvidenceDetailPanel', () => {
    it('renders labeled counts plus only distinct provenance metadata above the provenance inspector body', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceEvidenceDetailPanel
                currentLanguage="en"
                provenanceSummaryRows={[
                    { id: 'mode', label: 'Mode', value: 'Live' },
                    { id: 'source-turn', label: 'Source turn', value: 'turn-7' },
                    { id: 'sources', label: 'Sources', value: '2' },
                    { id: 'support-bundles', label: 'Support bundles', value: '1' },
                ]}
                provenanceContinuityMessage="Grounding shown here was returned directly on the active session turn."
                groundingStateMessage="Grounded sources were returned for this result."
                groundingSupportMessage="Grounding support bundles show which retrieved sources were actively used."
                totalSourceCount={2}
                totalSupportBundleCount={1}
            >
                <div data-testid="provenance-panel-light">Grounding evidence</div>
            </WorkspaceEvidenceDetailPanel>,
        );

        expect(markup).toContain('workspace-evidence-detail-panel');
        expect(markup).toContain('workspace-evidence-detail-summary');
        expect(markup).toContain('workspace-evidence-detail-count-sources');
        expect(markup).toContain('workspace-evidence-detail-count-support-bundles');
        expect(markup).toContain('border-sky-200/80 bg-white/85');
        expect(markup).toContain('dark:bg-[#0d1720]');
        expect(markup).toContain('dark:bg-[#10202c]');
        expect(markup).toContain('dark:bg-[#111b25]');
        expect(markup).toContain('workspace-evidence-detail-summary-mode');
        expect(markup).toContain('workspace-evidence-detail-summary-source-turn');
        expect(markup).toContain('Sources');
        expect(markup).toContain('Support bundles');
        expect(markup).toContain('Source turn');
        expect(markup).toContain('turn-7');
        expect(markup).toContain('workspace-evidence-detail-summary-text');
        expect(markup).toContain('Grounded sources were returned for this result.');
        expect(markup).toContain('workspace-evidence-detail-body');
        expect(markup).toContain('provenance-panel-light');
        expect(markup).not.toContain('workspace-evidence-detail-grounding');
        expect(markup).not.toContain('workspace-evidence-detail-support');
        expect(markup).not.toContain('workspace-evidence-detail-summary-sources');
        expect(markup).not.toContain('workspace-evidence-detail-summary-support-bundles');
    });

    it('shows a reserved state when no evidence is available yet', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceEvidenceDetailPanel
                currentLanguage="en"
                provenanceSummaryRows={[]}
                provenanceContinuityMessage="No provenance continuity is active for this session yet."
                groundingStateMessage="Grounding was not requested for this result."
                groundingSupportMessage="No grounding support bundles were returned for this result."
                totalSourceCount={0}
                totalSupportBundleCount={0}
            >
                <div data-testid="provenance-panel-light">No evidence yet</div>
            </WorkspaceEvidenceDetailPanel>,
        );

        expect(markup).toContain('workspace-evidence-detail-summary-text');
        expect(markup).toContain('Grounding was not requested for this result.');
        expect(markup).toContain('workspace-evidence-detail-count-sources');
        expect(markup).toContain('workspace-evidence-detail-count-support-bundles');
        expect(markup).not.toContain('workspace-evidence-detail-summary-rows');
        expect(markup).toContain('No evidence yet');
    });
});
