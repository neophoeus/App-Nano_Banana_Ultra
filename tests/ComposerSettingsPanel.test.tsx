import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ComposerAdvancedSettingsDialog from '../components/ComposerAdvancedSettingsDialog';
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
    currentStageAsset: null,
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

describe('ComposerSettingsPanel toolbar layout', () => {
    it('keeps settings ownership above helper tools and the reference strip below them', () => {
        const markup = renderToStaticMarkup(
            <ComposerSettingsPanel
                {...baseProps}
                groundingMode="off"
                imageModel="gemini-3.1-flash-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image-preview']}
            />,
        );

        expect(markup).toContain('composer-settings-row');
        expect(markup).toContain('composer-quick-tools');
        expect(markup).toContain('composer-reference-context-strip');
        expect(markup.indexOf('composer-settings-row')).toBeLessThan(markup.indexOf('composer-quick-tools'));
        expect(markup.indexOf('composer-quick-tools')).toBeLessThan(markup.indexOf('composer-reference-context-strip'));
        expect(markup).toContain('Model');
        expect(markup).toContain('Aspect Ratio');
        expect(markup).toContain('Output Size');
        expect(markup).toContain('Quantity');
        expect(markup).toContain('Reference Tray');
        expect(markup).toContain('Objects 1/4');
        expect(markup).toContain('Characters 1/2');
        expect(markup).toContain('Advanced settings');
        expect(markup).toContain('composer-queue-batch-mode-hint-trigger');
        expect(markup).toContain('composer-queue-batch-mode-hint');
        expect(markup).not.toContain('composer-workspace-tools');
        expect(markup).not.toContain('Export Workspace');
        expect(markup).not.toContain('Import Workspace');
        expect(markup).not.toContain('border-amber-200 bg-amber-50');
    });
});

