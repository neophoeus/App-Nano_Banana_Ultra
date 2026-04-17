import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import './setupTranslations';
import ComposerAdvancedSettingsDialog from '../components/ComposerAdvancedSettingsDialog';
import ComposerSettingsPanel from '../components/ComposerSettingsPanel';
import { MODEL_CAPABILITIES } from '../constants';
import { getTranslation } from '../utils/translations';

const baseProps = {
    prompt: 'Test prompt',
    placeholder: 'Type here',
    enterToSubmit: false,
    isGenerating: false,
    isEnhancingPrompt: false,
    activePromptTool: null,
    currentLanguage: 'en' as const,
    imageStyleLabel: 'None',
    modelLabel: getTranslation('en', 'modelGemini31Flash'),
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
    thinkingLevel: 'high' as const,
    includeThoughts: true,
    stickySendIntent: 'independent' as const,
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
    onStickySendIntentChange: vi.fn(),
    onToggleEnterToSubmit: vi.fn(),
    onGenerate: vi.fn(),
    onQueueBatchJob: vi.fn(),
    onOpenQueuedBatchJobs: vi.fn(),
    onCancelGeneration: vi.fn(),
    onStartNewConversation: vi.fn(),
    onFollowUpGenerate: vi.fn(),
    onOpenEditor: vi.fn(),
    onImageToPrompt: vi.fn(),
    onSurpriseMe: vi.fn(),
    onSmartRewrite: vi.fn(),
    onOpenPromptHistory: vi.fn(),
    onOpenTemplates: vi.fn(),
    onOpenStyles: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenModelPicker: vi.fn(),
    onOpenRatioPicker: vi.fn(),
    onOpenSizePicker: vi.fn(),
    onOpenBatchPicker: vi.fn(),
    onOpenReferences: vi.fn(),
    onToggleAdvancedSettings: vi.fn(),
    onOutputFormatChange: vi.fn(),
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
    onClearStyle: vi.fn(),
    imageToolsPanel: <div data-testid="embedded-image-tools">Embedded Image Tools</div>,
};

