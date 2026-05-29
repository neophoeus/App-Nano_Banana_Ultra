import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import './setupTranslations';
import ComposerAdvancedSettingsDialog from '../components/ComposerAdvancedSettingsDialog';
import ComposerSettingsPanel from '../components/ComposerSettingsPanel';
import { MODEL_CAPABILITIES } from '../constants';
import { DEFAULT_SAFETY_THRESHOLDS } from '../types';
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
    outputFormat: 'images-only' as const,
    thinkingLevel: 'high' as const,
    stickySendIntent: 'independent' as const,
    currentStageAsset: null,
    availableGroundingModes: ['off', 'google-search', 'image-search', 'google-search-plus-image-search'] as ('off' | 'google-search' | 'image-search' | 'google-search-plus-image-search')[],
    temperature: 1,
    isAdvancedSettingsOpen: true,
    generateLabel: 'Generate',
    isQueueBatchDisabled: false,
    queueBatchDisabledReason: null,
    queueBatchModeSummary: 'Queued batch runs as a separate official job workflow.',
    queueBatchGenerateModeSummary: 'Queued prompt-only batch ignores the staged image.',
    queueBatchConversationNotice: 'Official chat continuation stays out of queued batch mode.',
    onPromptChange: vi.fn(),
    onStickySendIntentChange: vi.fn(),
    onToggleEnterToSubmit: vi.fn(),
    onGenerate: vi.fn(),
    onQueueBatchJob: vi.fn(),
    onQueueBatchFollowUpJob: vi.fn(),
    onCancelGeneration: vi.fn(),
    onStartNewConversation: vi.fn(),
    onFollowUpGenerate: vi.fn(),
    onImageToPrompt: vi.fn(),
    onSurpriseMe: vi.fn(),
    onSmartRewrite: vi.fn(),
    onOpenStyles: vi.fn(),
    onOpenSettings: vi.fn(),
    onToggleAdvancedSettings: vi.fn(),
    getStageOriginLabel: () => 'Generated',
    getLineageActionLabel: () => 'Root',
    onClearStyle: vi.fn(),
    imageToolsPanel: <div data-testid="embedded-image-tools">Embedded Image Tools</div>,
};

const baseAdvancedSettingsDialogProps = {
    currentLanguage: 'en' as const,
    outputFormat: 'images-only' as const,
    thinkingLevel: 'high' as const,
    groundingMode: 'off' as const,
    safetyThresholds: DEFAULT_SAFETY_THRESHOLDS,
    imageModel: 'gemini-3.1-flash-image' as const,
    capability: MODEL_CAPABILITIES['gemini-3.1-flash-image'],
    availableGroundingModes: ['off', 'google-search', 'image-search', 'google-search-plus-image-search'] as ('off' | 'google-search' | 'image-search' | 'google-search-plus-image-search')[],
    temperature: 1,
    onOutputFormatChange: vi.fn(),
    onTemperatureChange: vi.fn(),
    onThinkingLevelChange: vi.fn(),
    onGroundingModeChange: vi.fn(),
    onSafetyThresholdsChange: vi.fn(),
};

