import { describe, expect, it } from 'vitest';
import { buildGroundingAttributionDetails, buildGroundingAttributionOverview } from '../utils/groundingProvenance';

const dictionary: Record<string, string> = {
    groundingPanelAttributionCoverage: 'Coverage',
    groundingPanelAttributionCoverageValue: '{0}/{1} cited',
    groundingPanelAttributionSourceMix: 'Source mix',
    groundingPanelAttributionQueries: 'Queries',
    groundingPanelAttributionEntryPoint: 'Entry point',
    groundingPanelAttributionEntryPointRendered: 'Rendered preview returned',
    groundingPanelAttributionEntryPointAvailable: 'Available without rendered preview',
    groundingPanelAttributionEntryPointNotReturned: 'Not returned',
    groundingPanelAttributionEntryPointNotRequested: 'Not requested',
    groundingPanelAttributionSourceTypeWeb: 'web',
    groundingPanelAttributionSourceTypeImage: 'image',
    groundingPanelAttributionSourceTypeContext: 'context',
    groundingPanelAttributionWebQueries: 'web',
    groundingPanelAttributionImageQueries: 'image',
    groundingPanelAttributionNoSources: 'No sources',
    groundingPanelAttributionNoSourcesToCompare: 'No sources to compare',
    groundingPanelAttributionNoQueriesShort: 'No queries',
    groundingPanelAttributionEntryPointStatus: 'Search entry point status: {0}',
    groundingPanelAttributionSourceStatusValue: '{0} cited · {1} retrieved only',
};

const t = (key: string) => dictionary[key] || key;

describe('groundingProvenance', () => {
    it('builds a compact attribution overview from sources, support bundles, and queries', () => {
        const rows = buildGroundingAttributionOverview({
            grounding: {
                enabled: true,
                webQueries: ['alpha', 'beta'],
                imageQueries: ['gamma'],
                searchEntryPointAvailable: true,
                sources: [
                    { title: 'Example One', url: 'https://example.com/one', sourceType: 'web' },
                    { title: 'Example Two', url: 'https://example.com/two', sourceType: 'image' },
                    { title: 'Example Three', url: 'https://example.com/three', sourceType: 'context' },
                ],
                supports: [
                    {
                        chunkIndices: [0],
                        sourceIndices: [0, 2],
                        sourceTitles: ['Example One', 'Example Three'],
                    },
                ],
            },
            t,
        });

        expect(rows).toEqual([
            { id: 'coverage', label: 'Coverage', value: '2/3 cited' },
            { id: 'source-mix', label: 'Source mix', value: '1 web · 1 image · 1 context' },
            { id: 'queries', label: 'Queries', value: '2 web · 1 image' },
            { id: 'entry-point', label: 'Entry point', value: 'Available without rendered preview' },
        ]);
    });

    it('falls back cleanly when no grounding sources or queries were returned', () => {
        const rows = buildGroundingAttributionOverview({
            grounding: {
                enabled: false,
                sources: [],
                supports: [],
            },
            t,
        });

        expect(rows).toEqual([
            { id: 'coverage', label: 'Coverage', value: 'No sources' },
            { id: 'source-mix', label: 'Source mix', value: 'No sources' },
            { id: 'queries', label: 'Queries', value: 'No queries' },
            { id: 'entry-point', label: 'Entry point', value: 'Not requested' },
        ]);
    });

    it('reports uncited sources and a readable entry point status message', () => {
        const details = buildGroundingAttributionDetails({
            grounding: {
                enabled: true,
                webQueries: ['alpha'],
                sources: [
                    { title: 'Example One', url: 'https://example.com/one', sourceType: 'web' },
                    { title: 'Example Two', url: 'https://example.com/two', sourceType: 'image' },
                ],
                supports: [
                    {
                        chunkIndices: [0],
                        sourceIndices: [0],
                        sourceTitles: ['Example One'],
                    },
                ],
            },
            t,
        });

        expect(details.entryPointStatusMessage).toBe('Search entry point status: Not returned');
        expect(details.sourceAttributionStatusMessage).toBe('1 cited · 1 retrieved only');
        expect(Array.from(details.citedSourceIndexSet)).toEqual([0]);
        expect(Array.from(details.citedSourceTitleSet)).toEqual(['Example One']);
        expect(details.uncitedSources).toEqual([
            {
                index: 1,
                source: { title: 'Example Two', url: 'https://example.com/two', sourceType: 'image' },
            },
        ]);
    });

    it('falls back cleanly when there are no sources to compare', () => {
        const details = buildGroundingAttributionDetails({
            grounding: {
                enabled: false,
                sources: [],
                supports: [],
            },
            t,
        });

        expect(details.sourceAttributionStatusMessage).toBe('No sources to compare');
        expect(details.uncitedSources).toEqual([]);
        expect(Array.from(details.citedSourceIndexSet)).toEqual([]);
        expect(Array.from(details.citedSourceTitleSet)).toEqual([]);
    });
});
