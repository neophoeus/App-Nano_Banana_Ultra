import React from 'react';
import Button from './Button';
import InfoTooltip from './InfoTooltip';
import { MODEL_CAPABILITIES, OUTPUT_FORMATS, STRUCTURED_OUTPUT_MODES, THINKING_LEVELS } from '../constants';
import { getGroundingModeLabel } from '../utils/groundingMode';
import { STRUCTURED_OUTPUT_FIELD_LABEL_KEYS } from '../utils/structuredOutputPresentation';
import { getStructuredOutputDefinition } from '../utils/structuredOutputs';
import { getTranslation, Language } from '../utils/translations';
import {
    AspectRatio,
    GeneratedImage,
    GroundingMode,
    ImageModel,
    ImageSize,
    OutputFormat,
    QueuedBatchJob,
    StageAsset,
    StructuredOutputMode,
    ThinkingLevel,
    TurnLineageAction,
} from '../types';

export type ComposerSettingsPanelProps = {
    prompt: string;
    placeholder: string;
    enterToSubmit: boolean;
    isGenerating: boolean;
    isEnhancingPrompt: boolean;
    currentLanguage: Language;
    imageStyleLabel: string;
    modelLabel: string;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
    hasSizePicker: boolean;
    totalReferenceCount: number;
    objectCount: number;
    characterCount: number;
    maxObjects: number;
    maxCharacters: number;
    outputFormat: OutputFormat;
    structuredOutputMode: StructuredOutputMode;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    groundingMode: GroundingMode;
    imageModel: ImageModel;
    currentStageAsset: StageAsset | null;
    capability: (typeof MODEL_CAPABILITIES)[ImageModel];
    availableGroundingModes: GroundingMode[];
    temperature: number;
    isAdvancedSettingsOpen: boolean;
    generateLabel: string;
    queuedJobs: QueuedBatchJob[];
    queueBatchModeSummary: string;
    queueBatchConversationNotice: string | null;
    getImportedQueuedResultCount: (job: QueuedBatchJob) => number;
    getImportedQueuedHistoryItems: (job: QueuedBatchJob) => GeneratedImage[];
    activeImportedQueuedHistoryId: string | null;
    onPromptChange: (value: string) => void;
    onToggleEnterToSubmit: () => void;
    onGenerate: () => void;
    onQueueBatchJob: () => void;
    onOpenQueuedBatchJobs: () => void;
    onCancelGeneration: () => void;
    onStartNewConversation: () => void;
    onFollowUpGenerate: () => void;
    onSurpriseMe: () => void;
    onSmartRewrite: () => void;
    onOpenPromptHistory: () => void;
    onOpenTemplates: () => void;
    onOpenStyles: () => void;
    onOpenModelPicker: () => void;
    onOpenRatioPicker: () => void;
    onOpenSizePicker: () => void;
    onOpenBatchPicker: () => void;
    onOpenReferences: () => void;
    onToggleAdvancedSettings: () => void;
    onOutputFormatChange: (value: OutputFormat) => void;
    onStructuredOutputModeChange: (value: StructuredOutputMode) => void;
    onTemperatureChange: (value: number) => void;
    onThinkingLevelChange: (value: ThinkingLevel) => void;
    onGroundingModeChange: (value: GroundingMode) => void;
    onImportAllQueuedJobs: () => void;
    onPollAllQueuedJobs: () => void;
    onPollQueuedJob: (localId: string) => void;
    onCancelQueuedJob: (localId: string) => void;
    onImportQueuedJob: (localId: string) => void;
    onOpenImportedQueuedJob: (localId: string) => void;
    onOpenLatestImportedQueuedJob: (localId: string) => void;
    onOpenImportedQueuedHistoryItem: (historyId: string) => void;
    onRemoveQueuedJob: (localId: string) => void;
    getStageOriginLabel: (origin?: StageAsset['origin']) => string;
    getLineageActionLabel: (action?: TurnLineageAction) => string;
    promptTextareaRef?: React.RefObject<HTMLTextAreaElement | null>;
};

