import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceRestoreNotice from '../components/WorkspaceRestoreNotice';
import { translations } from '../utils/translations';

describe('WorkspaceRestoreNotice', () => {
    it('renders a viewport-safe scrollable modal shell', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceRestoreNotice
                currentLanguage="en"
                onLanguageChange={vi.fn()}
                historyCount={1}
                stagedAssetCount={1}
                viewerImageCount={1}
                activeBranchLabel="Main"
                onOpenLatestTurn={vi.fn()}
                onContinueRestoredChain={vi.fn()}
                onBranchFromRestore={vi.fn()}
                onUseSettingsClearChain={vi.fn()}
                onDismiss={vi.fn()}
            />,
        );

        expect(markup).toContain('max-h-[calc(100vh-2rem)]');
        expect(markup).toContain('overflow-y-auto');
        expect(markup).toContain('Choose next step');
        expect(markup).toContain('Choose whether to reopen the recovered chain, continue from the latest turn');
        expect(markup).toContain('workspace-restore-actions-hint');
        expect(markup).toContain('language-selector-toggle');
        expect(markup).toContain('Keep settings, clear restored chain');
        expect(markup).not.toContain('Recovery actions');
    });

    it('localizes the actions heading', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceRestoreNotice
                currentLanguage="zh_TW"
                onLanguageChange={vi.fn()}
                historyCount={1}
                stagedAssetCount={1}
                viewerImageCount={1}
                activeBranchLabel="主線"
                onOpenLatestTurn={vi.fn()}
                onContinueRestoredChain={vi.fn()}
                onBranchFromRestore={vi.fn()}
                onUseSettingsClearChain={vi.fn()}
                onDismiss={vi.fn()}
            />,
        );

        expect(markup).toContain('選擇下一步');
        expect(markup).toContain('你可以重新打開還原的鏈');
        expect(markup).not.toContain('Choose next step');
    });

    it('uses a localized continue fallback label when no lineage label is provided', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceRestoreNotice
                currentLanguage="zh_TW"
                onLanguageChange={vi.fn()}
                historyCount={1}
                stagedAssetCount={1}
                viewerImageCount={1}
                onContinueRestoredChain={vi.fn()}
                onUseSettingsClearChain={vi.fn()}
                onDismiss={vi.fn()}
            />,
        );

        expect(markup).toContain('延續還原回合');
        expect(markup).not.toContain('Continue restored turn');
        expect(markup).toContain('workspace-restore-continue');
    });

    it('uses a dark restore backdrop instead of the light overlay shell in dark mode', () => {
        const markup = renderToStaticMarkup(
            <WorkspaceRestoreNotice
                currentLanguage="en"
                onLanguageChange={vi.fn()}
                historyCount={1}
                stagedAssetCount={1}
                viewerImageCount={1}
                onUseSettingsClearChain={vi.fn()}
                onDismiss={vi.fn()}
            />,
        );

        expect(markup).toContain(
            'dark:bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.1),_transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.86),rgba(2,6,23,0.92))]',
        );
    });

    it('defines restore notice labels for every supported language', () => {
        for (const language of Object.keys(translations)) {
            const dictionary = translations[language as keyof typeof translations];
            expect(dictionary.workspaceRestoreTitle).toBeTruthy();
            expect(dictionary.workspaceRestoreActiveBranch).toContain('{0}');
            expect(dictionary.workspaceRestoreDismiss).toBeTruthy();
        }
    });
});