describe('ComposerSettingsPanel toolbar layout', () => {
    it('keeps the top summary row above the embedded image tools and prompt helper rail', () => {
        const markup = renderToStaticMarkup(
            <ComposerSettingsPanel
                {...baseProps}
                groundingMode="off"
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image']}
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
        expect(markup).toContain('Enter\nsends');
        expect(markup).toContain('Enter\nnewline');
        expect(markup).toContain('border-slate-200/85 bg-slate-100/90');
        expect(markup).toContain('border-slate-200/80 bg-slate-100/85');
        expect(markup).toContain('absolute bottom-3.5 z-10 right-[var(--composer-prompt-overlay-inset)] sm:right-[var(--composer-prompt-overlay-inset-sm)]');
        expect(markup).toContain('h-48');
        expect(markup).toContain('min-h-[52px] w-[3.5rem]');
        expect(markup).toContain('sm:w-[3.75rem]');
        expect(markup).toContain('grid-rows-2');
        expect(markup).toContain('pb-3.5');
        expect(markup).toContain('relative overflow-hidden rounded-[26px] border nbu-composer-dock-textarea');
        expect(markup).toContain('focus-within:border-amber-400/90');
        expect(markup).toContain('w-[calc(100%-var(--composer-prompt-text-reserve))]');
        expect(markup).toContain('sm:w-[calc(100%-var(--composer-prompt-text-reserve-sm))]');
        expect(markup).toContain('bg-transparent');
        expect(markup).toContain('pr-4');
        expect(markup).toContain('--composer-prompt-overlay-inset:0.375rem');
        expect(markup).toContain('--composer-prompt-overlay-inset-sm:0.5rem');
        expect(markup).toContain('--composer-prompt-text-reserve:4.75rem');
        expect(markup).toContain('--composer-prompt-text-reserve-sm:5rem');
        expect(markup).toContain('whitespace-pre-line break-words');
        expect(markup).toContain('top-[calc(50%+0.125rem)] bottom-px');
        expect(markup).not.toContain('composer-sticky-send-intent-info-card');
        expect(markup).not.toContain(
            'Uses the selected image and tools without replaying official conversation memory.',
        );
        expect(markup).toContain('Instruction');
        expect(markup.indexOf('composer-settings-row')).toBeLessThan(markup.indexOf('composer-image-tools-slot'));
        expect(markup.indexOf('composer-image-tools-slot')).toBeLessThan(markup.indexOf('composer-sticky-send-intent'));
        expect(markup.indexOf('composer-sticky-send-intent')).toBeLessThan(markup.indexOf('composer-quick-tools'));
        expect(markup.indexOf('composer-quick-tools')).toBeLessThan(markup.indexOf('composer-enter-behavior-card'));
        expect(markup).toContain('Generation Settings');
        expect(markup).toContain('Style');
        expect(markup).toContain('None');
        expect(markup).toContain(
            `Model: ${getTranslation('en', 'modelGemini31Flash').replace(' (gemini-3.1-flash-image)', '')}`,
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
        expect(markup).not.toContain('composer-advanced-settings-disclosure');
        expect(markup).not.toContain('composer-advanced-settings-disclosure-summary');
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
        expect(markup).toContain('composer-queue-actions');
        expect(markup).not.toContain('composer-queue-row');
        expect(markup).toContain('Queue');
        expect(markup).toContain('composer-queue-batch-primary-button');
        expect(markup).not.toContain('composer-queue-batch-generate-button');
        expect(markup).toContain('composer-generate-card');
        expect(markup).toContain('composer-generate-actions');
        expect(markup).toContain('rounded-[30px]');
        expect(markup).toContain('rounded-[28px]');
        expect(markup).toContain('aria-label="Queued batch runs as a separate official job workflow."');
        expect(markup).not.toContain('aria-label="Queued Batch Jobs"');
        expect(markup).not.toContain('composer-queue-status-button');
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
        expect(markup).not.toContain(getTranslation('en', 'stageActionContinueFromHere'));
        expect(markup).toContain('py-2');
        expect(markup).toContain('Memory send is available only when quantity is 1.');
        expect(markup).toContain('bg-slate-200/95');
        expect(markup).toContain('dark:bg-slate-950');
        expect(markup).toContain('bg-amber-500');
        expect(markup).toContain('text-white dark:text-slate-950');
        expect(markup).toContain('px-1.5 py-1.5');
        expect(markup).toContain('leading-[0.85rem]');
        expect(markup.indexOf('composer-enter-behavior-card')).toBeLessThan(markup.indexOf('composer-generate-card'));
    });
});

describe('ComposerAdvancedSettingsDialog grounding warning', () => {
    it('shows the image-search resolution warning for 3.1 Flash image grounding', () => {
        const markup = renderToStaticMarkup(
            <ComposerAdvancedSettingsDialog
                {...baseAdvancedSettingsDialogProps}
                isOpen={true}
                onClose={vi.fn()}
                groundingMode="google-search-plus-image-search"
                imageModel="gemini-3.1-flash-image"
                capability={MODEL_CAPABILITIES['gemini-3.1-flash-image']}
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
                {...baseAdvancedSettingsDialogProps}
                isOpen={true}
                onClose={vi.fn()}
                groundingMode="google-search"
                imageModel="gemini-3-pro-image"
                capability={MODEL_CAPABILITIES['gemini-3-pro-image']}
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
                {...baseAdvancedSettingsDialogProps}
                isOpen={true}
                onClose={vi.fn()}
                groundingMode="google-search"
                imageModel="gemini-3-pro-image"
                capability={MODEL_CAPABILITIES['gemini-3-pro-image']}
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
                {...baseAdvancedSettingsDialogProps}
                isOpen={true}
                onClose={vi.fn()}
                currentLanguage="ja"
                groundingMode="google-search"
                imageModel="gemini-3-pro-image"
                capability={MODEL_CAPABILITIES['gemini-3-pro-image']}
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