const STRUCTURED_OUTPUT_GUIDE_FIELD_KEYS: Record<StructuredOutputMode, string[]> = {
    off: [],
    'scene-brief': ['summary', 'primarySubjects', 'compositionNotes'],
    'prompt-kit': ['intentSummary', 'subjectCues', 'negativeCues'],
    'quality-check': ['overallAssessment', 'issues', 'revisionPriorities'],
    'shot-plan': ['shotIntent', 'cameraFraming', 'lightingPlan'],
    'delivery-brief': ['deliverySummary', 'mustProtect', 'exportTargets'],
    'revision-brief': ['revisionGoal', 'editTargets', 'riskChecks'],
    'variation-compare': ['comparisonSummary', 'tradeoffs', 'testPrompts'],
};

const STRUCTURED_OUTPUT_GUIDE_EXAMPLE_VALUES: Record<StructuredOutputMode, Record<string, string | string[]>> = {
    off: {},
    'scene-brief': {
        summary: 'Moody rooftop portrait with a restrained teal-orange palette.',
        primarySubjects: ['solo runner', 'wind-tossed coat'],
        compositionNotes: 'Keep the subject off-center with skyline depth behind the shoulder.',
    },
    'prompt-kit': {
        intentSummary: 'Push the scene toward premium editorial drama without losing realism.',
        subjectCues: ['tailored black coat', 'direct eye contact'],
        negativeCues: ['cartoon shading', 'overblown lens flare'],
    },
    'quality-check': {
        overallAssessment: 'Strong silhouette and mood, but the face contrast is still slightly heavy.',
        issues: ['eye socket shadows feel too dense', 'background highlights compete with the subject'],
        revisionPriorities: ['soften facial contrast first', 'quiet the brightest skyline accents second'],
    },
    'shot-plan': {
        shotIntent: 'Sell a composed hero frame with quiet tension and clean subject separation.',
        cameraFraming: 'Medium portrait from chest-up with slight low-angle emphasis.',
        lightingPlan: ['soft key from camera left', 'subtle rim light on coat edge'],
    },
    'delivery-brief': {
        deliverySummary: 'Ready for stakeholder review after one final cleanup pass.',
        mustProtect: ['clean coat silhouette', 'muted cinematic palette'],
        exportTargets: ['review JPG', 'master PNG'],
    },
    'revision-brief': {
        revisionGoal: 'Open up the face, simplify the background, and keep the silhouette premium.',
        editTargets: ['lift eye-area detail', 'reduce background hotspot clutter'],
        riskChecks: ['do not flatten the moody contrast', 'avoid making skin texture look over-smoothed'],
    },
    'variation-compare': {
        comparisonSummary: 'Option B keeps the silhouette cleaner while Option A feels more aggressive.',
        tradeoffs: ['A has stronger energy but noisier lighting', 'B is calmer but less immediately bold'],
        testPrompts: ['keep Option B pose, add A-level contrast', 'retain B framing and sharpen rim light'],
    },
};

const STRUCTURED_OUTPUT_PROMPT_READY_FIELD_KEYS: Partial<Record<StructuredOutputMode, string[]>> = {
    'revision-brief': ['finalPrompt'],
    'variation-compare': ['recommendedNextMove', 'testPrompts'],
};

