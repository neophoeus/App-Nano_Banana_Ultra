/** @vitest-environment jsdom */

import React, { act, createRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './setupTranslations';
import { MODEL_CAPABILITIES } from '../constants';
import { useComposerSettingsPanelProps } from '../hooks/useComposerSettingsPanelProps';
import { StageAsset, TurnLineageAction } from '../types';
import { getTranslation, Language } from '../utils/translations';

type HarnessProps = {
    currentLanguage: Language;
    stickySendIntent: 'independent' | 'memory';
    getStageOriginLabel: (origin?: StageAsset['origin']) => string;
    getLineageActionLabel: (action?: TurnLineageAction) => string;
};

const promptTextareaRef = createRef<HTMLTextAreaElement>();

function HookHarness({ currentLanguage, stickySendIntent, getStageOriginLabel, getLineageActionLabel }: HarnessProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const props = useComposerSettingsPanelProps({
        prompt: 'Test prompt',
        placeholder: 'Type here',
        enterToSubmit: false,
        isGenerating: false,
        isEnhancingPrompt: false,
        currentLanguage,
        imageStyleLabel: 'None',
        outputFormat: 'images-only',
        thinkingLevel: 'high',
        includeThoughts: true,
        groundingMode: 'off',
        stickySendIntent,
        imageModel: 'gemini-3.1-flash-image-preview',
        aspectRatio: '1:1',
        imageSize: '2K',
        batchSize: 3,
        currentStageAsset: {
            id: 'stage-source',
            url: 'https://example.com/stage.png',
            role: 'stage-source',
            origin: 'history',
            createdAt: 1710200000000,
            lineageAction: 'reopen',
        },
        capability: MODEL_CAPABILITIES['gemini-3.1-flash-image-preview'],
        availableGroundingModes: ['off', 'google-search', 'image-search', 'google-search-plus-image-search'],
        temperature: 1,
        isAdvancedSettingsOpen: false,
        generateLabel: 'Generate',
        hasSizePicker: true,
        totalReferenceCount: 0,
        objectCount: 0,
        characterCount: 0,
        maxObjects: 10,
        maxCharacters: 4,
        queuedJobs: [],
        isQueueBatchDisabled: true,
        queueBatchDisabledReason: 'Queued edits are disabled.',
        queueBatchModeSummary: 'Queue summary',
        queueBatchConversationNotice: null,
        getImportedQueuedResultCount: () => 0,
        getImportedQueuedHistoryItems: () => [],
        activeImportedQueuedHistoryId: null,
        promptTextareaRef,
        setPrompt: vi.fn(),
        setStickySendIntent: vi.fn() as any,
        toggleEnterToSubmit: vi.fn(),
        handleGenerate: vi.fn(),
        handleQueueBatchJob: vi.fn(),
        handleOpenQueuedBatchJobs: vi.fn(),
        handleCancelGeneration: vi.fn(),
        handleStartNewConversation: vi.fn(),
        handleFollowUpGenerate: vi.fn(),
        handleSurpriseMe: vi.fn(),
        handleSmartRewrite: vi.fn(),
        openSettings: vi.fn(),
        openAdvancedSettings: vi.fn(),
        setActivePickerSheet: vi.fn() as any,
        setIsAdvancedSettingsOpen: vi.fn() as any,
        setOutputFormat: vi.fn(),
        setTemperature: vi.fn(),
        setThinkingLevel: vi.fn(),
        setGroundingMode: vi.fn(),
        getGroundingFlagsFromMode: () => ({ googleSearch: false, imageSearch: false }),
        showNotification: vi.fn(),
        t,
        handleImportAllQueuedJobs: vi.fn(),
        handlePollAllQueuedJobs: vi.fn(),
        handlePollQueuedJob: vi.fn(),
        handleCancelQueuedJob: vi.fn(),
        handleImportQueuedJob: vi.fn(),
        handleOpenImportedQueuedJob: vi.fn(),
        handleOpenLatestImportedQueuedJob: vi.fn(),
        handleOpenImportedQueuedHistoryItem: vi.fn(),
        handleRemoveQueuedJob: vi.fn(),
        getStageOriginLabel,
        getLineageActionLabel,
    });

    return (
        <>
            <div data-testid="follow-up-source-line">{`${t('composerFollowUpSource')}: ${props.getStageOriginLabel('history')} · ${props.getLineageActionLabel('reopen')}`}</div>
            <div data-testid="send-intent-state">{props.stickySendIntent}</div>
        </>
    );
}

describe('useComposerSettingsPanelProps', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('updates follow-up source labels in the same render when the UI language changes', () => {
        act(() => {
            root.render(
                <HookHarness
                    currentLanguage="en"
                    stickySendIntent="independent"
                    getStageOriginLabel={() => 'History'}
                    getLineageActionLabel={() => 'Reopen'}
                />,
            );
        });

        expect(container.textContent).toContain('Continue with image: History · Reopen');

        act(() => {
            root.render(
                <HookHarness
                    currentLanguage="ja"
                    stickySendIntent="independent"
                    getStageOriginLabel={() => '履歴'}
                    getLineageActionLabel={() => '再表示'}
                />,
            );
        });

        expect(container.textContent).toContain('フォローアップ元: 履歴 · 再表示');
        expect(container.textContent).not.toContain('Follow-up source: 履歴 · 再表示');
    });

    it('updates the exposed sticky send intent in the same render when the value changes', () => {
        act(() => {
            root.render(
                <HookHarness
                    currentLanguage="en"
                    stickySendIntent="independent"
                    getStageOriginLabel={() => 'History'}
                    getLineageActionLabel={() => 'Reopen'}
                />,
            );
        });

        expect(container.querySelector('[data-testid="send-intent-state"]')?.textContent).toBe('independent');

        act(() => {
            root.render(
                <HookHarness
                    currentLanguage="en"
                    stickySendIntent="memory"
                    getStageOriginLabel={() => 'History'}
                    getLineageActionLabel={() => 'Reopen'}
                />,
            );
        });

        expect(container.querySelector('[data-testid="send-intent-state"]')?.textContent).toBe('memory');
    });
});
