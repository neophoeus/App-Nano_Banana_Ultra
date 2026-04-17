import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import './setupTranslations';
import GroundingProvenancePanel from '../components/GroundingProvenancePanel';

describe('GroundingProvenancePanel', () => {
    it('renders only the continuity summary when no evidence artifacts exist yet', () => {
        const markup = renderToStaticMarkup(
            <GroundingProvenancePanel
                currentLanguage="en"
                tone="light"
                scope="primary"
                insightRows={[]}
                provenanceSummaryRows={[]}
                attributionOverviewRows={[]}
                provenanceSourceTurn={null}
                currentStageSourceHistoryId={null}
                getShortTurnId={(historyId) => historyId || 'none'}
                renderHistoryTurnActionRow={() => null}
                provenanceContinuityMessage="No provenance continuity is active for this session yet."
                provenanceSelectionMessage="Select a source or support bundle to inspect how grounding evidence connects."
                activeGroundingSelection={null}
                setActiveGroundingSelection={vi.fn()}
                focusLinkedGroundingItems={false}
                setFocusLinkedGroundingItems={vi.fn()}
                displayedSources={[]}
                displayedSupportBundles={[]}
                uncitedSources={[]}
                citedSourceIndexSet={new Set()}
                citedSourceTitleSet={new Set()}
                sourceAttributionStatusMessage="No sources to compare"
                entryPointStatusMessage="Search entry point status: Not requested"
                activeSource={null}
                activeSupportBundle={null}
                activeSourceIndexSet={new Set()}
                activeSourceTitleSet={new Set()}
                activeBundleIndexSet={new Set()}
                sourceCitationCountByIndex={new Map()}
                relatedSourcesForSelectedBundle={[]}
                otherSourcesForSelectedBundle={[]}
                relatedBundlesForSelectedSource={[]}
                activeGroundingReuseSnippet=""
                activeGroundingReuseLabel=""
                activeGroundingAppendPreview=""
                activeGroundingReplacePreview=""
                activeGroundingHasExistingPrompt={false}
                activeGroundingCurrentPromptText=""
                activeGroundingAppendCueText=""
                formatSourceHost={(url) => new URL(url).hostname}
                handleAppendGroundingSelectionToPrompt={vi.fn()}
                handleReplacePromptWithGroundingSelection={vi.fn()}
                groundingStateMessage="Grounding was not requested for this result."
                groundingSupportMessage="No grounding support bundles were returned for this result."
                groundingQueries={[]}
            />,
        );

        expect(markup).toContain('No provenance continuity is active for this session yet.');
        expect(markup).not.toContain('Select a source or support bundle to inspect how grounding evidence connects.');
        expect(markup).not.toContain('Grounding was not requested for this result.');
        expect(markup).not.toContain('Attribution Overview');
        expect(markup).not.toContain('Citation Detail');
        expect(markup).not.toContain('Source citation status');
        expect(markup).not.toContain('Model settings');
        expect(markup).not.toContain('Retrieved But Not Cited');
        expect(markup).not.toContain('Search Entry Point');
        expect(markup).not.toContain('Grounding query terms will appear here when returned by the model.');
    });

    it('renders an evidence-focused attribution overview without audit-oriented sections', () => {
        const markup = renderToStaticMarkup(
            <GroundingProvenancePanel
                currentLanguage="en"
                tone="light"
                scope="primary"
                insightRows={[
                    { label: 'Requested size', value: '4K' },
                    { label: 'Actual output', value: '1024x1024' },
                ]}
                provenanceSummaryRows={[{ id: 'mode', label: 'Mode', value: 'Live' }]}
                attributionOverviewRows={[
                    { id: 'coverage', label: 'Coverage', value: '1/2 cited' },
                    { id: 'source-mix', label: 'Source mix', value: '1 web · 1 image' },
                ]}
                provenanceSourceTurn={null}
                currentStageSourceHistoryId={null}
                getShortTurnId={(historyId) => historyId || 'none'}
                renderHistoryTurnActionRow={() => null}
                provenanceContinuityMessage="Grounding is live on this turn."
                provenanceSelectionMessage="Select a source or support bundle to inspect details."
                activeGroundingSelection={null}
                setActiveGroundingSelection={vi.fn()}
                focusLinkedGroundingItems={false}
                setFocusLinkedGroundingItems={vi.fn()}
                displayedSources={[]}
                displayedSupportBundles={[]}
                uncitedSources={[
                    {
                        index: 1,
                        source: {
                            title: 'Uncited Source',
                            url: 'https://example.com/uncited',
                            sourceType: 'image',
                        },
                    },
                ]}
                citedSourceIndexSet={new Set([0])}
                citedSourceTitleSet={new Set(['Cited Source'])}
                sourceAttributionStatusMessage="1 cited · 1 retrieved only"
                entryPointStatusMessage="Search entry point status: Not returned"
                activeSource={null}
                activeSupportBundle={null}
                activeSourceIndexSet={new Set()}
                activeSourceTitleSet={new Set()}
                activeBundleIndexSet={new Set()}
                sourceCitationCountByIndex={new Map()}
                relatedSourcesForSelectedBundle={[]}
                otherSourcesForSelectedBundle={[]}
                relatedBundlesForSelectedSource={[]}
                activeGroundingReuseSnippet="Reference source Uncited Source from example.com"
                activeGroundingReuseLabel="source example.com"
                activeGroundingAppendPreview="Current prompt\nReference cue: Reference source Uncited Source from example.com"
                activeGroundingReplacePreview="Reference source Uncited Source from example.com"
                activeGroundingHasExistingPrompt={true}
                activeGroundingCurrentPromptText="Current prompt"
                activeGroundingAppendCueText="Reference cue: Reference source Uncited Source from example.com"
                formatSourceHost={(url) => new URL(url).hostname}
                handleAppendGroundingSelectionToPrompt={vi.fn()}
                handleReplacePromptWithGroundingSelection={vi.fn()}
                groundingStateMessage="No grounding sources were returned."
                groundingSupportMessage="No grounding support bundles were returned."
                groundingQueries={[]}
            />,
        );

        expect(markup).toContain('Attribution Overview');
        expect(markup).toContain('Coverage');
        expect(markup).toContain('Source mix');
        expect(markup).toContain('1/2 cited');
        expect(markup).toContain('1 web · 1 image');
        expect(markup).not.toContain('Model settings');
        expect(markup).toContain('Source citation status');
        expect(markup).not.toContain('Entry point');
        expect(markup).toContain('Search entry point status: Not returned');
        expect(markup).toContain('Retrieved But Not Cited');
        expect(markup).toContain('Uncited Source');
        expect(markup).toContain('provenance-uncited-source-1');
    });

    it('keeps restore-derived provenance compact when no grounding artifacts were returned', () => {
        const markup = renderToStaticMarkup(
            <GroundingProvenancePanel
                currentLanguage="en"
                tone="light"
                scope="primary"
                insightRows={[{ label: 'Requested size', value: '2K' }]}
                provenanceSummaryRows={[{ id: 'mode', label: 'Mode', value: 'Inactive' }]}
                attributionOverviewRows={[
                    { id: 'coverage', label: 'Coverage', value: 'No sources' },
                    { id: 'entry-point', label: 'Entry point', value: 'Not requested' },
                ]}
                provenanceSourceTurn={
                    {
                        id: 'turn-source',
                        url: 'https://example.com/source.png',
                        prompt: 'Imported branch turn',
                        aspectRatio: '1:1',
                        size: '2K',
                        style: 'None',
                        model: 'gemini-3.1-flash-image-preview',
                        createdAt: 1,
                        status: 'success',
                        executionMode: 'single-turn',
                    } as any
                }
                currentStageSourceHistoryId="turn-source"
                getShortTurnId={(historyId) => historyId || 'none'}
                renderHistoryTurnActionRow={({ testIds }) => (
                    <div>
                        {testIds?.open ? <span data-testid={testIds.open}>open</span> : null}
                        {testIds?.continue ? <span data-testid={testIds.continue}>continue</span> : null}
                        {testIds?.branch ? <span data-testid={testIds.branch}>branch</span> : null}
                    </div>
                )}
                provenanceContinuityMessage="No provenance continuity is active for this session yet."
                provenanceSelectionMessage="No source or bundle selected yet."
                activeGroundingSelection={null}
                setActiveGroundingSelection={vi.fn()}
                focusLinkedGroundingItems={false}
                setFocusLinkedGroundingItems={vi.fn()}
                displayedSources={[]}
                displayedSupportBundles={[]}
                uncitedSources={[]}
                citedSourceIndexSet={new Set()}
                citedSourceTitleSet={new Set()}
                sourceAttributionStatusMessage="No sources to compare"
                entryPointStatusMessage="Search entry point status: Not requested"
                activeSource={null}
                activeSupportBundle={null}
                activeSourceIndexSet={new Set()}
                activeSourceTitleSet={new Set()}
                activeBundleIndexSet={new Set()}
                sourceCitationCountByIndex={new Map()}
                relatedSourcesForSelectedBundle={[]}
                otherSourcesForSelectedBundle={[]}
                relatedBundlesForSelectedSource={[]}
                activeGroundingReuseSnippet=""
                activeGroundingReuseLabel=""
                activeGroundingAppendPreview=""
                activeGroundingReplacePreview=""
                activeGroundingHasExistingPrompt={false}
                activeGroundingCurrentPromptText=""
                activeGroundingAppendCueText=""
                formatSourceHost={(url) => new URL(url).hostname}
                handleAppendGroundingSelectionToPrompt={vi.fn()}
                handleReplacePromptWithGroundingSelection={vi.fn()}
                groundingStateMessage="Grounding was not requested for this result."
                groundingSupportMessage="No grounding support bundles were returned for this result."
                groundingQueries={[]}
            />,
        );

        expect(markup).toContain('Provenance Source');
        expect(markup).toContain('provenance-source-details');
        expect(markup).toContain('provenance-source-open');
        expect(markup).toContain('History Route');
        expect(markup).toContain('This route returns to this source turn in history.');
        expect(markup).not.toContain('provenance-source-continue');
        expect(markup).not.toContain('provenance-source-branch');
        expect(markup).toContain('No provenance continuity is active for this session yet.');
        expect(markup).not.toContain('Model settings');
        expect(markup).not.toContain('No source or bundle selected yet.');
        expect(markup).not.toContain('Grounding was not requested for this result.');
        expect(markup).not.toContain('No grounding support bundles were returned for this result.');
        expect(markup).not.toContain('Search entry point status: Not requested');
        expect(markup).not.toContain('provenance-status-grid');
        expect(markup).not.toContain('Source citation status');
        expect(markup).not.toContain('Grounding query terms will appear here when returned by the model.');
    });

    it('renders cited and retrieved-only badges on source cards', () => {
        const markup = renderToStaticMarkup(
            <GroundingProvenancePanel
                currentLanguage="en"
                tone="light"
                scope="primary"
                insightRows={[]}
                provenanceSummaryRows={[]}
                attributionOverviewRows={[]}
                provenanceSourceTurn={null}
                currentStageSourceHistoryId={null}
                getShortTurnId={(historyId) => historyId || 'none'}
                renderHistoryTurnActionRow={() => null}
                provenanceContinuityMessage="Grounding is live on this turn."
                provenanceSelectionMessage="Select a source or support bundle to inspect details."
                activeGroundingSelection={{ kind: 'source', index: 0 }}
                setActiveGroundingSelection={vi.fn()}
                focusLinkedGroundingItems={false}
                setFocusLinkedGroundingItems={vi.fn()}
                displayedSources={[
                    {
                        index: 0,
                        source: {
                            title: 'Cited Source',
                            url: 'https://example.com/cited',
                            sourceType: 'web',
                        },
                    },
                    {
                        index: 1,
                        source: {
                            title: 'Retrieved Only Source',
                            url: 'https://example.com/retrieved-only',
                            sourceType: 'image',
                        },
                    },
                ]}
                displayedSupportBundles={[]}
                uncitedSources={[]}
                citedSourceIndexSet={new Set([0])}
                citedSourceTitleSet={new Set(['Cited Source'])}
                sourceAttributionStatusMessage="1 cited · 1 retrieved only"
                entryPointStatusMessage="Search entry point status: Not returned"
                activeSource={{
                    title: 'Cited Source',
                    url: 'https://example.com/cited',
                    sourceType: 'web',
                }}
                activeSupportBundle={null}
                activeSourceIndexSet={new Set([0])}
                activeSourceTitleSet={new Set(['Cited Source'])}
                activeBundleIndexSet={new Set([0])}
                sourceCitationCountByIndex={
                    new Map([
                        [0, 1],
                        [1, 0],
                    ])
                }
                relatedSourcesForSelectedBundle={[]}
                otherSourcesForSelectedBundle={[]}
                relatedBundlesForSelectedSource={[
                    {
                        index: 0,
                        bundle: {
                            chunkIndices: [0],
                            sourceIndices: [0],
                            sourceTitles: ['Cited Source'],
                            segmentText: 'Bundle text',
                        },
                    },
                ]}
                activeGroundingReuseSnippet="Reference source Cited Source from example.com"
                activeGroundingReuseLabel="source example.com"
                activeGroundingAppendPreview="Current prompt\nReference cue: Reference source Cited Source from example.com"
                activeGroundingReplacePreview="Reference source Cited Source from example.com"
                activeGroundingHasExistingPrompt={true}
                activeGroundingCurrentPromptText="Current prompt"
                activeGroundingAppendCueText="Reference cue: Reference source Cited Source from example.com"
                formatSourceHost={(url) => new URL(url).hostname}
                handleAppendGroundingSelectionToPrompt={vi.fn()}
                handleReplacePromptWithGroundingSelection={vi.fn()}
                groundingStateMessage="Grounding sources returned."
                groundingSupportMessage="No grounding support bundles were returned."
                groundingQueries={[]}
            />,
        );

        expect(markup).toContain('Cited');
        expect(markup).toContain('Retrieved only');
        expect(markup).toContain('Referenced in 1 bundles');
        expect(markup).toContain('No support bundle currently cites this source.');
        expect(markup).toContain('provenance-detail-summary');
        expect(markup).toContain('provenance-detail-selected-source-summary');
        expect(markup).toContain('provenance-detail-selected-source-details');
        expect(markup).toContain('provenance-detail-source-status');
        expect(markup).toContain('provenance-detail-source-compare-summary');
        expect(markup).toContain('provenance-detail-cited-segments-summary');
        expect(markup).toContain('provenance-detail-cited-segments-details');
        expect(markup).toContain('provenance-compare-bundle-summary-0');
        expect(markup).toContain('provenance-compare-bundle-details-0');
        expect(markup).not.toContain('provenance-source-0-inspect');
        expect(markup).toContain('Composer Reuse Preview');
        expect(markup).toContain('provenance-detail-reuse-preview');
        expect(markup).not.toContain('provenance-detail-source-status-details');
        expect(markup).toContain('Append result');
        expect(markup).toContain('Replace result');
    });

    it('renders linked sources and supporting excerpt when a bundle is selected', () => {
        const markup = renderToStaticMarkup(
            <GroundingProvenancePanel
                currentLanguage="en"
                tone="light"
                scope="primary"
                insightRows={[]}
                provenanceSummaryRows={[]}
                attributionOverviewRows={[]}
                provenanceSourceTurn={null}
                currentStageSourceHistoryId={null}
                getShortTurnId={(historyId) => historyId || 'none'}
                renderHistoryTurnActionRow={() => null}
                provenanceContinuityMessage="Grounding is live on this turn."
                provenanceSelectionMessage="Bundle selected."
                activeGroundingSelection={{ kind: 'bundle', index: 0 }}
                setActiveGroundingSelection={vi.fn()}
                focusLinkedGroundingItems={false}
                setFocusLinkedGroundingItems={vi.fn()}
                displayedSources={[]}
                displayedSupportBundles={[]}
                uncitedSources={[]}
                citedSourceIndexSet={new Set([0])}
                citedSourceTitleSet={new Set(['Cited Source'])}
                sourceAttributionStatusMessage="1 cited · 1 retrieved only"
                entryPointStatusMessage="Search entry point status: Not returned"
                activeSource={null}
                activeSupportBundle={{
                    chunkIndices: [0],
                    sourceIndices: [0],
                    sourceTitles: ['Cited Source'],
                    segmentText: 'Bundle text',
                }}
                activeSourceIndexSet={new Set([0])}
                activeSourceTitleSet={new Set(['Cited Source'])}
                activeBundleIndexSet={new Set([0])}
                sourceCitationCountByIndex={
                    new Map([
                        [0, 1],
                        [1, 0],
                    ])
                }
                relatedSourcesForSelectedBundle={[
                    {
                        index: 0,
                        source: {
                            title: 'Cited Source',
                            url: 'https://example.com/cited',
                            sourceType: 'web',
                        },
                    },
                ]}
                otherSourcesForSelectedBundle={[
                    {
                        index: 1,
                        source: {
                            title: 'Retrieved Only Source',
                            url: 'https://example.com/retrieved-only',
                            sourceType: 'image',
                        },
                    },
                ]}
                relatedBundlesForSelectedSource={[]}
                activeGroundingReuseSnippet="Cited detail: Bundle text. Sources: Cited Source"
                activeGroundingReuseLabel="support bundle 1"
                activeGroundingAppendPreview="Current prompt\nReference cue: Cited detail: Bundle text. Sources: Cited Source"
                activeGroundingReplacePreview="Cited detail: Bundle text. Sources: Cited Source"
                activeGroundingHasExistingPrompt={true}
                activeGroundingCurrentPromptText="Current prompt"
                activeGroundingAppendCueText="Reference cue: Cited detail: Bundle text. Sources: Cited Source"
                formatSourceHost={(url) => new URL(url).hostname}
                handleAppendGroundingSelectionToPrompt={vi.fn()}
                handleReplacePromptWithGroundingSelection={vi.fn()}
                groundingStateMessage="Grounding sources returned."
                groundingSupportMessage="Grounding support bundles returned."
                groundingQueries={[]}
            />,
        );

        expect(markup).toContain('provenance-detail-selected-bundle-summary');
        expect(markup).toContain('provenance-detail-selected-bundle-details');
        expect(markup).toContain('provenance-detail-bundle-segment-summary');
        expect(markup).toContain('provenance-detail-bundle-segment-details');
        expect(markup).toContain('provenance-detail-linked-sources-summary');
        expect(markup).toContain('provenance-detail-linked-sources-details');
        expect(markup).toContain('provenance-detail-bundle-compare-summary');
        expect(markup).toContain('provenance-compare-source-summary-0');
        expect(markup).toContain('provenance-compare-source-details-0');
        expect(markup).toContain('In bundle');
        expect(markup).toContain('Other Retrieved Sources');
        expect(markup).not.toContain('provenance-detail-bundle-status-details');
        expect(markup).toContain('provenance-detail-other-sources-summary');
        expect(markup).toContain('provenance-detail-other-sources-details');
        expect(markup).toContain('provenance-compare-other-source-summary-1');
        expect(markup).toContain('provenance-compare-other-source-details-1');
        expect(markup).toContain('Outside bundle');
        expect(markup).toContain('This bundle cites 1 of 2 retrieved sources.');
        expect(markup).toContain('1 retrieved sources remain outside this bundle.');
        expect(markup).toContain('Retrieved Only Source');
        expect(markup).toContain('Retrieved only');
        expect(markup).toContain('support bundle 1');
        expect(markup).toContain('Append result');
        expect(markup).toContain('Replace result');
    });

    it('uses a truncated preview for coverage bundle cards in the outer list', () => {
        const longBundleText =
            'This support bundle carries a deliberately long segment preview so the outer coverage list does not dump the entire citation text inline for first read.';
        const bundlePreview = `${longBundleText.slice(0, 88)}...`;

        const markup = renderToStaticMarkup(
            <GroundingProvenancePanel
                currentLanguage="en"
                tone="light"
                scope="primary"
                insightRows={[]}
                provenanceSummaryRows={[]}
                attributionOverviewRows={[]}
                provenanceSourceTurn={null}
                currentStageSourceHistoryId={null}
                getShortTurnId={(historyId) => historyId || 'none'}
                renderHistoryTurnActionRow={() => null}
                provenanceContinuityMessage="Grounding is live on this turn."
                provenanceSelectionMessage="Select a source or support bundle to inspect details."
                activeGroundingSelection={null}
                setActiveGroundingSelection={vi.fn()}
                focusLinkedGroundingItems={false}
                setFocusLinkedGroundingItems={vi.fn()}
                displayedSources={[]}
                displayedSupportBundles={[
                    {
                        index: 0,
                        bundle: {
                            chunkIndices: [0, 1],
                            sourceIndices: [0],
                            sourceTitles: ['Cited Source'],
                            segmentText: longBundleText,
                        },
                    },
                ]}
                uncitedSources={[]}
                citedSourceIndexSet={new Set([0])}
                citedSourceTitleSet={new Set(['Cited Source'])}
                sourceAttributionStatusMessage="1 cited"
                entryPointStatusMessage="Search entry point status: Not returned"
                activeSource={null}
                activeSupportBundle={null}
                activeSourceIndexSet={new Set()}
                activeSourceTitleSet={new Set()}
                activeBundleIndexSet={new Set()}
                sourceCitationCountByIndex={new Map([[0, 1]])}
                relatedSourcesForSelectedBundle={[]}
                otherSourcesForSelectedBundle={[]}
                relatedBundlesForSelectedSource={[]}
                activeGroundingReuseSnippet=""
                activeGroundingReuseLabel=""
                activeGroundingAppendPreview=""
                activeGroundingReplacePreview=""
                activeGroundingHasExistingPrompt={false}
                activeGroundingCurrentPromptText=""
                activeGroundingAppendCueText=""
                formatSourceHost={(url) => new URL(url).hostname}
                handleAppendGroundingSelectionToPrompt={vi.fn()}
                handleReplacePromptWithGroundingSelection={vi.fn()}
                groundingStateMessage="Grounding sources returned."
                groundingSupportMessage="Grounding support bundles returned."
                groundingQueries={[]}
            />,
        );

        expect(markup).toContain('Support bundle 1');
        expect(markup).toContain(bundlePreview);
        expect(markup).not.toContain(longBundleText);
    });

    it('uses a truncated preview for cited-segment rows in source detail summaries', () => {
        const longBundleText =
            'This related support bundle carries a deliberately long segment so the source-detail summary row should show a truncated preview before the full text inside disclosure content.';
        const bundlePreview = `${longBundleText.slice(0, 88)}...`;

        const markup = renderToStaticMarkup(
            <GroundingProvenancePanel
                currentLanguage="en"
                tone="light"
                scope="primary"
                insightRows={[]}
                provenanceSummaryRows={[]}
                attributionOverviewRows={[]}
                provenanceSourceTurn={null}
                currentStageSourceHistoryId={null}
                getShortTurnId={(historyId) => historyId || 'none'}
                renderHistoryTurnActionRow={() => null}
                provenanceContinuityMessage="Grounding is live on this turn."
                provenanceSelectionMessage="Select a source or support bundle to inspect details."
                activeGroundingSelection={{ kind: 'source', index: 0 }}
                setActiveGroundingSelection={vi.fn()}
                focusLinkedGroundingItems={false}
                setFocusLinkedGroundingItems={vi.fn()}
                displayedSources={[]}
                displayedSupportBundles={[]}
                uncitedSources={[]}
                citedSourceIndexSet={new Set([0])}
                citedSourceTitleSet={new Set(['Cited Source'])}
                sourceAttributionStatusMessage="1 cited"
                entryPointStatusMessage="Search entry point status: Not returned"
                activeSource={{
                    title: 'Cited Source',
                    url: 'https://example.com/cited',
                    sourceType: 'web',
                }}
                activeSupportBundle={null}
                activeSourceIndexSet={new Set([0])}
                activeSourceTitleSet={new Set(['Cited Source'])}
                activeBundleIndexSet={new Set([0])}
                sourceCitationCountByIndex={new Map([[0, 1]])}
                relatedSourcesForSelectedBundle={[]}
                otherSourcesForSelectedBundle={[]}
                relatedBundlesForSelectedSource={[
                    {
                        index: 0,
                        bundle: {
                            chunkIndices: [0, 1],
                            sourceIndices: [0],
                            sourceTitles: ['Cited Source'],
                            segmentText: longBundleText,
                        },
                    },
                ]}
                activeGroundingReuseSnippet="Reference source Cited Source from example.com"
                activeGroundingReuseLabel="source example.com"
                activeGroundingAppendPreview="Current prompt\nReference cue: Reference source Cited Source from example.com"
                activeGroundingReplacePreview="Reference source Cited Source from example.com"
                activeGroundingHasExistingPrompt={true}
                activeGroundingCurrentPromptText="Current prompt"
                activeGroundingAppendCueText="Reference cue: Reference source Cited Source from example.com"
                formatSourceHost={(url) => new URL(url).hostname}
                handleAppendGroundingSelectionToPrompt={vi.fn()}
                handleReplacePromptWithGroundingSelection={vi.fn()}
                groundingStateMessage="Grounding sources returned."
                groundingSupportMessage="Grounding support bundles returned."
                groundingQueries={[]}
            />,
        );

        expect(markup).toContain('provenance-compare-bundle-summary-0');
        expect(markup).toContain(bundlePreview);
    });

    it('uses a single inspect CTA per related source and bundle row', () => {
        const markup = renderToStaticMarkup(
            <GroundingProvenancePanel
                currentLanguage="en"
                tone="light"
                scope="primary"
                insightRows={[]}
                provenanceSummaryRows={[]}
                attributionOverviewRows={[]}
                provenanceSourceTurn={null}
                currentStageSourceHistoryId={null}
                getShortTurnId={(historyId) => historyId || 'none'}
                renderHistoryTurnActionRow={() => null}
                provenanceContinuityMessage="Grounding is live on this turn."
                provenanceSelectionMessage="Bundle selected."
                activeGroundingSelection={{ kind: 'bundle', index: 0 }}
                setActiveGroundingSelection={vi.fn()}
                focusLinkedGroundingItems={false}
                setFocusLinkedGroundingItems={vi.fn()}
                displayedSources={[]}
                displayedSupportBundles={[]}
                uncitedSources={[]}
                citedSourceIndexSet={new Set([0])}
                citedSourceTitleSet={new Set(['Cited Source'])}
                sourceAttributionStatusMessage="1 cited · 1 retrieved only"
                entryPointStatusMessage="Search entry point status: Not returned"
                activeSource={null}
                activeSupportBundle={{
                    chunkIndices: [0],
                    sourceIndices: [0],
                    sourceTitles: ['Cited Source'],
                    segmentText: 'Bundle text',
                }}
                activeSourceIndexSet={new Set([0])}
                activeSourceTitleSet={new Set(['Cited Source'])}
                activeBundleIndexSet={new Set([0])}
                sourceCitationCountByIndex={
                    new Map([
                        [0, 1],
                        [1, 0],
                    ])
                }
                relatedSourcesForSelectedBundle={[
                    {
                        index: 0,
                        source: {
                            title: 'Cited Source',
                            url: 'https://example.com/cited',
                            sourceType: 'web',
                        },
                    },
                ]}
                otherSourcesForSelectedBundle={[]}
                relatedBundlesForSelectedSource={[]}
                activeGroundingReuseSnippet="Cited detail: Bundle text. Sources: Cited Source"
                activeGroundingReuseLabel="support bundle 1"
                activeGroundingAppendPreview="Current prompt\nReference cue: Cited detail: Bundle text. Sources: Cited Source"
                activeGroundingReplacePreview="Cited detail: Bundle text. Sources: Cited Source"
                activeGroundingHasExistingPrompt={true}
                activeGroundingCurrentPromptText="Current prompt"
                activeGroundingAppendCueText="Reference cue: Cited detail: Bundle text. Sources: Cited Source"
                formatSourceHost={(url) => new URL(url).hostname}
                handleAppendGroundingSelectionToPrompt={vi.fn()}
                handleReplacePromptWithGroundingSelection={vi.fn()}
                groundingStateMessage="Grounding sources returned."
                groundingSupportMessage="Grounding support bundles returned."
                groundingQueries={[]}
            />,
        );

        expect(markup).toContain('provenance-compare-source-summary-0');
        expect(markup).not.toContain('provenance-compare-select-source-0');
    });

    it('localizes provenance mode and source types for non-English locales', () => {
        const markup = renderToStaticMarkup(
            <GroundingProvenancePanel
                currentLanguage="zh_TW"
                tone="light"
                scope="primary"
                insightRows={[]}
                provenanceSummaryRows={[{ id: 'mode', label: '模式', value: '即時' }]}
                attributionOverviewRows={[]}
                provenanceSourceTurn={
                    {
                        id: 'turn-source',
                        url: 'https://example.com/source.png',
                        prompt: '來源回合',
                        aspectRatio: '1:1',
                        size: '1K',
                        style: 'None',
                        model: 'gemini-3.1-flash-image-preview',
                        createdAt: 1,
                        status: 'success',
                        mode: 'Text to Image',
                        executionMode: 'single-turn',
                    } as any
                }
                currentStageSourceHistoryId="turn-source"
                getShortTurnId={(historyId) => historyId || 'none'}
                renderHistoryTurnActionRow={() => null}
                provenanceContinuityMessage="延續中"
                provenanceSelectionMessage="請選擇來源"
                activeGroundingSelection={{ kind: 'source', index: 0 }}
                setActiveGroundingSelection={vi.fn()}
                focusLinkedGroundingItems={false}
                setFocusLinkedGroundingItems={vi.fn()}
                displayedSources={[
                    {
                        index: 0,
                        source: {
                            title: '網頁來源',
                            url: 'https://example.com/cited',
                            sourceType: 'web',
                        },
                    },
                ]}
                displayedSupportBundles={[]}
                uncitedSources={[
                    {
                        index: 1,
                        source: {
                            title: '未引用來源',
                            url: 'https://example.com/uncited',
                            sourceType: 'context',
                        },
                    },
                ]}
                citedSourceIndexSet={new Set([0])}
                citedSourceTitleSet={new Set(['網頁來源'])}
                sourceAttributionStatusMessage="1 cited"
                entryPointStatusMessage="未要求"
                activeSource={{ title: '網頁來源', url: 'https://example.com/cited', sourceType: 'web' }}
                activeSupportBundle={null}
                activeSourceIndexSet={new Set([0])}
                activeSourceTitleSet={new Set(['網頁來源'])}
                activeBundleIndexSet={new Set()}
                sourceCitationCountByIndex={new Map([[0, 1]])}
                relatedSourcesForSelectedBundle={[]}
                otherSourcesForSelectedBundle={[]}
                relatedBundlesForSelectedSource={[]}
                activeGroundingReuseSnippet=""
                activeGroundingReuseLabel=""
                activeGroundingAppendPreview=""
                activeGroundingReplacePreview=""
                activeGroundingHasExistingPrompt={false}
                activeGroundingCurrentPromptText=""
                activeGroundingAppendCueText=""
                formatSourceHost={(url) => new URL(url).hostname}
                handleAppendGroundingSelectionToPrompt={vi.fn()}
                handleReplacePromptWithGroundingSelection={vi.fn()}
                groundingStateMessage="有來源"
                groundingSupportMessage="無 bundle"
                groundingQueries={[]}
            />,
        );

        expect(markup).toContain('文生圖');
        expect(markup).toContain('example.com · 網頁');
        expect(markup).toContain('example.com · 上下文');
        expect(markup).not.toContain('Text to Image ·');
        expect(markup).not.toContain(' · web');
        expect(markup).not.toContain(' · context');
    });
});
