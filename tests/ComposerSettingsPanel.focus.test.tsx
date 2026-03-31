/** @vitest-environment jsdom */

import React, { act, createRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ComposerSettingsPanel from '../components/ComposerSettingsPanel';
import { MODEL_CAPABILITIES } from '../constants';

const baseProps = {
    prompt: 'Test prompt',
    placeholder: 'Type here',
    enterToSubmit: false,
    isGenerating: false,
    isEnhancingPrompt: false,
    currentLanguage: 'en' as const,
    imageStyleLabel: 'None',
    modelLabel: 'Gemini 3.1 Flash',
    aspectRatio: '1:1' as const,
    imageSize: '2K' as const,
    batchSize: 3,
    hasSizePicker: true,
    totalReferenceCount: 2,
    objectCount: 1,
    characterCount: 1,
    maxObjects: 4,
    maxCharacters: 2,
    outputFormat: 'images-only' as const,
    structuredOutputMode: 'off' as const,
    thinkingLevel: 'high' as const,
    includeThoughts: true,
    groundingMode: 'off' as const,
    imageModel: 'gemini-3.1-flash-image-preview' as const,
    currentStageAsset: null,
    capability: MODEL_CAPABILITIES['gemini-3.1-flash-image-preview'],
    availableGroundingModes: ['off', 'google-search', 'image-search', 'google-search-plus-image-search'] as const,
    temperature: 1,
    isAdvancedSettingsOpen: true,
    generateLabel: 'Generate',
    queuedJobs: [],
    queueBatchModeSummary: 'Queued batch runs as a separate official job workflow.',
    queueBatchConversationNotice: 'Official chat continuation stays out of queued batch mode.',
    getImportedQueuedResultCount: () => 0,
    getImportedQueuedHistoryItems: () => [],
    activeImportedQueuedHistoryId: null,
    onPromptChange: vi.fn(),
    onToggleEnterToSubmit: vi.fn(),
    onGenerate: vi.fn(),
    onQueueBatchJob: vi.fn(),
    onCancelGeneration: vi.fn(),
    onStartNewConversation: vi.fn(),
    onFollowUpGenerate: vi.fn(),
    onOpenEditor: vi.fn(),
    onSurpriseMe: vi.fn(),
    onSmartRewrite: vi.fn(),
    onOpenGallery: vi.fn(),
    onOpenPromptHistory: vi.fn(),
    onOpenTemplates: vi.fn(),
    onOpenStyles: vi.fn(),
    onOpenModelPicker: vi.fn(),
    onOpenRatioPicker: vi.fn(),
    onOpenSizePicker: vi.fn(),
    onOpenBatchPicker: vi.fn(),
    onOpenReferences: vi.fn(),
    onToggleAdvancedSettings: vi.fn(),
    onOutputFormatChange: vi.fn(),
    onStructuredOutputModeChange: vi.fn(),
    onTemperatureChange: vi.fn(),
    onThinkingLevelChange: vi.fn(),
    onGroundingModeChange: vi.fn(),
    onImportAllQueuedJobs: vi.fn(),
    onPollAllQueuedJobs: vi.fn(),
    onPollQueuedJob: vi.fn(),
    onCancelQueuedJob: vi.fn(),
    onImportQueuedJob: vi.fn(),
    onOpenImportedQueuedJob: vi.fn(),
    onOpenLatestImportedQueuedJob: vi.fn(),
    onOpenImportedQueuedHistoryItem: vi.fn(),
    onRemoveQueuedJob: vi.fn(),
    getStageOriginLabel: () => 'Generated',
    getLineageActionLabel: () => 'Root',
};

describe('ComposerSettingsPanel prompt focus wiring', () => {
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

    it('forwards the prompt textarea ref to the main composer field', () => {
        const promptTextareaRef = createRef<HTMLTextAreaElement>();

        act(() => {
            root.render(<ComposerSettingsPanel {...baseProps} promptTextareaRef={promptTextareaRef} />);
        });

        expect(promptTextareaRef.current).toBeInstanceOf(HTMLTextAreaElement);
        expect(promptTextareaRef.current?.value).toBe('Test prompt');
    });

    it('routes settings and reference strip actions through the composer-owned openers', () => {
        const onOpenModelPicker = vi.fn();
        const onOpenRatioPicker = vi.fn();
        const onOpenSizePicker = vi.fn();
        const onOpenBatchPicker = vi.fn();
        const onOpenReferences = vi.fn();

        act(() => {
            root.render(
                <ComposerSettingsPanel
                    {...baseProps}
                    onOpenModelPicker={onOpenModelPicker}
                    onOpenRatioPicker={onOpenRatioPicker}
                    onOpenSizePicker={onOpenSizePicker}
                    onOpenBatchPicker={onOpenBatchPicker}
                    onOpenReferences={onOpenReferences}
                />,
            );
        });

        const modelButton = container.querySelector('[data-testid="composer-settings-model"]') as HTMLButtonElement;
        const ratioButton = container.querySelector('[data-testid="composer-settings-ratio"]') as HTMLButtonElement;
        const sizeButton = container.querySelector('[data-testid="composer-settings-size"]') as HTMLButtonElement;
        const qtyButton = container.querySelector('[data-testid="composer-settings-qty"]') as HTMLButtonElement;
        const referenceButton = container.querySelector(
            '[data-testid="composer-reference-context-button"]',
        ) as HTMLButtonElement;

        act(() => {
            modelButton.click();
            ratioButton.click();
            sizeButton.click();
            qtyButton.click();
            referenceButton.click();
        });

        expect(onOpenModelPicker).toHaveBeenCalledTimes(1);
        expect(onOpenRatioPicker).toHaveBeenCalledTimes(1);
        expect(onOpenSizePicker).toHaveBeenCalledTimes(1);
        expect(onOpenBatchPicker).toHaveBeenCalledTimes(1);
        expect(onOpenReferences).toHaveBeenCalledTimes(1);
    });
});
