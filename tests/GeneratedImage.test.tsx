import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GeneratedImage from '../components/GeneratedImage';

const getTestIdIndex = (markup: string, testId: string) => markup.indexOf(`data-testid="${testId}"`);
const getVisibleText = (markup: string) =>
    markup
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

describe('GeneratedImage', () => {
    it('renders the standard stage cluster in canonical context and action order without workspace prompt text', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={['https://example.com/result.png']}
                isLoading={false}
                prompt="Test prompt"
                settings={{
                    aspectRatio: '1:1',
                    size: '4K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    batchSize: 1,
                }}
                generationMode="Text to Image"
                executionMode="single-turn"
                onGenerate={() => {}}
                stageTopRight={{
                    contextChips: [
                        { key: 'stage-source', label: 'Stage source', tone: 'source' },
                        { key: 'branch', label: 'Main', tone: 'branch' },
                        { key: 'continuation-differs', label: 'Continuation differs', tone: 'divergence' },
                        { key: 'result-status', label: 'Grounded result', tone: 'warning' },
                    ],
                    overflowContextChips: [],
                    visibleActions: [
                        {
                            key: 'continue-from-here',
                            label: 'Continue From Here',
                            emphasis: 'primary',
                            onClick: () => {},
                        },
                        { key: 'edit', label: 'Edit', emphasis: 'secondary', onClick: () => {} },
                        {
                            key: 'open-viewer',
                            label: 'Open Viewer',
                            emphasis: 'secondary',
                            onClick: () => {},
                        },
                    ],
                    overflowActions: [
                        {
                            key: 'add-object-reference',
                            label: 'Add to Object Reference',
                            emphasis: 'secondary',
                            onClick: () => {},
                        },
                        {
                            key: 'add-character-reference',
                            label: 'Add to Character Reference',
                            emphasis: 'secondary',
                            onClick: () => {},
                        },
                        {
                            key: 'branch-from-here',
                            label: 'Branch From Here',
                            emphasis: 'secondary',
                            onClick: () => {},
                        },
                        { key: 'clear', label: 'Clear', emphasis: 'destructive', onClick: () => {} },
                    ],
                }}
            />,
        );
        const visibleText = getVisibleText(markup);

        expect(markup).toContain('stage-top-right-cluster');
        expect(markup).toContain('stage-top-right-chip-stage-source');
        expect(markup).toContain('stage-top-right-chip-branch');
        expect(markup).toContain('stage-top-right-chip-continuation-differs');
        expect(markup).toContain('stage-top-right-chip-result-status');
        expect(markup).toContain('stage-top-right-action-continue-from-here');
        expect(markup).toContain('stage-top-right-action-edit');
        expect(markup).toContain('stage-top-right-action-open-viewer');
        expect(markup).toContain('stage-top-right-overflow-action-add-object-reference');
        expect(markup).toContain('stage-top-right-overflow-action-add-character-reference');
        expect(markup).toContain('stage-top-right-overflow-action-branch-from-here');
        expect(markup).toContain('stage-top-right-overflow-action-clear');
        expect(getTestIdIndex(markup, 'stage-top-right-chip-stage-source')).toBeLessThan(
            getTestIdIndex(markup, 'stage-top-right-chip-branch'),
        );
        expect(getTestIdIndex(markup, 'stage-top-right-chip-branch')).toBeLessThan(
            getTestIdIndex(markup, 'stage-top-right-chip-continuation-differs'),
        );
        expect(getTestIdIndex(markup, 'stage-top-right-chip-continuation-differs')).toBeLessThan(
            getTestIdIndex(markup, 'stage-top-right-chip-result-status'),
        );
        expect(getTestIdIndex(markup, 'stage-top-right-action-continue-from-here')).toBeLessThan(
            getTestIdIndex(markup, 'stage-top-right-action-edit'),
        );
        expect(getTestIdIndex(markup, 'stage-top-right-action-edit')).toBeLessThan(
            getTestIdIndex(markup, 'stage-top-right-action-open-viewer'),
        );
        expect(getTestIdIndex(markup, 'stage-top-right-overflow-action-add-object-reference')).toBeLessThan(
            getTestIdIndex(markup, 'stage-top-right-overflow-action-add-character-reference'),
        );
        expect(getTestIdIndex(markup, 'stage-top-right-overflow-action-add-character-reference')).toBeLessThan(
            getTestIdIndex(markup, 'stage-top-right-overflow-action-branch-from-here'),
        );
        expect(getTestIdIndex(markup, 'stage-top-right-overflow-action-branch-from-here')).toBeLessThan(
            getTestIdIndex(markup, 'stage-top-right-overflow-action-clear'),
        );
        expect(markup).not.toContain('Test prompt');
        expect(visibleText).not.toContain('Test prompt');
        expect(markup).not.toContain('stage-open-viewer');
        expect(markup).not.toContain('data-testid="stage-top-right-action-open"');
        expect(markup).not.toContain('data-testid="stage-top-right-action-rename-branch"');
        expect(markup).not.toContain('data-testid="stage-top-right-action-generate"');
        expect(markup).not.toContain('data-testid="stage-top-right-action-cancel"');
        expect(markup).not.toContain('Actual output');
    });

    it('renders the no-linked-history exception with Edit, Open Viewer, and Add to Object Reference visible', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={['https://example.com/result.png']}
                isLoading={false}
                prompt="Test prompt"
                settings={{
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    batchSize: 1,
                }}
                generationMode="Text to Image"
                executionMode="single-turn"
                onGenerate={() => {}}
                currentLanguage="en"
                stageTopRight={{
                    contextChips: [{ key: 'origin', label: 'Upload', tone: 'source' }],
                    overflowContextChips: [],
                    visibleActions: [
                        { key: 'edit', label: 'Edit', emphasis: 'secondary', onClick: () => {} },
                        {
                            key: 'open-viewer',
                            label: 'Open Viewer',
                            emphasis: 'secondary',
                            onClick: () => {},
                        },
                        {
                            key: 'add-object-reference',
                            label: 'Add to Object Reference',
                            emphasis: 'secondary',
                            onClick: () => {},
                        },
                    ],
                    overflowActions: [
                        {
                            key: 'add-character-reference',
                            label: 'Add to Character Reference',
                            emphasis: 'secondary',
                            onClick: () => {},
                        },
                        { key: 'clear', label: 'Clear', emphasis: 'destructive', onClick: () => {} },
                    ],
                }}
            />,
        );
        const visibleText = getVisibleText(markup);

        expect(markup).toContain('stage-top-right-chip-origin');
        expect(markup).toContain('stage-top-right-action-edit');
        expect(markup).toContain('stage-top-right-action-open-viewer');
        expect(markup).toContain('stage-top-right-action-add-object-reference');
        expect(markup).not.toContain('stage-top-right-action-continue-from-here');
        expect(markup).not.toContain('stage-top-right-overflow-action-branch-from-here');
        expect(markup).not.toContain('data-testid="stage-top-right-action-open"');
        expect(markup).not.toContain('data-testid="stage-top-right-action-rename-branch"');
        expect(markup.indexOf('stage-top-right-action-edit')).toBeLessThan(
            markup.indexOf('stage-top-right-action-open-viewer'),
        );
        expect(markup.indexOf('stage-top-right-action-open-viewer')).toBeLessThan(
            markup.indexOf('stage-top-right-action-add-object-reference'),
        );
        expect(markup).not.toContain('Test prompt');
        expect(visibleText).not.toContain('Test prompt');
    });

    it('uses solid high-contrast stage top-right chip fills so labels stay readable over bright and dark images', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={['https://example.com/result.png']}
                isLoading={false}
                onGenerate={() => {}}
                stageTopRight={{
                    contextChips: [
                        { key: 'stage-source', label: 'Stage source', tone: 'source' },
                        { key: 'origin', label: 'Upload', tone: 'warning' },
                        { key: 'branch', label: 'Main', tone: 'branch' },
                        { key: 'continuation-differs', label: 'Continuation differs', tone: 'divergence' },
                        { key: 'result-status', label: 'Saved', tone: 'success' },
                    ],
                    overflowContextChips: [],
                    visibleActions: [],
                    overflowActions: [],
                }}
            />,
        );

        expect(markup).toContain(
            'border-amber-600 bg-amber-500 text-white shadow-[0_8px_18px_rgba(217,119,6,0.34)] dark:border-amber-500 dark:bg-amber-400 dark:text-slate-950',
        );
        expect(markup).toContain(
            'border-slate-800 bg-slate-700 text-white shadow-[0_8px_18px_rgba(15,23,42,0.32)] dark:border-slate-500 dark:bg-slate-200 dark:text-slate-950',
        );
        expect(markup).toContain(
            'border-emerald-700 bg-emerald-600 text-white shadow-[0_8px_18px_rgba(5,150,105,0.32)] dark:border-emerald-500 dark:bg-emerald-400 dark:text-slate-950',
        );
        expect(markup).not.toContain('bg-amber-100');
        expect(markup).not.toContain('bg-emerald-100');
        expect(markup).not.toContain('bg-slate-100');
    });

    it('uses neutral gray second-row styling and white labels in dark theme', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={['https://example.com/result.png']}
                isLoading={false}
                onGenerate={() => {}}
                currentLanguage="en"
                stageTopRight={{
                    contextChips: [{ key: 'stage-source', label: 'Stage source', tone: 'source' }],
                    visibleActions: [
                        {
                            key: 'continue-from-here',
                            label: 'Continue From Here',
                            emphasis: 'primary',
                            onClick: () => {},
                        },
                        { key: 'edit', label: 'Edit', emphasis: 'secondary', onClick: () => {} },
                        { key: 'generating', label: 'Generating…', emphasis: 'passive' },
                    ],
                    overflowContextChips: [{ key: 'result-status', label: 'Grounded result', tone: 'warning' }],
                    overflowActions: [
                        { key: 'open-viewer', label: 'Open Viewer', emphasis: 'secondary', onClick: () => {} },
                        { key: 'clear', label: 'Clear', emphasis: 'destructive', onClick: () => {} },
                    ],
                }}
            />,
        );

        expect(markup).toContain(
            'border-amber-500 bg-amber-300 text-slate-950 hover:border-amber-600 hover:bg-amber-400 dark:border-amber-600 dark:bg-amber-500 dark:text-white dark:hover:border-amber-500 dark:hover:bg-amber-400',
        );
        expect(markup).toContain(
            'border-gray-300 bg-gray-200 text-gray-800 hover:border-gray-400 hover:bg-gray-300 dark:border-gray-500 dark:bg-gray-600 dark:text-white dark:hover:border-gray-400 dark:hover:bg-gray-500',
        );
        expect(markup).toContain(
            'cursor-default border-gray-300 bg-gray-200 text-gray-700 dark:border-gray-500 dark:bg-gray-600 dark:text-white',
        );
        expect(markup).toContain(
            'border-amber-500 bg-amber-300 text-slate-950 shadow-[0_5px_12px_rgba(217,119,6,0.18)] dark:border-amber-500 dark:bg-amber-300 dark:text-slate-950',
        );
        expect(markup).toContain('data-testid="stage-top-right-overflow-trigger"');
        expect(markup).toContain(
            'border-gray-300 bg-gray-200 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-400 hover:bg-gray-300 dark:border-gray-500 dark:bg-gray-600 dark:text-white dark:hover:border-gray-400 dark:hover:bg-gray-500',
        );
        expect(markup).toContain(
            'absolute right-0 top-full mt-2 grid min-w-[220px] gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-950',
        );
        expect(markup).toContain('text-rose-700 hover:bg-rose-50 dark:text-rose-700 dark:hover:bg-rose-50');
        expect(markup).not.toContain('bg-amber-500/78');
        expect(markup).not.toContain('bg-slate-300 text-slate-900');
        expect(markup).not.toContain('dark:text-rose-200 dark:hover:bg-rose-950/30');
        expect(markup).not.toContain('dark:text-white/90');
    });

    it('renders active generation with preserved stage context and a passive stage status only', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={['https://example.com/result.png']}
                isLoading={false}
                prompt="Test prompt"
                settings={{
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    batchSize: 1,
                }}
                generationMode="Text to Image"
                executionMode="single-turn"
                onGenerate={() => {}}
                stageTopRight={{
                    contextChips: [
                        { key: 'stage-source', label: 'Stage source', tone: 'source' },
                        { key: 'branch', label: 'Main', tone: 'branch' },
                    ],
                    overflowContextChips: [],
                    visibleActions: [{ key: 'generating', label: 'Generating…', emphasis: 'passive' }],
                    overflowActions: [],
                }}
            />,
        );

        expect(markup).toContain('stage-top-right-context-row');
        expect(markup).toContain('stage-top-right-chip-stage-source');
        expect(markup).toContain('stage-top-right-chip-branch');
        expect(markup).toContain('stage-top-right-action-generating');
        expect(markup).not.toContain('stage-top-right-overflow');
        expect(markup).not.toContain('Test prompt');
    });

    it('renders compact stage overflow with overflowed result status and open viewer action', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={['https://example.com/result.png']}
                isLoading={false}
                prompt="Test prompt"
                settings={{
                    aspectRatio: '1:1',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    batchSize: 1,
                }}
                generationMode="Text to Image"
                executionMode="single-turn"
                onGenerate={() => {}}
                stageTopRight={{
                    contextChips: [
                        { key: 'stage-source', label: 'Stage source', tone: 'source' },
                        { key: 'branch', label: 'Main', tone: 'branch' },
                        { key: 'continuation-differs', label: 'Continuation differs', tone: 'divergence' },
                    ],
                    overflowContextChips: [{ key: 'result-status', label: 'Grounded result', tone: 'warning' }],
                    visibleActions: [
                        {
                            key: 'continue-from-here',
                            label: 'Continue From Here',
                            emphasis: 'primary',
                            onClick: () => {},
                        },
                        { key: 'edit', label: 'Edit', emphasis: 'secondary', onClick: () => {} },
                    ],
                    overflowActions: [
                        {
                            key: 'open-viewer',
                            label: 'Open Viewer',
                            emphasis: 'secondary',
                            onClick: () => {},
                        },
                        {
                            key: 'add-object-reference',
                            label: 'Add to Object Reference',
                            emphasis: 'secondary',
                            onClick: () => {},
                        },
                    ],
                }}
            />,
        );

        expect(markup).toContain('stage-top-right-chip-stage-source');
        expect(markup).toContain('stage-top-right-chip-branch');
        expect(markup).toContain('stage-top-right-chip-continuation-differs');
        expect(markup).not.toContain('data-testid="stage-top-right-chip-result-status"');
        expect(markup).toContain('stage-top-right-overflow-chip-result-status');
        expect(markup).toContain('stage-top-right-action-continue-from-here');
        expect(markup).toContain('stage-top-right-action-edit');
        expect(markup).not.toContain('data-testid="stage-top-right-action-open-viewer"');
        expect(markup).toContain('stage-top-right-overflow-action-open-viewer');
        expect(markup).toContain('stage-top-right-overflow-action-add-object-reference');
    });

    it('locks the selected-image stage into a square frame', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={['https://example.com/result.png']}
                isLoading={false}
                prompt="Square stage"
                settings={{
                    aspectRatio: '3:4',
                    size: '1K',
                    style: 'None',
                    model: 'gemini-3.1-flash-image-preview',
                    batchSize: 1,
                }}
                generationMode="Text to Image"
                executionMode="single-turn"
                onGenerate={() => {}}
            />,
        );

        const stageFrameTag = markup.match(/<div[^>]*data-testid="generated-image-stage-frame"[^>]*>/)?.[0];

        expect(stageFrameTag).toBeDefined();
        expect(stageFrameTag).toContain('aspect-square');
    });

    it('renders the failed selected-history state without crashing when clear is available', () => {
        const markup = renderToStaticMarkup(
            <GeneratedImage
                imageUrls={[]}
                isLoading={false}
                error="Synthetic generation failure"
                onGenerate={() => {}}
                onClear={() => {}}
                currentLanguage="en"
            />,
        );

        expect(markup).toContain('Synthetic generation failure');
        expect(markup).toContain('Clear');
    });
});
