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
    onOpenSettings: () => void;
    onOpenModelPicker?: () => void;
    onOpenRatioPicker?: () => void;
    onOpenSizePicker?: () => void;
    onOpenBatchPicker?: () => void;
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
    onOpenSettings,
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
    const getOutputFormatSummaryLabel = (value: OutputFormat) =>
        OUTPUT_FORMATS.find((option) => option.value === value)?.label ?? value;
    const getThinkingLevelSummaryLabel = (value: ThinkingLevel) =>
        THINKING_LEVELS.find((option) => option.value === value)?.label ?? value;
    const getGroundingModeSummaryLabel = (value: GroundingMode) => {
        switch (value) {
            case 'google-search':
                return 'Web';
            case 'image-search':
                return 'Image';
            case 'google-search-plus-image-search':
                return 'Web + image';
            default:
                return getGroundingModeLabel(value);
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
    const quickToolButtonClassName =
        'nbu-control-button group flex h-[68px] w-full flex-col items-center justify-center gap-1.5 rounded-[22px] px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 transition-all hover:-translate-y-0.5 hover:shadow-md sm:h-[74px] sm:text-[11px] dark:text-slate-200';
    const compactModelLabel = modelLabel.replace(/\s*\([^)]*\)$/, '');
    const followUpSourceSummary = currentStageAsset
        ? `${getStageOriginLabel(currentStageAsset.origin)}${currentStageAsset.lineageAction ? ` · ${getLineageActionLabel(currentStageAsset.lineageAction)}` : ''}`
        : null;
    const settingsSummaryItems = [
        {
            key: 'model',
            value: `${t('modelSelect')}: ${compactModelLabel}`,
            className:
                'border-sky-200 bg-sky-50 text-sky-700 shadow-sm shadow-sky-100/80 dark:border-sky-400/45 dark:bg-sky-500/18 dark:text-sky-100 dark:shadow-[0_10px_24px_rgba(14,165,233,0.16)]',
        },
        {
            key: 'ratio',
            value: `${t('aspectRatio')}: ${aspectRatio}`,
            className:
                'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/80 dark:border-emerald-400/45 dark:bg-emerald-500/18 dark:text-emerald-100 dark:shadow-[0_10px_24px_rgba(16,185,129,0.16)]',
        },
        {
            key: 'size',
            value: `${t('workspaceSheetTitleSize')}: ${imageSize}`,
            className:
                'border-amber-200 bg-amber-50 text-amber-700 shadow-sm shadow-amber-100/80 dark:border-amber-300/50 dark:bg-amber-400/18 dark:text-amber-50 dark:shadow-[0_10px_24px_rgba(251,191,36,0.16)]',
        },
        {
            key: 'qty',
            value: `${t('batchSize')}: ${t('qtyX').replace('{0}', String(batchSize))}`,
            className:
                'border-violet-200 bg-violet-50 text-violet-700 shadow-sm shadow-violet-100/80 dark:border-violet-400/45 dark:bg-violet-500/18 dark:text-violet-100 dark:shadow-[0_10px_24px_rgba(168,85,247,0.16)]',
        },
    ];
    const advancedSummaryItems = [
        {
            key: 'output',
            value: `${t('groundingProvenanceInsightOutputFormat')}: ${getOutputFormatSummaryLabel(outputFormat)}`,
            className: '',
        },
        {
            key: 'thinking',
            value: `${t('groundingProvenanceInsightThinkingLevel')}: ${getThinkingLevelSummaryLabel(thinkingLevel)}`,
            className: '',
        },
        {
            key: 'thoughts',
            value: `${t('groundingProvenanceInsightReturnThoughts')}: ${includeThoughts ? t('composerVisibilityVisible') : t('composerVisibilityHidden')}`,
            className: '',
        },
        {
            key: 'grounding',
            value: `${t('groundingProvenanceInsightGrounding')}: ${getGroundingModeSummaryLabel(groundingMode)}`,
            className: '',
        },
        ...(structuredOutputMode !== 'off'
            ? [
                  {
                      key: 'structured-output',
                      value: `${t('composerAdvancedStructuredOutput')}: ${getStructuredOutputModeLabel(structuredOutputMode)}`,
                      className: '',
                  },
              ]
            : []),
    ];
    const summaryStripAnchorClassName =
        'inline-flex h-6 shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 dark:border-amber-500/25 dark:bg-amber-950/25 dark:text-amber-200';
    const summaryStripChipClassName =
        'inline-flex h-6 shrink-0 items-center rounded-full border border-slate-200/80 bg-white/88 px-2 text-[10px] font-semibold leading-none whitespace-nowrap text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200';
    const quickToolButtons = [
        {
            id: 'inspiration',
            label: t('workspacePickerInspiration'),
            onClick: onSurpriseMe,
            disabled: isEnhancingPrompt,
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="m12 3 1.7 5.3H19l-4.3 3.1 1.7 5.3L12 13.6 7.6 16.7l1.7-5.3L5 8.3h5.3L12 3Z"
                    />
                </svg>
            ),
        },
        {
            id: 'rewrite',
            label: t('rewrite'),
            onClick: onSmartRewrite,
            disabled: isEnhancingPrompt,
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 4v4m0 8v4m8-8h-4M8 12H4m13.657-5.657-2.829 2.829M9.172 14.828l-2.829 2.829m11.314 0-2.829-2.829M9.172 9.172 6.343 6.343"
                    />
                </svg>
            ),
        },
        {
            id: 'templates',
            label: t('workspaceSheetTitleTemplates'),
            onClick: onOpenTemplates,
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM8 8h8M8 12h8m-8 4h5"
                    />
                </svg>
            ),
        },
        {
            id: 'history',
            label: t('workspacePickerPromptHistoryTitle'),
            onClick: onOpenPromptHistory,
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 8v4l2.5 2.5M20 12a8 8 0 1 1-2.343-5.657M20 4v6h-6"
                    />
                </svg>
            ),
        },
        {
            id: 'styles',
            label: t('workspaceSheetTitleStyles'),
            onClick: onOpenStyles,
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M7 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10-8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm2 2h6m-6 12h6m-8-6h10"
                    />
                </svg>
            ),
        },
    ];
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
            <div data-testid="composer-settings-row" className="mb-3 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    data-testid="composer-settings-button"
                    aria-label={t('workspaceSheetTitleGenerationSettings')}
                    onClick={onOpenSettings}
                    className="nbu-inline-panel group flex min-h-10 min-w-0 flex-1 items-center overflow-hidden rounded-[20px] px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                    <div className="nbu-scrollbar-subtle -mx-0.5 min-w-0 flex-1 overflow-x-auto pb-0">
                        <div className="inline-flex min-w-max items-center gap-1.5 px-0.5">
                            <span className={summaryStripAnchorClassName}>{t('workspaceSheetTitleGenerationSettings')}</span>
                            {settingsSummaryItems.map((item) => (
                                <span key={item.key} className={`${summaryStripChipClassName} ${item.className}`.trim()}>
                                    {item.value}
                                </span>
                            ))}
                        </div>
                    </div>
                </button>
                {followUpSourceSummary && (
                    <div
                        data-testid="composer-follow-up-source-strip"
                        className="nbu-inline-panel flex h-10 w-full min-w-0 items-center gap-2 overflow-hidden rounded-[20px] px-2.5 sm:w-auto sm:max-w-[18rem]"
                    >
                        <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-slate-200/80 bg-white/92 px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/88 dark:text-slate-200">
                            {t('composerFollowUpSource')}
                        </span>
                        <span className="inline-flex h-6 min-w-0 flex-1 items-center rounded-full border border-slate-200/80 bg-white/88 px-2 text-[10px] font-semibold leading-none text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200">
                            <span className="truncate">{followUpSourceSummary}</span>
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 lg:grid-cols-[76px_minmax(0,1fr)_240px] xl:grid-cols-[76px_minmax(0,1fr)_270px]">
                <div data-testid="composer-quick-tools" className="grid gap-2 self-start">
                    {quickToolButtons.map((button) => (
                        <button
                            key={button.id}
                            type="button"
                            onClick={button.onClick}
                            disabled={button.disabled}
                            title={button.label}
                            aria-label={button.label}
                            className={`${quickToolButtonClassName} ${button.disabled ? 'opacity-50' : ''}`}
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100/80 text-amber-700 transition-colors group-hover:bg-amber-200 dark:bg-amber-500/12 dark:text-amber-200 dark:group-hover:bg-amber-500/20">
                                {button.icon}
                            </span>
                            <span className="leading-tight">{button.label}</span>
                        </button>
                    ))}
                </div>

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
                        <div className="mt-2.5 space-y-2">
                            <button
                                type="button"
                                data-testid="composer-advanced-settings-button"
                                aria-label={t('composerToolbarAdvancedSettings')}
                                aria-haspopup="dialog"
                                aria-expanded={isAdvancedSettingsOpen}
                                onClick={onToggleAdvancedSettings}
                                className="nbu-inline-panel group flex min-h-10 w-full min-w-0 items-center overflow-hidden rounded-[20px] px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <div className="nbu-scrollbar-subtle -mx-0.5 min-w-0 flex-1 overflow-x-auto pb-0">
                                    <div className="inline-flex min-w-max items-center gap-1.5 px-0.5">
                                        <span className={summaryStripAnchorClassName}>{t('composerToolbarAdvancedSettings')}</span>
                                        {advancedSummaryItems.map((item) => (
                                            <span
                                                key={item.key}
                                                className={`${summaryStripChipClassName} ${item.className}`.trim()}
                                            >
                                                {item.value}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                        <button onClick={onToggleEnterToSubmit} className="nbu-control-button px-3 py-1.5 lg:hidden">
                            {enterToSubmit ? t('composerEnterSends') : t('composerEnterNewline')}
                        </button>
                    </div>
                </div>

                <div className="col-span-2 nbu-floating-panel p-2.5 text-slate-900 dark:text-white lg:col-span-1">
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
