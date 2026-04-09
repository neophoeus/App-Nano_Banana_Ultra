/** @vitest-environment jsdom */

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceUnifiedHistoryPanel from '../components/WorkspaceUnifiedHistoryPanel';
import { GeneratedImage } from '../types';

const buildTurn = (overrides: Partial<GeneratedImage> = {}): GeneratedImage => ({
    id: 'turn-1',
    url: 'https://example.com/image.png',
    prompt: 'Prompt',
    aspectRatio: '1:1',
    size: '1K',
    style: 'None',
    model: 'gemini-3.1-flash-image-preview',
    createdAt: 1,
    status: 'success',
    ...overrides,
});

const getVisibleText = (element: HTMLElement) => (element.textContent || '').replace(/\s+/g, ' ').trim();

describe('WorkspaceUnifiedHistoryPanel', () => {
    let container: HTMLDivElement;
    let root: Root;
    let desktopMediaMatch = true;
    let originalMatchMedia: Window['matchMedia'] | undefined;

    const installMatchMedia = () => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: desktopMediaMatch && query === '(min-width: 1280px)',
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    };

    const buildHistory = (count: number, startAt = 1) =>
        Array.from({ length: count }, (_, index) => {
            const turnNumber = startAt + index;
            return buildTurn({
                id: `turn-${String(turnNumber).padStart(2, '0')}`,
                url: `https://example.com/${turnNumber}.png`,
                prompt: `Prompt ${turnNumber}`,
                createdAt: turnNumber,
            });
        });

    const renderPanel = (overrides: Partial<React.ComponentProps<typeof WorkspaceUnifiedHistoryPanel>> = {}) => {
        const onClearWorkspace = overrides.onClearWorkspace || vi.fn();

        flushSync(() => {
            root.render(
                <WorkspaceUnifiedHistoryPanel
                    currentLanguage="en"
                    history={[
                        buildTurn({
                            id: 'turn-a',
                            url: 'https://example.com/a.png',
                            prompt: 'Prompt A should stay hidden.',
                        }),
                        buildTurn({
                            id: 'turn-b',
                            url: 'https://example.com/b.png',
                            prompt: 'Prompt B should stay hidden.',
                            createdAt: 2,
                        }),
                    ]}
                    selectedItemDock={<div>Selected item dock</div>}
                    selectedHistoryId="turn-a"
                    currentStageSourceHistoryId="turn-a"
                    activeBranchSummary={
                        {
                            branchOriginId: 'turn-a',
                            branchLabel: 'Main',
                            autoBranchLabel: 'Main',
                            rootId: 'turn-a',
                            turnCount: 2,
                            createdAt: 1,
                            updatedAt: 2,
                            originTurn: buildTurn({ id: 'turn-a' }),
                            latestTurn: buildTurn({ id: 'turn-b', createdAt: 2 }),
                            turns: [buildTurn({ id: 'turn-a' }), buildTurn({ id: 'turn-b', createdAt: 2 })],
                        } as any
                    }
                    branchSummariesCount={1}
                    onSelect={vi.fn()}
                    isPromotedContinuationSource={(item) => item.id === 'turn-b'}
                    getBranchAccentClassName={() => 'border-gray-200 text-gray-700'}
                    onClearWorkspace={onClearWorkspace}
                    {...overrides}
                />,
            );
        });

        return { onClearWorkspace };
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        originalMatchMedia = window.matchMedia;
        desktopMediaMatch = true;
        installMatchMedia();
    });

    afterEach(() => {
        root.unmount();
        container.remove();
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: originalMatchMedia,
        });
    });

    it('renders the selected-item dock above a continuous history grid and keeps prompt text out of the history surface', () => {
        renderPanel();

        const markup = container.innerHTML;
        const visibleText = getVisibleText(container);

        expect(markup).toContain('workspace-unified-history-panel');
        expect(markup).toContain('workspace-unified-history-selected-item');
        expect(markup).toContain('workspace-unified-history-clear');
        expect(markup).toContain('workspace-unified-history-utility-actions');
        expect(markup).toContain('rounded-[24px] border p-3');
        expect(markup).toContain('history-card-turn-a');
        expect(markup).toContain('history-card-turn-b');
        expect(markup).toContain('history-stage-source-turn-a');
        expect(markup).toContain('history-continuation-source-turn-b');
        expect(visibleText).toContain('History');
        expect(visibleText).toContain('Main');
        expect(markup.indexOf('Selected item dock')).toBeLessThan(markup.indexOf('history-card-turn-a'));
        expect(visibleText).not.toContain('Prompt A should stay hidden.');
        expect(visibleText).not.toContain('Prompt B should stay hidden.');
        expect(markup).toContain('grid-cols-4');
        expect(markup).toContain('xl:grid-cols-[repeat(6,minmax(128px,128px))]');
        expect(markup).toContain('xl:justify-center');
        expect(markup).toContain('xl:gap-1.5');
        expect(markup).toContain('xl:h-[128px] xl:w-[128px] xl:shrink-0');
        expect(markup).not.toContain('workspace-unified-history-footer');
    });

    it('renders versions and workspace snapshot utility actions when callbacks are supplied', () => {
        const onOpenVersionsDetails = vi.fn();
        const onImportWorkspace = vi.fn();
        const onExportWorkspace = vi.fn();

        renderPanel({
            onOpenVersionsDetails,
            onImportWorkspace,
            onExportWorkspace,
        });

        const versionsButton = container.querySelector('[data-testid="history-versions-open-details"]');
        const importButton = container.querySelector('[data-testid="history-import-workspace"]');
        const exportButton = container.querySelector('[data-testid="history-export-workspace"]');
        const clearButton = container.querySelector('[data-testid="workspace-unified-history-clear"]');
        const utilityActions = container.querySelector('[data-testid="workspace-unified-history-utility-actions"]');

        expect(versionsButton).not.toBeNull();
        expect(importButton).not.toBeNull();
        expect(exportButton).not.toBeNull();
        expect(clearButton).not.toBeNull();
        expect(utilityActions).not.toBeNull();
        expect(utilityActions?.contains(versionsButton as Node)).toBe(true);
        expect(utilityActions?.contains(importButton as Node)).toBe(true);
        expect(utilityActions?.contains(exportButton as Node)).toBe(true);
        expect(utilityActions?.contains(clearButton as Node)).toBe(true);
        expect(container.querySelector('[data-testid="workspace-unified-history-footer"]')).toBeNull();

        flushSync(() => {
            (versionsButton as HTMLButtonElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
            (importButton as HTMLButtonElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
            (exportButton as HTMLButtonElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(onOpenVersionsDetails).toHaveBeenCalledTimes(1);
        expect(onImportWorkspace).toHaveBeenCalledTimes(1);
        expect(onExportWorkspace).toHaveBeenCalledTimes(1);
    });

    it('uses four-slot mobile pagination when the desktop layout is unavailable', () => {
        desktopMediaMatch = false;
        installMatchMedia();

        renderPanel({
            history: [
                buildTurn({ id: 'turn-a', url: 'https://example.com/a.png' }),
                buildTurn({ id: 'turn-b', url: 'https://example.com/b.png', createdAt: 2 }),
                buildTurn({ id: 'turn-c', url: 'https://example.com/c.png', createdAt: 3 }),
                buildTurn({ id: 'turn-d', url: 'https://example.com/d.png', createdAt: 4 }),
                buildTurn({ id: 'turn-e', url: 'https://example.com/e.png', createdAt: 5 }),
            ],
            branchSummariesCount: 2,
        });

        const leftPager = container.querySelector('[data-testid="workspace-unified-history-pager-left"]');
        const rightPager = container.querySelector('[data-testid="workspace-unified-history-pager-right"]');
        const firstPageButton = container.querySelector(
            '[data-testid="workspace-unified-history-page-first"]',
        ) as HTMLButtonElement | null;
        const currentPageLabel = container.querySelector(
            '[data-testid="workspace-unified-history-page-label"]',
        ) as HTMLSpanElement | null;
        const totalPageLabel = container.querySelector(
            '[data-testid="workspace-unified-history-page-total"]',
        ) as HTMLSpanElement | null;

        expect(leftPager).not.toBeNull();
        expect(rightPager).not.toBeNull();
        expect(currentPageLabel?.textContent).toBe('1');
        expect(totalPageLabel?.textContent).toBe('2');
        expect(container.innerHTML).toContain('history-card-turn-a');
        expect(container.innerHTML).toContain('history-card-turn-d');
        expect(container.innerHTML).not.toContain('history-card-turn-e');

        const nextButton = container.querySelector(
            '[data-testid="workspace-unified-history-page-next"]',
        ) as HTMLButtonElement;
        flushSync(() => {
            nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(currentPageLabel?.textContent).toBe('2');
        expect(totalPageLabel?.textContent).toBe('2');
        expect(container.innerHTML).toContain('history-card-turn-e');
        expect(container.innerHTML).not.toContain('history-card-turn-a');
    });

    it('uses desktop page size 6 and exposes first or last pager controls', () => {
        renderPanel({
            history: buildHistory(21),
            branchSummariesCount: 3,
        });

        const leftPager = container.querySelector('[data-testid="workspace-unified-history-pager-left"]');
        const rightPager = container.querySelector('[data-testid="workspace-unified-history-pager-right"]');
        const firstPageButton = container.querySelector(
            '[data-testid="workspace-unified-history-page-first"]',
        ) as HTMLButtonElement | null;
        const currentPageLabel = container.querySelector(
            '[data-testid="workspace-unified-history-page-label"]',
        ) as HTMLSpanElement | null;
        const totalPageLabel = container.querySelector(
            '[data-testid="workspace-unified-history-page-total"]',
        ) as HTMLSpanElement | null;

        expect(leftPager).not.toBeNull();
        expect(rightPager).not.toBeNull();
        expect(firstPageButton).not.toBeNull();
        expect(Array.from(rightPager?.children || []).map((element) => element.getAttribute('data-testid'))).toEqual([
            'workspace-unified-history-page-last',
            'workspace-unified-history-page-next',
            'workspace-unified-history-page-total',
        ]);
        expect(currentPageLabel?.textContent).toBe('1');
        expect(totalPageLabel?.textContent).toBe('4');
        expect(firstPageButton?.className).toContain('rounded-[16px]');
        expect(firstPageButton?.className).toContain('h-9');
        expect(currentPageLabel?.className).toContain('rounded-full');
        expect(currentPageLabel?.className).toContain('bg-amber-50/90');
        expect(totalPageLabel?.className).toContain('rounded-full');
        expect(totalPageLabel?.className).toContain('bg-white/88');
        expect(container.innerHTML).toContain('history-card-turn-01');
        expect(container.innerHTML).toContain('history-card-turn-06');
        expect(container.innerHTML).not.toContain('history-card-turn-07');

        const lastButton = container.querySelector(
            '[data-testid="workspace-unified-history-page-last"]',
        ) as HTMLButtonElement;
        flushSync(() => {
            lastButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(currentPageLabel?.textContent).toBe('4');
        expect(totalPageLabel?.textContent).toBe('4');
        expect(container.innerHTML).toContain('history-card-turn-21');
        expect(container.innerHTML).not.toContain('history-card-turn-01');

        const firstButton = container.querySelector(
            '[data-testid="workspace-unified-history-page-first"]',
        ) as HTMLButtonElement;
        flushSync(() => {
            firstButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(currentPageLabel?.textContent).toBe('1');
        expect(totalPageLabel?.textContent).toBe('4');
        expect(container.innerHTML).toContain('history-card-turn-01');
        expect(container.innerHTML).not.toContain('history-card-turn-21');
    });

    it('resets back to the first page after a new turn is prepended', async () => {
        const history = buildHistory(11);
        renderPanel({ history, branchSummariesCount: 2 });

        const nextButton = container.querySelector(
            '[data-testid="workspace-unified-history-page-next"]',
        ) as HTMLButtonElement;
        flushSync(() => {
            nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(
            (container.querySelector('[data-testid="workspace-unified-history-page-label"]') as HTMLSpanElement | null)
                ?.textContent,
        ).toBe('2');
        expect(container.innerHTML).toContain('history-card-turn-11');

        renderPanel({
            history: [
                buildTurn({
                    id: 'turn-12',
                    url: 'https://example.com/12.png',
                    prompt: 'Newest prompt should stay hidden.',
                    createdAt: 12,
                }),
                ...history,
            ],
            branchSummariesCount: 2,
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(
            (container.querySelector('[data-testid="workspace-unified-history-page-label"]') as HTMLSpanElement | null)
                ?.textContent,
        ).toBe('1');
        expect(container.innerHTML).toContain('history-card-turn-12');
        expect(container.innerHTML).not.toContain('history-card-turn-11');
    });

    it('shows preview tiles only on the first page and reserves history slots for them', () => {
        renderPanel({
            history: buildHistory(12),
            previewTiles: [
                {
                    id: 'preview-0',
                    slotIndex: 0,
                    status: 'pending',
                },
                {
                    id: 'preview-1',
                    slotIndex: 1,
                    status: 'ready',
                    previewUrl: 'https://example.com/preview-1.png',
                },
                {
                    id: 'preview-2',
                    slotIndex: 2,
                    status: 'ready',
                    previewUrl: 'https://example.com/preview-2.png',
                },
                {
                    id: 'preview-3',
                    slotIndex: 3,
                    status: 'failed',
                    error: 'failed',
                },
            ],
            branchSummariesCount: 2,
        });

        expect(
            (container.querySelector('[data-testid="workspace-unified-history-page-label"]') as HTMLSpanElement | null)
                ?.textContent,
        ).toBe('1');
        expect(
            (container.querySelector('[data-testid="workspace-unified-history-page-total"]') as HTMLSpanElement | null)
                ?.textContent,
        ).toBe('3');
        expect(container.innerHTML).toContain('history-preview-tile-3');
        expect(container.innerHTML).toContain('history-preview-tile-0');
        expect(container.innerHTML).toContain('history-card-turn-01');
        expect(container.innerHTML).toContain('history-card-turn-02');
        expect(container.innerHTML).not.toContain('history-card-turn-03');
        expect(container.innerHTML.indexOf('history-preview-tile-3')).toBeLessThan(
            container.innerHTML.indexOf('history-preview-tile-2'),
        );
        expect(container.innerHTML.indexOf('history-preview-tile-0')).toBeLessThan(
            container.innerHTML.indexOf('history-card-turn-01'),
        );

        const nextButton = container.querySelector(
            '[data-testid="workspace-unified-history-page-next"]',
        ) as HTMLButtonElement;
        flushSync(() => {
            nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(
            (container.querySelector('[data-testid="workspace-unified-history-page-label"]') as HTMLSpanElement | null)
                ?.textContent,
        ).toBe('2');
        expect(
            (container.querySelector('[data-testid="workspace-unified-history-page-total"]') as HTMLSpanElement | null)
                ?.textContent,
        ).toBe('3');
        expect(container.innerHTML).toContain('history-card-turn-03');
        expect(container.innerHTML).toContain('history-card-turn-08');
        expect(container.innerHTML).not.toContain('history-preview-tile-3');
        expect(container.innerHTML).not.toContain('history-card-turn-01');
    });

    it('opens a two-button clear confirmation and only clears after the direct confirm action', () => {
        const { onClearWorkspace } = renderPanel();

        const openButton = container.querySelector(
            '[data-testid="workspace-unified-history-clear"]',
        ) as HTMLButtonElement;
        flushSync(() => {
            openButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(container.querySelector('[data-testid="workspace-unified-history-clear-confirm"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="workspace-unified-history-clear-cancel"]')).not.toBeNull();
        expect(
            container.querySelector('[data-testid="workspace-unified-history-clear-confirm-action"]'),
        ).not.toBeNull();
        expect(onClearWorkspace).not.toHaveBeenCalled();

        const cancelButton = container.querySelector(
            '[data-testid="workspace-unified-history-clear-cancel"]',
        ) as HTMLButtonElement;
        flushSync(() => {
            cancelButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(container.querySelector('[data-testid="workspace-unified-history-clear-confirm"]')).toBeNull();
        expect(onClearWorkspace).not.toHaveBeenCalled();

        flushSync(() => {
            openButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        const confirmButton = container.querySelector(
            '[data-testid="workspace-unified-history-clear-confirm-action"]',
        ) as HTMLButtonElement;
        flushSync(() => {
            confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(onClearWorkspace).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[data-testid="workspace-unified-history-clear-confirm"]')).toBeNull();
    });

    it('renders the empty state when no history turns exist', () => {
        renderPanel({ history: [] });

        expect(container.querySelector('[data-testid="workspace-unified-history-empty"]')).not.toBeNull();
        expect(container.innerHTML).not.toContain('history-card-turn-');
    });
});