function ComposerSettingsPanel({
    prompt,
    placeholder,
    enterToSubmit,
    isGenerating,
    isEnhancingPrompt,
    currentLanguage,
    imageStyleLabel,
    modelLabel,
    aspectRatio,
    imageSize,
    batchSize,
    hasSizePicker,
    totalReferenceCount,
    objectCount,
    characterCount,
    maxObjects,
    maxCharacters,
    outputFormat,
    structuredOutputMode,
    thinkingLevel,
    includeThoughts,
    groundingMode,
    imageModel,
    currentStageAsset,
    capability,
    availableGroundingModes,
    temperature,
    isAdvancedSettingsOpen,
    generateLabel,
    queuedJobs,
    queueBatchModeSummary,
    queueBatchConversationNotice,
    getImportedQueuedResultCount,
    getImportedQueuedHistoryItems,
    activeImportedQueuedHistoryId,
    onPromptChange,
    onToggleEnterToSubmit,
    onGenerate,
    onQueueBatchJob,
    onOpenQueuedBatchJobs,
    onCancelGeneration,
    onStartNewConversation,
    onFollowUpGenerate,
    onSurpriseMe,
    onSmartRewrite,
    onOpenPromptHistory,
    onOpenTemplates,
    onOpenStyles,
    onOpenModelPicker,
    onOpenRatioPicker,
    onOpenSizePicker,
    onOpenBatchPicker,
    onOpenReferences,
    onToggleAdvancedSettings,
    onOutputFormatChange,
    onStructuredOutputModeChange,
    onTemperatureChange,
    onThinkingLevelChange,
    onGroundingModeChange,
    onImportAllQueuedJobs,
    onPollAllQueuedJobs,
    onPollQueuedJob,
    onCancelQueuedJob,
    onImportQueuedJob,
    onOpenImportedQueuedJob,
    onOpenLatestImportedQueuedJob,
    onOpenImportedQueuedHistoryItem,
    onRemoveQueuedJob,
    getStageOriginLabel,
    getLineageActionLabel,
    promptTextareaRef,
}: ComposerSettingsPanelProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const getStructuredOutputModeLabel = (value: StructuredOutputMode) => {
        switch (value) {
            case 'scene-brief':
                return t('structuredOutputModeSceneBrief');
            case 'prompt-kit':
                return t('structuredOutputModePromptKit');
            case 'quality-check':
                return t('structuredOutputModeQualityCheck');
            case 'shot-plan':
                return t('structuredOutputModeShotPlan');
            case 'delivery-brief':
                return t('structuredOutputModeDeliveryBrief');
            case 'revision-brief':
                return t('structuredOutputModeRevisionBrief');
            case 'variation-compare':
                return t('structuredOutputModeVariationCompare');
            default:
                return t('structuredOutputModeOff');
        }
    };
    const getStructuredOutputModeGuide = (value: StructuredOutputMode) => {
        switch (value) {
            case 'scene-brief':
                return t('composerAdvancedStructuredOutputGuideSceneBrief');
            case 'prompt-kit':
                return t('composerAdvancedStructuredOutputGuidePromptKit');
            case 'quality-check':
                return t('composerAdvancedStructuredOutputGuideQualityCheck');
            case 'shot-plan':
                return t('composerAdvancedStructuredOutputGuideShotPlan');
            case 'delivery-brief':
                return t('composerAdvancedStructuredOutputGuideDeliveryBrief');
            case 'revision-brief':
                return t('composerAdvancedStructuredOutputGuideRevisionBrief');
            case 'variation-compare':
                return t('composerAdvancedStructuredOutputGuideVariationCompare');
            default:
                return t('composerAdvancedStructuredOutputGuideOff');
        }
    };
    const getStructuredOutputModeGuideBestFor = (value: StructuredOutputMode) => {
        switch (value) {
            case 'scene-brief':
                return t('composerAdvancedStructuredOutputGuideBestForSceneBrief');
            case 'prompt-kit':
                return t('composerAdvancedStructuredOutputGuideBestForPromptKit');
            case 'quality-check':
                return t('composerAdvancedStructuredOutputGuideBestForQualityCheck');
            case 'shot-plan':
                return t('composerAdvancedStructuredOutputGuideBestForShotPlan');
            case 'delivery-brief':
                return t('composerAdvancedStructuredOutputGuideBestForDeliveryBrief');
            case 'revision-brief':
                return t('composerAdvancedStructuredOutputGuideBestForRevisionBrief');
            case 'variation-compare':
                return t('composerAdvancedStructuredOutputGuideBestForVariationCompare');
            default:
                return null;
        }
    };
    const getStructuredOutputModeGuideAvoidWhen = (value: StructuredOutputMode) => {
        switch (value) {
            case 'scene-brief':
                return t('composerAdvancedStructuredOutputGuideAvoidWhenSceneBrief');
            case 'prompt-kit':
                return t('composerAdvancedStructuredOutputGuideAvoidWhenPromptKit');
            case 'quality-check':
                return t('composerAdvancedStructuredOutputGuideAvoidWhenQualityCheck');
            case 'shot-plan':
                return t('composerAdvancedStructuredOutputGuideAvoidWhenShotPlan');
            case 'delivery-brief':
                return t('composerAdvancedStructuredOutputGuideAvoidWhenDeliveryBrief');
            case 'revision-brief':
                return t('composerAdvancedStructuredOutputGuideAvoidWhenRevisionBrief');
            case 'variation-compare':
                return t('composerAdvancedStructuredOutputGuideAvoidWhenVariationCompare');
            default:
                return null;
        }
    };
    const getStructuredOutputModeGuideFields = (value: StructuredOutputMode) =>
        STRUCTURED_OUTPUT_GUIDE_FIELD_KEYS[value].map(
            (fieldKey) =>
                getTranslation(currentLanguage, STRUCTURED_OUTPUT_FIELD_LABEL_KEYS[fieldKey] || '') || fieldKey,
        );
    const getStructuredOutputModePromptReadyGuide = (value: StructuredOutputMode) => {
        switch (value) {
            case 'revision-brief':
                return t('structuredOutputPromptReadyHintRevisionBrief');
            case 'variation-compare':
                return t('structuredOutputPromptReadyHintVariationCompare');
            default:
                return null;
        }
    };
    const getStructuredOutputModePromptReadyFields = (value: StructuredOutputMode) =>
        (STRUCTURED_OUTPUT_PROMPT_READY_FIELD_KEYS[value] || []).map(
            (fieldKey) =>
                getTranslation(currentLanguage, STRUCTURED_OUTPUT_FIELD_LABEL_KEYS[fieldKey] || '') || fieldKey,
        );
    const getStructuredOutputModeGuideExampleRows = (value: StructuredOutputMode) => {
        const definition = getStructuredOutputDefinition(value);
        const properties =
            (definition?.responseJsonSchema?.properties as Record<string, { type?: string }> | undefined) || {};
        const fieldKeys = STRUCTURED_OUTPUT_GUIDE_FIELD_KEYS[value];
        const exampleValues = STRUCTURED_OUTPUT_GUIDE_EXAMPLE_VALUES[value] || {};

        if (fieldKeys.length === 0) {
            return [];
        }

        return [
            '{',
            ...fieldKeys.map((fieldKey, index) => {
                const placeholder = properties[fieldKey]?.type === 'array' ? ['...', '...'] : '...';
                const exampleValue = exampleValues[fieldKey] ?? placeholder;
                const trailingComma = index < fieldKeys.length - 1 ? ',' : '';

                return `  "${fieldKey}": ${JSON.stringify(exampleValue)}${trailingComma}`;
            }),
            '}',
        ];
    };
    const toolbarGroupClassName = 'nbu-subpanel flex flex-wrap items-center gap-1.5 p-1.5 sm:gap-2 sm:p-2';
    const toolbarButtonClassName =
        'nbu-control-button px-2.5 py-1.5 text-[12px] transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-3 sm:py-1.5 sm:text-[13px]';
    const settingsButtonClassName =
        'nbu-control-button rounded-[20px] px-3.5 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md disabled:hover:translate-y-0 disabled:hover:shadow-none';
    const showGroundingResolutionWarning =
        imageModel === 'gemini-3.1-flash-image-preview' &&
        (groundingMode === 'image-search' || groundingMode === 'google-search-plus-image-search');
    const groundingGuideRows = [
        t('composerAdvancedGroundingGuideFlashGoogle'),
        t('composerAdvancedGroundingGuideFlashImage'),
        t('composerAdvancedGroundingGuideProGoogle'),
    ];
    const runningQueueCount = queuedJobs.filter(
        (job) => job.state === 'JOB_STATE_PENDING' || job.state === 'JOB_STATE_RUNNING',
    ).length;
    const importReadyQueueCount = queuedJobs.filter(
        (job) => job.state === 'JOB_STATE_SUCCEEDED' && !job.importedAt,
    ).length;
    const issueQueueCount = queuedJobs.filter(
        (job) =>
            job.state === 'JOB_STATE_FAILED' ||
            job.state === 'JOB_STATE_CANCELLED' ||
            job.state === 'JOB_STATE_EXPIRED',
    ).length;
    const trackedQueueCount = queuedJobs.length;
    const settledQueueCount = trackedQueueCount - runningQueueCount;
    const queueProgressPercent =
        trackedQueueCount > 0
            ? Math.max(0, Math.min(100, Math.round((settledQueueCount / trackedQueueCount) * 100)))
            : 0;

    return (
        <section className="nbu-shell-panel nbu-shell-surface-composer-dock shrink-0 p-3 md:p-4">
            <div data-testid="composer-settings-row" className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <button
                    type="button"
                    data-testid="composer-settings-model"
                    onClick={onOpenModelPicker}
                    className={settingsButtonClassName}
                >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {t('modelSelect')}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{modelLabel}</div>
                </button>
                <button
                    type="button"
                    data-testid="composer-settings-ratio"
                    onClick={onOpenRatioPicker}
                    className={settingsButtonClassName}
                >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {t('aspectRatio')}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{aspectRatio}</div>
                </button>
                <button
                    type="button"
                    data-testid="composer-settings-size"
                    onClick={onOpenSizePicker}
                    disabled={!hasSizePicker}
                    className={settingsButtonClassName}
                >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {t('workspaceSheetTitleSize')}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{imageSize}</div>
                </button>
                <button
                    type="button"
                    data-testid="composer-settings-qty"
                    onClick={onOpenBatchPicker}
                    className={settingsButtonClassName}
                >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {t('batchSize')}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{batchSize}</div>
                </button>
            </div>

            <div className="mb-2.5 flex flex-wrap items-start gap-2.5">
                <div data-testid="composer-quick-tools" className={`${toolbarGroupClassName} flex-1`}>
                    <button
                        onClick={onSurpriseMe}
                        disabled={isEnhancingPrompt}
                        className={`${toolbarButtonClassName} disabled:opacity-50`}
                    >
                        {t('workspacePickerInspiration')}
                    </button>
                    <button
                        onClick={onSmartRewrite}
                        disabled={isEnhancingPrompt}
                        className={`${toolbarButtonClassName} disabled:opacity-50`}
                    >
                        {t('rewrite')}
                    </button>
                    <button onClick={onOpenPromptHistory} className={toolbarButtonClassName}>
                        {t('workspacePickerPromptHistoryTitle')}
                    </button>
                    <button onClick={onOpenTemplates} className={toolbarButtonClassName}>
                        {t('workspaceSheetTitleTemplates')}
                    </button>
                    <button onClick={onOpenStyles} className={toolbarButtonClassName}>
                        {t('workspaceSheetTitleStyles')}: {imageStyleLabel}
                    </button>
                    <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-expanded={isAdvancedSettingsOpen}
                        onClick={onToggleAdvancedSettings}
                        className={toolbarButtonClassName}
                    >
                        {t('composerToolbarAdvancedSettings')}
                    </button>
                </div>
            </div>

            <div
                data-testid="composer-reference-context-strip"
                className="nbu-inline-panel mb-3 flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
            >
                <button
                    type="button"
                    data-testid="composer-reference-context-button"
                    onClick={onOpenReferences}
                    className="nbu-control-button flex items-center gap-3 rounded-[18px] px-3 py-2 text-left"
                >
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                        {totalReferenceCount}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {t('workspaceTopHeaderReferenceTray')}
                    </span>
                </button>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="nbu-chip">
                        {t('workspacePickerObjects')} {objectCount}/{maxObjects}
                    </span>
                    <span className="nbu-chip">
                        {t('workspacePickerCharacters')} {characterCount}/{maxCharacters}
                    </span>
                </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_270px]">
                <div>
                    <div className="nbu-subpanel overflow-hidden p-2.5">
                        <div className="mb-2.5 flex flex-wrap items-start justify-between gap-3 px-1">
                            <div>
                                <h3 className="text-[15px] font-black text-slate-900 dark:text-slate-100">
                                    {t('promptLabel')}
                                </h3>
                            </div>
                            <button onClick={onToggleEnterToSubmit} className="nbu-chip">
                                {enterToSubmit ? t('composerEnterSends') : t('composerEnterNewline')}
                            </button>
                        </div>
                        <textarea
                            ref={promptTextareaRef}
                            className="nbu-composer-dock-textarea h-36 w-full rounded-[26px] border px-4 py-3.5 text-sm leading-6 outline-none transition-all focus:ring-4 focus:ring-amber-100/70 dark:focus:ring-amber-500/10"
                            placeholder={placeholder}
                            value={prompt}
                            onChange={(e) => onPromptChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (enterToSubmit && e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                                    e.preventDefault();
                                    onGenerate();
                                }
                            }}
                        />
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {currentStageAsset && (
                                <span className="nbu-chip">
                                    {t('composerFollowUpSource')}: {getStageOriginLabel(currentStageAsset.origin)}
                                    {currentStageAsset.lineageAction
                                        ? ` · ${getLineageActionLabel(currentStageAsset.lineageAction)}`
                                        : ''}
                                </span>
                            )}
                            <span className="nbu-chip">
                                {t('groundingProvenanceInsightOutputFormat')}: {outputFormat}
                            </span>
                            <span className="nbu-chip">
                                {t('groundingProvenanceInsightThinkingLevel')}: {thinkingLevel}
                            </span>
                            <span className="nbu-chip">
                                {t('groundingProvenanceInsightReturnThoughts')}:{' '}
                                {includeThoughts ? t('composerVisibilityVisible') : t('composerVisibilityHidden')}
                            </span>
                            <span className="nbu-chip">
                                {t('groundingProvenanceInsightGrounding')}: {getGroundingModeLabel(groundingMode)}
                            </span>
                            {structuredOutputMode !== 'off' && (
                                <span className="nbu-chip">
                                    {t('composerAdvancedStructuredOutput')}: {structuredOutputMode}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                        <button onClick={onToggleEnterToSubmit} className="nbu-control-button px-3 py-1.5 lg:hidden">
                            {enterToSubmit ? t('composerEnterSends') : t('composerEnterNewline')}
                        </button>
                    </div>
                </div>

                <div className="nbu-floating-panel p-2.5 text-slate-900 dark:text-white">
                    {isGenerating ? (
                        <Button
                            onClick={onCancelGeneration}
                            variant="danger"
                            className="min-h-[64px] rounded-[20px] text-[15px]"
                        >
                            {t('clearHistoryCancel')}
                        </Button>
                    ) : (
                        <Button onClick={onGenerate} className="btn-shimmer min-h-[64px] rounded-[20px] text-[15px]">
                            {generateLabel}
                        </Button>
                    )}
                    {!isGenerating && (
                        <div className="mt-2.5 flex items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={onQueueBatchJob}
                                className="min-w-0 flex-1 rounded-[16px]"
                            >
                                {t('composerQueueBatchJob')}
                            </Button>
                            <InfoTooltip
                                content={queueBatchModeSummary}
                                buttonLabel={t('composerQueueBatchJob')}
                                ariaLabel={t('queuedBatchJobsTitle')}
                                dataTestId="composer-queue-batch-mode-hint"
                                tone="light"
                                align="right"
                            />
                        </div>
                    )}
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        {!isGenerating && (
                            <Button variant="secondary" onClick={onStartNewConversation} className="rounded-[16px]">
                                {t('workspaceViewerNewConversation')}
                            </Button>
                        )}
                        {currentStageAsset && !isGenerating && (
                            <Button variant="secondary" onClick={onFollowUpGenerate} className="rounded-[16px]">
                                {t('workspaceViewerFollowUpEdit')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            {trackedQueueCount > 0 ? (
                <button
                    type="button"
                    aria-haspopup="dialog"
                    data-testid="composer-queue-status-button"
                    onClick={onOpenQueuedBatchJobs}
                    className="nbu-inline-panel mt-3 flex w-full items-center gap-3 px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                {t('queuedBatchJobsTitle')}
                            </span>
                            <span className="nbu-chip">
                                {t('queuedBatchJobsTrackedCount').replace('{0}', trackedQueueCount.toString())}
                            </span>
                        </div>
                        <div
                            data-testid="composer-queue-status-progress"
                            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/80"
                        >
                            <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(245,158,11,0.95),rgba(16,185,129,0.95))] transition-all duration-300"
                                style={{ width: `${queueProgressPercent}%` }}
                            />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="nbu-chip">
                                {t('queuedBatchJobsActiveCount').replace('{0}', runningQueueCount.toString())}
                            </span>
                            <span className="nbu-chip">
                                {t('queuedBatchJobsImportReadyCount').replace('{0}', importReadyQueueCount.toString())}
                            </span>
                            <span className="nbu-chip">
                                {t('queuedBatchJobsClosedIssuesCount').replace('{0}', issueQueueCount.toString())}
                            </span>
                        </div>
                    </div>
                    <span className="nbu-control-button shrink-0 px-3 py-1.5 text-[11px] font-semibold">
                        {t('workspacePanelViewDetails')}
                    </span>
                </button>
            ) : null}
        </section>
    );
}

export default React.memo(ComposerSettingsPanel);