describe('ComposerSettingsPanel toolbar layout', () => {
    it('keeps the top summary row above the embedded image tools and prompt helper rail', () => {
        const markup = renderToStaticMarkup(
            <ComposerSettingsPanel
                {...baseProps}
                groundingMode="off"
                imageModel="gemini-3.1-flash-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image-preview']}
            />,
        );

        expect(markup).toContain('composer-settings-row');
        expect(markup).toContain('composer-settings-panel');
        expect(markup).toContain('composer-image-tools-slot');
        expect(markup).toContain('embedded-image-tools');
        expect(markup).toContain('composer-quick-tools');
        expect(markup).toContain('composer-settings-button');
        expect(markup).toContain('composer-style-strip');
        expect(markup).toContain('composer-style-button');
        expect(markup).toContain('composer-advanced-settings-button');
        expect(markup).toContain('composer-sticky-send-intent');
        expect(markup).toContain('composer-sticky-send-intent-toggle');
        expect(markup).toContain('composer-sticky-send-intent-thumb');
        expect(markup).toContain('composer-sticky-send-intent-info-trigger');
        expect(markup).toContain('composer-sticky-send-intent-independent');
        expect(markup).toContain('composer-sticky-send-intent-memory');
        expect(markup).toContain('composer-enter-behavior-card');
        expect(markup).toContain('composer-enter-behavior-toggle');
        expect(markup).toContain('composer-enter-behavior-thumb');
        expect(markup).toContain('composer-enter-behavior-send-option');
        expect(markup).toContain('composer-enter-behavior-newline-option');
        expect(markup).toContain('data-active-intent="independent"');
        expect(markup).toContain('data-memory-available="false"');
        expect(markup).toContain('aria-pressed="false"');
        expect(markup).toContain('data-active-mode="newline"');
        expect(markup).not.toContain('composer-sticky-send-intent-title');
        expect(markup).not.toContain('Next send');
        expect(markup).toContain('Independent send');
        expect(markup).toContain('Memory send');
        expect(markup).toContain('Press Enter to Send');
        expect(markup).toContain('Press Enter for New Line');
        expect(markup).toContain('border-slate-200/85 bg-slate-100/90');
        expect(markup).toContain('border-slate-200/80 bg-slate-100/85');
        expect(markup).toContain('min-h-[56px]');
        expect(markup).toContain('max-w-[19rem]');
        expect(markup).toContain('md:grid-cols-[minmax(0,1fr)_minmax(0,208px)]');
        expect(markup).not.toContain('composer-sticky-send-intent-info-card');
        expect(markup).not.toContain(
            'Uses the selected image and tools without replaying official conversation memory.',
        );
        expect(markup).toContain('Instruction');
        expect(markup.indexOf('composer-settings-row')).toBeLessThan(markup.indexOf('composer-image-tools-slot'));
        expect(markup.indexOf('composer-image-tools-slot')).toBeLessThan(markup.indexOf('composer-sticky-send-intent'));
        expect(markup.indexOf('composer-sticky-send-intent')).toBeLessThan(markup.indexOf('composer-quick-tools'));
        expect(markup.indexOf('composer-quick-tools')).toBeLessThan(markup.indexOf('composer-enter-behavior-card'));
        expect(markup.indexOf('composer-generate-card')).toBeLessThan(markup.indexOf('composer-enter-behavior-card'));
        expect(markup).toContain('Generation Settings');
        expect(markup).toContain('Style');
        expect(markup).toContain('None');
        expect(markup).toContain(
            `Model: ${getTranslation('en', 'modelGemini31Flash').replace(' (gemini-3.1-flash-image-preview)', '')}`,
        );
        expect(markup).toContain('Aspect Ratio: 1:1');
        expect(markup).toContain('Output Size: 2K');
        expect(markup).toContain(`Quantity: ${getTranslation('en', 'qtyX').replace('{0}', '3')}`);
        expect(markup).toContain('bg-sky-50');
        expect(markup).toContain('bg-emerald-50');
        expect(markup).toContain('bg-amber-50');
        expect(markup).toContain('bg-violet-50');
        expect(markup).toContain('dark:bg-sky-500/18');
        expect(markup).toContain('dark:bg-emerald-500/18');
        expect(markup).toContain('dark:bg-amber-400/18');
        expect(markup).toContain('dark:bg-violet-500/18');
        expect(markup).toContain('composer-quick-tool-image-to-prompt');
        expect(markup).toContain('Image to Prompt');
        expect(markup).toContain('Surprise Me');
        expect(markup).toContain('Auto Rewrite');
        expect(markup).not.toContain('composer-quick-tool-placeholder');
        expect(markup).not.toContain('Templates');
        expect(markup).not.toContain('History');
        expect(markup).toContain('Advanced settings');
        expect(markup).toContain('composer-advanced-settings-disclosure');
        expect(markup).toContain('composer-advanced-settings-disclosure-summary');
        expect(markup).toContain('Output format: Images only');
        expect(markup).toContain('Temperature: 1.0');
        expect(markup).toContain('Thinking level: High');
        expect(markup).not.toContain('Grounding: Off');
        expect(markup).toContain('bg-white/92');
        expect(markup).toContain('border-slate-200/85');
        expect(markup).toContain('dark:bg-amber-400/95');
        expect(markup).toContain('dark:border-amber-200/30');
        expect(markup).toContain('dark:text-amber-50');
        expect(markup).toContain('tracking-normal');
        expect(markup).toContain('grid-cols-3');
        expect(markup).toContain('nbu-scrollbar-subtle');
        expect(markup).toContain('overflow-y-auto');
        expect(markup).toContain('resize-none');
        expect(markup).not.toContain('overflow-x-auto');
        expect(markup).not.toContain('✦');
        expect(markup).not.toContain(getTranslation('en', 'composerAdvancedDesc'));
        expect(markup).not.toContain('Output format: images-only');
        expect(markup).not.toContain('Thinking level: high');
        expect(markup).not.toContain('composer-settings-model');
        expect(markup).not.toContain('composer-settings-ratio');
        expect(markup).not.toContain('composer-settings-size');
        expect(markup).not.toContain('composer-settings-qty');
        expect(markup).not.toContain('Compose');
        expect(markup).not.toContain(getTranslation('en', 'composerActionPanelTitle'));
        expect(markup).not.toContain('Gallery');
        expect(markup).toContain('composer-queue-batch-mode-hint-trigger');
        expect(markup).toContain('composer-queue-batch-mode-hint');
        expect(markup).toContain('composer-queue-row');
        expect(markup).toContain('composer-generate-card');
        expect(markup).toContain('composer-generate-actions');
        expect(markup).toContain('rounded-[30px]');
        expect(markup).toContain('rounded-[28px]');
        expect(markup).toContain('composer-queue-status-button');
        expect(markup).toContain('0 tracked');
        expect(markup).toContain('0 active');
        expect(markup).toContain('0 ready to import');
        expect(markup).toContain('0 closed with issues');
        expect(markup).not.toContain('composer-queue-summary-details');
        expect(markup).not.toContain('composer-queue-summary-summary');
        expect(markup).not.toContain('composer-queue-summary-notice');
        expect(markup).not.toContain('composer-reference-context-strip');
        expect(markup).not.toContain('Reference Tray');
        expect(markup).not.toContain('composer-workspace-tools');
        expect(markup).not.toContain('Export Workspace');
        expect(markup).not.toContain('Import Workspace');
        expect(markup).not.toContain('composer-style-clear');
        expect(markup).not.toContain('New Conversation');
        expect(markup).not.toContain('Follow-up Edit');
        expect(markup).not.toContain(getTranslation('en', 'followUpEditRequiresStageImage'));
        expect(markup).not.toContain('Continue with this image');
        expect(markup).toContain('min-h-10');
        expect(markup).toContain('py-2');
        expect(markup).toContain('Memory send is available only when quantity is 1.');
        expect(markup).toContain('bg-slate-200/95');
        expect(markup).toContain('dark:bg-slate-950');
        expect(markup).toContain('bg-amber-500');
        expect(markup).toContain('text-white dark:text-slate-950');
        expect(markup).toContain('px-2 py-1.5');
    });

    it('switches the prompt surface copy when memory send intent is active', () => {
        const markup = renderToStaticMarkup(
            <ComposerSettingsPanel
                {...baseProps}
                stickySendIntent="memory"
                batchSize={1}
                groundingMode="off"
                imageModel="gemini-3.1-flash-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image-preview']}
            />,
        );

        expect(markup).not.toContain('Next send');
        expect(markup).toContain('Independent send');
        expect(markup).toContain('Memory send');
        expect(markup).toContain('Press Enter to Send');
        expect(markup).toContain('Press Enter for New Line');
        expect(markup).toContain('composer-enter-behavior-toggle');
        expect(markup).toContain('composer-sticky-send-intent-toggle');
        expect(markup).toContain('composer-sticky-send-intent-thumb');
        expect(markup).toContain('data-active-intent="memory"');
        expect(markup).toContain('aria-pressed="true"');
        expect(markup).not.toContain('composer-sticky-send-intent-info-card');
        expect(markup).not.toContain('Keeps the next send inside official conversation memory.');
        expect(markup).toContain('Conversation');
        expect(markup).toContain(
            'Continue the conversation and describe how this round should change with remembered context...',
        );
        expect(markup).toContain('New Conversation');
        expect(markup).toContain('border-red-200/80 bg-red-50/90');
        expect(markup).toContain('Press Enter to Send');
        expect(markup).toContain('Press Enter for New Line');
    });

    it('shows a spinner only for the active quick tool while helper actions are busy', () => {
        const markup = renderToStaticMarkup(
            <ComposerSettingsPanel
                {...baseProps}
                isEnhancingPrompt={true}
                activePromptTool="rewrite"
                groundingMode="off"
                imageModel="gemini-3.1-flash-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image-preview']}
            />,
        );

        expect(markup).toContain('composer-quick-tool-spinner-rewrite');
        expect(markup).not.toContain('composer-quick-tool-spinner-image-to-prompt');
        expect(markup).not.toContain('composer-quick-tool-spinner-inspiration');
    });

    it('keeps style visible while turning the primary CTA into a continuation action when a stage image exists', () => {
        const markup = renderToStaticMarkup(
            <ComposerSettingsPanel
                {...baseProps}
                imageStyleLabel="Cinematic"
                currentStageAsset={{
                    id: 'stage-source-1',
                    url: 'https://example.com/stage-source.png',
                    role: 'stage-source',
                    origin: 'history',
                    createdAt: 1710400010000,
                    lineageAction: 'reopen',
                }}
                getStageOriginLabel={() => 'History'}
                getLineageActionLabel={() => 'Reopen'}
                groundingMode="off"
                imageModel="gemini-3.1-flash-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image-preview']}
            />,
        );

        expect(markup).toContain('composer-style-strip');
        expect(markup).toContain('Style');
        expect(markup).toContain('Cinematic');
        expect(markup).toContain('border-fuchsia-200/90 bg-fuchsia-50');
        expect(markup).toContain('composer-style-clear');
        expect(markup).toContain('composer-sticky-send-intent');
        expect(markup).not.toContain('composer-follow-up-source-strip');
        expect(markup).toContain('Continue with this image');
        expect(markup).toContain('Continue with image: History · Reopen');
        expect(markup).toContain('Generate');
        expect(markup).toContain('Press Enter to Send');
        expect(markup).toContain('Press Enter for New Line');
        expect(markup.indexOf('composer-settings-button')).toBeLessThan(markup.indexOf('composer-style-strip'));
        expect(markup.indexOf('composer-style-strip')).toBeLessThan(markup.indexOf('composer-image-tools-slot'));
        expect(markup.indexOf('composer-image-tools-slot')).toBeLessThan(markup.indexOf('composer-sticky-send-intent'));
    });

    it('replaces the inline queued jobs panel with a compact status button when tracked jobs exist', () => {
        const markup = renderToStaticMarkup(
            <ComposerSettingsPanel
                {...baseProps}
                queuedJobs={
                    [
                        {
                            localId: 'job-running',
                            name: 'batches/job-running',
                            displayName: 'Running queue job',
                            state: 'JOB_STATE_RUNNING',
                            model: 'gemini-3.1-flash-image-preview',
                            prompt: 'Track the queue',
                            generationMode: 'Text to Image',
                            aspectRatio: '1:1',
                            imageSize: '1K',
                            style: 'None',
                            outputFormat: 'images-only',
                            temperature: 1,
                            thinkingLevel: 'minimal',
                            includeThoughts: true,
                            googleSearch: false,
                            imageSearch: false,
                            batchSize: 1,
                            objectImageCount: 0,
                            characterImageCount: 0,
                            createdAt: 1710400000000,
                            updatedAt: 1710400010000,
                            startedAt: 1710400005000,
                            completedAt: null,
                            lastPolledAt: 1710400010000,
                            importedAt: null,
                            error: null,
                        },
                    ] as any
                }
                groundingMode="off"
                imageModel="gemini-3.1-flash-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image-preview']}
            />,
        );

        expect(markup).toContain('composer-queue-status-button');
        expect(markup).toContain('composer-queue-status-progress');
        expect(markup).toContain('Queued Batch Jobs');
        expect(markup).toContain('1 tracked');
        expect(markup).toContain('1 active');
        expect(markup).toContain('0 ready to import');
        expect(markup).toContain('0 closed with issues');
        expect(markup).not.toContain('queued-batch-panel');
    });

    it('counts submit-pending jobs as active and excludes no-payload successes from ready-to-import totals', () => {
        const markup = renderToStaticMarkup(
            <ComposerSettingsPanel
                {...baseProps}
                queuedJobs={
                    [
                        {
                            localId: 'job-submit-pending',
                            name: 'local-pending/job-submit-pending',
                            displayName: 'Submitting queue job',
                            state: 'JOB_STATE_PENDING',
                            model: 'gemini-3.1-flash-image-preview',
                            prompt: 'Track the queue immediately',
                            generationMode: 'Text to Image',
                            aspectRatio: '1:1',
                            imageSize: '1K',
                            style: 'None',
                            outputFormat: 'images-only',
                            temperature: 1,
                            thinkingLevel: 'minimal',
                            includeThoughts: true,
                            googleSearch: false,
                            imageSearch: false,
                            batchSize: 1,
                            objectImageCount: 0,
                            characterImageCount: 0,
                            createdAt: 1710400000000,
                            updatedAt: 1710400000000,
                            startedAt: null,
                            completedAt: null,
                            lastPolledAt: null,
                            importedAt: null,
                            submissionPending: true,
                            hasInlinedResponses: false,
                            error: null,
                        },
                        {
                            localId: 'job-no-payload',
                            name: 'batches/job-no-payload',
                            displayName: 'No payload queue job',
                            state: 'JOB_STATE_SUCCEEDED',
                            model: 'gemini-3.1-flash-image-preview',
                            prompt: 'Succeeded without inline payload',
                            generationMode: 'Text to Image',
                            aspectRatio: '1:1',
                            imageSize: '1K',
                            style: 'None',
                            outputFormat: 'images-only',
                            temperature: 1,
                            thinkingLevel: 'minimal',
                            includeThoughts: true,
                            googleSearch: false,
                            imageSearch: false,
                            batchSize: 1,
                            objectImageCount: 0,
                            characterImageCount: 0,
                            createdAt: 1710400001000,
                            updatedAt: 1710400002000,
                            startedAt: 1710400001000,
                            completedAt: 1710400002000,
                            lastPolledAt: 1710400002000,
                            importedAt: null,
                            hasInlinedResponses: false,
                            error: null,
                        },
                        {
                            localId: 'job-ready',
                            name: 'batches/job-ready',
                            displayName: 'Ready queue job',
                            state: 'JOB_STATE_SUCCEEDED',
                            model: 'gemini-3.1-flash-image-preview',
                            prompt: 'Succeeded with inline payload',
                            generationMode: 'Text to Image',
                            aspectRatio: '1:1',
                            imageSize: '1K',
                            style: 'None',
                            outputFormat: 'images-only',
                            temperature: 1,
                            thinkingLevel: 'minimal',
                            includeThoughts: true,
                            googleSearch: false,
                            imageSearch: false,
                            batchSize: 1,
                            objectImageCount: 0,
                            characterImageCount: 0,
                            createdAt: 1710400003000,
                            updatedAt: 1710400004000,
                            startedAt: 1710400003000,
                            completedAt: 1710400004000,
                            lastPolledAt: 1710400004000,
                            importedAt: null,
                            hasInlinedResponses: true,
                            error: null,
                        },
                    ] as any
                }
                groundingMode="off"
                imageModel="gemini-3.1-flash-image-preview"
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image-preview']}
            />,
        );

        expect(markup).toContain('composer-queue-status-button');
        expect(markup).toContain('3 tracked');
        expect(markup).toContain('1 active');
        expect(markup).toContain('1 ready to import');
        expect(markup).toContain('0 closed with issues');
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
        expect(markup).toContain('Image Search is capped at 1K.');
        expect(markup).toContain('composer-advanced-grounding-card');
        expect(markup).toContain('composer-advanced-grounding-guide');
        expect(markup).not.toContain('composer-advanced-grounding-guide-details');
        expect(markup).not.toContain('composer-advanced-grounding-guide-summary');
        expect(markup).not.toContain('composer-advanced-grounding-guide-count');
        expect(markup).not.toContain('Nano Banana 2 + Google Search');
        expect(markup).not.toContain('Nano Banana Pro + Google Search');
        expect(markup).not.toContain('Grounding behavior');
        expect(markup).not.toContain('Runtime guide');
        expect(markup).not.toContain('group-open:rotate-180');
        expect(markup).toContain('composer-advanced-settings-apply');
        expect(markup).not.toContain('composer-advanced-settings-open-generation');
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
        expect(markup).not.toContain('composer-advanced-grounding-guide');
        expect(markup).not.toContain('Nano Banana Pro + Google Search');
        expect(markup).not.toContain('composer-advanced-structured-output-guide');
        expect(markup).not.toContain('composer-advanced-header-hint');
        expect(markup).not.toContain('composer-advanced-generation-hint');
        expect(markup).not.toContain('composer-advanced-grounding-section-hint');
        expect(markup).not.toContain('composer-advanced-grounding-guide-hint');
        expect(markup).not.toContain('Grounding behavior');
        expect(markup).toContain(getTranslation('en', 'composerDefaultTemp').replace('{0}', '= 1.0'));
    });

    it('does not render structured-output guidance cards after the feature removal', () => {
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

        expect(markup).not.toContain('composer-advanced-structured-output-guide');
        expect(markup).not.toContain('Variation compare');
        expect(markup).not.toContain('Revision brief');
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

        expect(markup).toContain('機能対応の詳細設定');
        expect(markup).toContain('キャンセル');
        expect(markup).toContain('Apply');
        expect(markup).not.toContain('詳細操作');
        expect(markup).not.toContain('>Advanced settings<');
        expect(markup).not.toContain('>Close<');
        expect(markup).not.toContain('>閉じる<');
    });
});