describe('ComposerAdvancedSettingsDialog grounding warning', () => {
    it('shows the image-search resolution warning for 3.1 Flash image grounding', () => {
        const markup = renderToStaticMarkup(
            <ComposerAdvancedSettingsDialog
                {...baseProps}
                isOpen={true}
                onClose={vi.fn()}
                groundingMode="google-search-plus-image-search"
                imageModel="gemini-3.1-flash-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image-preview']}
            />,
        );

        expect(markup).toContain('image search may fall back to 1K');
        expect(markup).toContain('Runtime guide');
        expect(markup).toContain('Nano Banana 2 + Image Search');
        expect(markup).toContain('composer-advanced-grounding-guide-details');
        expect(markup).toContain('composer-advanced-grounding-guide-summary');
        expect(markup).toContain('composer-advanced-grounding-guide-count');
        expect(markup).toContain('group-open:rotate-180');
        expect(markup).toContain('3 notes');
    });

    it('does not show the warning for 3 Pro Google Search grounding', () => {
        const markup = renderToStaticMarkup(
            <ComposerAdvancedSettingsDialog
                {...baseProps}
                isOpen={true}
                onClose={vi.fn()}
                groundingMode="google-search"
                imageModel="gemini-3-pro-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3-pro-image-preview']}
                availableGroundingModes={['off', 'google-search']}
            />,
        );

        expect(markup).not.toContain('image search may fall back to 1K');
        expect(markup).toContain('Nano Banana Pro + Google Search');
        expect(markup).toContain('composer-advanced-structured-output-guide');
        expect(markup).toContain('Off');
        expect(markup).toContain('Choose Off when you only want the normal response text and image result.');
    });

    it('shows a structured output guide card when the selected model supports structured outputs', () => {
        const markup = renderToStaticMarkup(
            <ComposerAdvancedSettingsDialog
                {...baseProps}
                isOpen={true}
                onClose={vi.fn()}
                groundingMode="google-search"
                imageModel="gemini-3-pro-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3-pro-image-preview']}
                availableGroundingModes={['off', 'google-search']}
                structuredOutputMode="variation-compare"
            />,
        );

        expect(markup).toContain('composer-advanced-structured-output-guide');
        expect(markup).toContain('Variation compare');
        expect(markup).toContain(
            'Use Variation compare when you are choosing between nearby directions and want differences, tradeoffs, and the next test move.',
        );
        expect(markup).toContain('Best for');
        expect(markup).toContain('Choose between nearby options and line up the next test pass.');
        expect(markup).toContain('Avoid when');
        expect(markup).toContain('You are only reviewing one candidate and do not need comparison framing.');
        expect(markup).toContain('Includes');
        expect(markup).toContain('composer-advanced-structured-output-next-prompt-guide');
        expect(markup).toContain('Next prompt');
        expect(markup).toContain(
            'Use the recommended move or a test prompt below to drive the next comparison pass quickly.',
        );
        expect(markup).toContain('Recommended next move');
        expect(markup).toContain('Comparison summary');
        expect(markup).toContain('Tradeoffs');
        expect(markup).toContain('Test prompts');
        expect(markup).toContain('Example shape');
        expect(markup).toContain(
            '&quot;comparisonSummary&quot;: &quot;Option B keeps the silhouette cleaner while Option A feels more aggressive.&quot;',
        );
        expect(markup).toContain(
            '&quot;tradeoffs&quot;: [&quot;A has stronger energy but noisier lighting&quot;,&quot;B is calmer but less immediately bold&quot;]',
        );
        expect(markup).toContain(
            '&quot;testPrompts&quot;: [&quot;keep Option B pose, add A-level contrast&quot;,&quot;retain B framing and sharpen rim light&quot;]',
        );
    });

    it('shows revision-brief guidance when that preset is selected', () => {
        const markup = renderToStaticMarkup(
            <ComposerAdvancedSettingsDialog
                {...baseProps}
                isOpen={true}
                onClose={vi.fn()}
                groundingMode="google-search"
                imageModel="gemini-3-pro-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3-pro-image-preview']}
                availableGroundingModes={['off', 'google-search']}
                structuredOutputMode="revision-brief"
            />,
        );

        expect(markup).toContain('Revision brief');
        expect(markup).toContain(
            'Use Revision brief when the image is promising but still needs a clean edit plan with keep-rules, target changes, and a final revision prompt.',
        );
        expect(markup).toContain('Best for');
        expect(markup).toContain('Turning critique into a concrete edit pass without losing the approved core.');
        expect(markup).toContain('Avoid when');
        expect(markup).toContain('You only need a high-level review and are not ready to specify edit moves.');
        expect(markup).toContain('composer-advanced-structured-output-next-prompt-guide');
        expect(markup).toContain('Next prompt');
        expect(markup).toContain(
            'Use the final revision prompt below as the cleanest starting point for the next edit pass.',
        );
        expect(markup).toContain('Final revision prompt');
        expect(markup).toContain('Revision goal');
        expect(markup).toContain('Edit targets');
        expect(markup).toContain('Risk checks');
        expect(markup).toContain(
            '&quot;revisionGoal&quot;: &quot;Open up the face, simplify the background, and keep the silhouette premium.&quot;',
        );
    });

    it('localizes shell action labels outside English', () => {
        const markup = renderToStaticMarkup(
            <ComposerAdvancedSettingsDialog
                {...baseProps}
                isOpen={true}
                onClose={vi.fn()}
                currentLanguage="ja"
                isGenerating
                groundingMode="google-search"
                imageModel="gemini-3-pro-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3-pro-image-preview']}
                availableGroundingModes={['off', 'google-search']}
            />,
        );

        expect(markup).toContain('詳細操作');
        expect(markup).toContain('機能対応の詳細設定');
        expect(markup).toContain('閉じる');
        expect(markup).not.toContain('>Deep Controls<');
        expect(markup).not.toContain('>Advanced settings<');
        expect(markup).not.toContain('>Close<');
    });
});
