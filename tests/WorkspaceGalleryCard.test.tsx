import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceGalleryCard from '../components/WorkspaceGalleryCard';

const getVisibleText = (markup: string) =>
    markup
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

describe('WorkspaceGalleryCard', () => {
    it('renders the embedded gallery history surface instead of a launcher button', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceGalleryCard
                currentLanguage="en"
                history={[
                    {
                        id: 'turn-a',
                        url: 'https://example.com/a.png',
                        prompt: 'Prompt A should stay hidden.',
                        status: 'success',
                    } as any,
                    {
                        id: 'turn-b',
                        url: 'https://example.com/b.png',
                        prompt: 'Prompt B should stay hidden.',
                        status: 'success',
                    } as any,
                    {
                        id: 'turn-c',
                        url: 'https://example.com/c.png',
                        prompt: 'Prompt C should stay hidden.',
                        status: 'success',
                    } as any,
                ]}
                onSelect={vi.fn()}
                onRenameBranch={vi.fn()}
                getContinueActionLabel={() => 'Continue from turn'}
                branchNameOverrides={{}}
                selectedHistoryId={null}
                currentSourceHistoryId="turn-b"
                onClear={vi.fn()}
            />,
        );
        const visibleText = getVisibleText(markup);

        expect(markup).toContain('workspace-gallery-card');
        expect(markup).toContain('history-card-turn-a');
        expect(markup).toContain('history-current-source-turn-b');
        expect(markup).not.toContain('history-current-source-turn-a');
        expect(markup).toContain('Gallery');
        expect(visibleText).not.toContain('Prompt A should stay hidden.');
        expect(visibleText).not.toContain('Prompt B should stay hidden.');
        expect(visibleText).not.toContain('Prompt C should stay hidden.');
        expect(markup).not.toContain('history-open-turn-a');
        expect(markup).not.toContain('history-rename-turn-a');
        expect(markup).not.toContain('workspace-gallery-open');
        expect(markup).not.toContain('workspace-gallery-empty');
    });

    it('renders the empty gallery state without preview thumbnails', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceGalleryCard
                currentLanguage="en"
                history={[]}
                onSelect={vi.fn()}
                onRenameBranch={vi.fn()}
                getContinueActionLabel={() => 'Continue from turn'}
                branchNameOverrides={{}}
                selectedHistoryId={null}
                onClear={vi.fn()}
            />,
        );

        expect(markup).toContain('workspace-gallery-empty');
        expect(markup).toContain('Generate or load an image to populate the gallery.');
        expect(markup).not.toContain('history-card-');
    });
});
