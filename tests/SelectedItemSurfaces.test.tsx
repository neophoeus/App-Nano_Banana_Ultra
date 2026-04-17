import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SelectedItemSummaryStrip from '../components/SelectedItemSummaryStrip';
import { SelectedItemSummaryStripProps } from '../types';

const getTestIdIndex = (markup: string, testId: string) => markup.indexOf(`data-testid="${testId}"`);
const getVisibleText = (markup: string) =>
    markup
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const summaryProps: SelectedItemSummaryStripProps = {
    selectedItem: {
        source: 'selected-history',
        historyId: 'turn-abcdef12',
        item: {
            id: 'turn-abcdef12',
            url: 'https://example.com/result.png',
            prompt: 'This prompt should never render in the summary strip.',
            aspectRatio: '16:9',
            size: '2K',
            style: 'None',
            model: 'gemini-3.1-flash-image-preview',
            createdAt: 1,
            status: 'failed',
            lineageAction: 'branch',
            executionMode: 'queued-batch-job',
            mode: 'Remix',
            variantGroupId: 'batch-1',
        },
        shortId: 'abcdef12',
        branchOriginId: 'turn-root-1',
        branchLabel: 'Branch 2',
        continuationSourceHistoryId: 'turn-abcdef12',
        isStageSource: true,
        isContinuationSource: true,
    },
    chips: [
        { key: 'failed', group: 'status', label: 'Failed' },
        { key: 'stage-source', group: 'status', label: 'Stage source' },
        { key: 'continuation-source', group: 'status', label: 'Continuation source' },
        { key: 'branch', group: 'core', label: 'Branch 2' },
        { key: 'lineage-action', group: 'core', label: 'Branch' },
        { key: 'model', group: 'core', label: 'Banana 2' },
        { key: 'size', group: 'core', label: '2K' },
        { key: 'aspect-ratio', group: 'core', label: '16:9' },
        { key: 'queued-batch-position', group: 'tail', label: '#2/4' },
        { key: 'execution-mode', group: 'tail', label: 'Queued batch job' },
        { key: 'mode', group: 'tail', label: 'Remix' },
        { key: 'created-at', group: 'tail', label: '11:30 AM' },
    ],
};

describe('SelectedItem surfaces', () => {
    it('renders the summary strip with the frozen anchor and canonical chip order only', () => {
        const markup = renderToStaticMarkup(<SelectedItemSummaryStrip currentLanguage="en" {...summaryProps} />);
        const visibleText = getVisibleText(markup);

        expect(markup).toContain('selected-item-summary-strip');
        expect(markup).toContain('selected-item-summary-anchor');
        expect(markup).not.toContain('overflow-x-auto');
        expect(markup).toContain('Selected Turn');
        expect(markup).toContain('abcdef12');
        expect(markup).not.toContain('selected-item-summary-chip-short-id');
        expect(visibleText).not.toContain('This prompt should never render in the summary strip.');
        expect(getTestIdIndex(markup, 'selected-item-summary-anchor')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-failed'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-failed')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-stage-source'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-stage-source')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-continuation-source'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-continuation-source')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-branch'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-branch')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-lineage-action'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-lineage-action')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-model'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-model')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-size'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-size')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-aspect-ratio'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-aspect-ratio')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-queued-batch-position'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-queued-batch-position')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-execution-mode'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-execution-mode')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-mode'),
        );
        expect(getTestIdIndex(markup, 'selected-item-summary-chip-mode')).toBeLessThan(
            getTestIdIndex(markup, 'selected-item-summary-chip-created-at'),
        );
    });

    it('keeps the full chip set visible on medium dock widths while preserving canonical order', () => {
        const markup = renderToStaticMarkup(
            <SelectedItemSummaryStrip currentLanguage="en" layoutBucketOverride="medium" {...summaryProps} />,
        );

        expect(markup).toContain('data-layout-bucket="medium"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-queued-batch-position"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-execution-mode"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-mode"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-created-at"');
    });

    it('keeps the full chip set visible on compact dock widths while preserving core metadata', () => {
        const markup = renderToStaticMarkup(
            <SelectedItemSummaryStrip currentLanguage="en" layoutBucketOverride="compact" {...summaryProps} />,
        );

        expect(markup).toContain('data-layout-bucket="compact"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-failed"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-model"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-size"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-aspect-ratio"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-queued-batch-position"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-created-at"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-mode"');
        expect(markup).toContain('data-testid="selected-item-summary-chip-execution-mode"');
    });

});
