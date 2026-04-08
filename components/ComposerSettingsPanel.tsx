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
import {
    isQueuedBatchJobActive,
    isQueuedBatchJobAutoImportReady,
    isQueuedBatchJobClosedIssue,
} from '../utils/queuedBatchJobs';

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
    onClearStyle?: () => void;
    imageToolsPanel?: React.ReactNode;
};

const renderClearIcon = () => (
    <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
    </svg>
);

const renderDismissIcon = () => (
    <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-3.5 w-3.5"
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
);

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
    onClearStyle,
    imageToolsPanel,
}: ComposerSettingsPanelProps) {
    const fallbackPromptTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const resolvedPromptTextareaRef = promptTextareaRef ?? fallbackPromptTextareaRef;
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
        'nbu-control-button group flex min-h-[58px] w-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[20px] border-slate-200/85 bg-white/92 px-1.5 py-2 text-center text-[10px] font-semibold leading-[1.1] tracking-normal text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300/70 hover:bg-white hover:text-amber-700 hover:shadow-md disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-900/94 dark:text-slate-200 dark:shadow-none dark:hover:border-amber-400/35 dark:hover:bg-slate-900 dark:hover:text-amber-100 md:min-h-[42px] md:flex-row md:justify-start md:gap-1.5 md:px-2.5 md:py-1.5 md:text-left md:text-[10px]';
    const quickToolIconClassName =
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent bg-amber-100/80 text-amber-700 transition-colors group-hover:bg-amber-200 dark:border-amber-200/30 dark:bg-amber-400/95 dark:text-amber-50 dark:shadow-[0_10px_28px_rgba(0,0,0,0.32)] dark:group-hover:border-amber-100/45 dark:group-hover:bg-amber-500/92 dark:group-hover:text-white md:h-7 md:w-7';
    const quickToolLabelClassName = 'block max-w-full leading-[1.1] tracking-normal md:min-w-0 md:flex-1 md:truncate';
    const compactModelLabel = modelLabel.replace(/\s*\([^)]*\)$/, '');
    const normalizedStyleLabel = imageStyleLabel.trim();
    const displayedStyleLabel = normalizedStyleLabel.length > 0 ? normalizedStyleLabel : t('styleNone');
    const hasActiveStyle = displayedStyleLabel !== t('styleNone');
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
            key: 'temperature',
            value: `${t('groundingProvenanceInsightTemperature')}: ${temperature.toFixed(1)}`,
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
    const summaryStripContentClassName = 'flex min-w-0 flex-1 flex-wrap items-center gap-1.5';
    const quickToolButtons = [
        {
            id: 'inspiration',
            label: t('workspacePickerInspiration'),
            onClick: onSurpriseMe,
            disabled: isEnhancingPrompt,
            icon: (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M12 4.5 13.75 8.25 17.5 10 13.75 11.75 12 15.5l-1.75-3.75L6.5 10l3.75-1.75L12 4.5Z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M18.5 4.75v3m1.5-1.5h-3" />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M5.25 16.25v2.5m1.25-1.25H4"
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
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="m6.5 18.5 3.25-.75L17 10.5 14.5 8l-7.25 7.25-.75 3.25Z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="m13.75 8.75 2.5 2.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M6 6.25h2.5M7.25 5v2.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M16 16.5h3m-1.5-1.5v3" />
                </svg>
            ),
        },
        {
            id: 'templates',
            label: t('workspaceSheetTitleTemplates'),
            onClick: onOpenTemplates,
            icon: (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M7.25 5.5H17a1.75 1.75 0 0 1 1.75 1.75V17A1.75 1.75 0 0 1 17 18.75H7.25A1.75 1.75 0 0 1 5.5 17V7.25A1.75 1.75 0 0 1 7.25 5.5Z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M9.75 3.75h6.5A1.5 1.5 0 0 1 17.75 5.25v6.5"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M8.5 9h6.75M8.5 12h5.75M8.5 15h3.75"
                    />
                </svg>
            ),
        },
        {
            id: 'history',
            label: t('workspacePickerPromptHistoryTitle'),
            onClick: onOpenPromptHistory,
            icon: (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 8v4l2.5 2.25" />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M20 12a8 8 0 1 1-2.35-5.65"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M20 5v4.5h-4.5" />
                </svg>
            ),
        },
    ];

    const handleClearPrompt = () => {
        onPromptChange('');
        resolvedPromptTextareaRef.current?.focus();
    };
    const showGroundingResolutionWarning =
        imageModel === 'gemini-3.1-flash-image-preview' &&
        (groundingMode === 'image-search' || groundingMode === 'google-search-plus-image-search');
    const groundingGuideRows = [
        t('composerAdvancedGroundingGuideFlashGoogle'),
        t('composerAdvancedGroundingGuideFlashImage'),
        t('composerAdvancedGroundingGuideProGoogle'),
    ];
    const runningQueueCount = queuedJobs.filter(isQueuedBatchJobActive).length;
    const importReadyQueueCount = queuedJobs.filter(isQueuedBatchJobAutoImportReady).length;
    const issueQueueCount = queuedJobs.filter(isQueuedBatchJobClosedIssue).length;
    const trackedQueueCount = queuedJobs.length;
    const settledQueueCount = trackedQueueCount - runningQueueCount;
    const queueProgressPercent =
        trackedQueueCount > 0
            ? Math.max(0, Math.min(100, Math.round((settledQueueCount / trackedQueueCount) * 100)))
            : 0;

    return (
        <section
            data-testid="composer-settings-panel"
            className="nbu-shell-panel nbu-shell-surface-composer-dock shrink-0 p-3 md:p-4"
        >
            <div data-testid="composer-settings-row" className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <button
                    type="button"
                    data-testid="composer-settings-button"
                    aria-label={t('workspaceSheetTitleGenerationSettings')}
                    onClick={onOpenSettings}
                    className="nbu-inline-panel group flex min-h-10 min-w-0 flex-1 items-center overflow-hidden rounded-[20px] px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                    <div className={summaryStripContentClassName}>
                        <span className={summaryStripAnchorClassName}>
                            {t('workspaceSheetTitleGenerationSettings')}
                        </span>
                        {settingsSummaryItems.map((item) => (
                            <span key={item.key} className={`${summaryStripChipClassName} ${item.className}`.trim()}>
                                {item.value}
                            </span>
                        ))}
                    </div>
                </button>
                <div
                    data-testid="composer-style-strip"
                    className="nbu-inline-panel flex h-10 w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-[20px] px-2.5 sm:w-auto sm:max-w-[16rem]"
                >
                    <button
                        type="button"
                        data-testid="composer-style-button"
                        aria-label={t('workspaceSheetTitleStyles')}
                        onClick={onOpenStyles}
                        className="group flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left"
                    >
                        <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-fuchsia-200/90 bg-fuchsia-50 px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-700 dark:border-fuchsia-500/25 dark:bg-fuchsia-950/25 dark:text-fuchsia-200">
                            {t('workspaceViewerStyle')}
                        </span>
                        <span className="inline-flex h-6 min-w-0 flex-1 items-center rounded-full border border-fuchsia-200/80 bg-fuchsia-50/80 px-2 text-[10px] font-semibold leading-none text-fuchsia-700 transition-colors group-hover:border-fuchsia-300/90 group-hover:bg-fuchsia-100/80 dark:border-fuchsia-500/25 dark:bg-fuchsia-950/20 dark:text-fuchsia-100 dark:group-hover:border-fuchsia-400/35 dark:group-hover:bg-fuchsia-950/35">
                            <span className="truncate">{displayedStyleLabel}</span>
                        </span>
                    </button>
                    {hasActiveStyle && onClearStyle && (
                        <button
                            type="button"
                            data-testid="composer-style-clear"
                            aria-label={`${t('clear')} ${t('workspaceViewerStyle')}`}
                            title={`${t('clear')} ${t('workspaceViewerStyle')}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onClearStyle();
                            }}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-fuchsia-200/90 bg-fuchsia-50/90 text-fuchsia-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-fuchsia-500/25 dark:bg-fuchsia-950/25 dark:text-fuchsia-100 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
                        >
                            {renderDismissIcon()}
                        </button>
                    )}
                </div>
                {followUpSourceSummary && (
                    <div
                        data-testid="composer-follow-up-source-strip"
                        className="nbu-inline-panel flex h-10 w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-[20px] px-2.5 sm:w-auto sm:max-w-[18rem]"
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

            <div className="grid gap-1.5 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_240px] xl:grid-cols-[minmax(300px,320px)_minmax(0,1fr)_270px]">
                <div data-testid="composer-image-tools-slot" className="order-1 min-w-0">
                    {imageToolsPanel ?? null}
                </div>

                <div className="order-2 min-w-0">
                    <div className="nbu-subpanel overflow-hidden p-2.5">
                        <div className="mb-1.5 flex flex-wrap items-start justify-between gap-1.5 px-1">
                            <div>
                                <h3 className="text-[15px] font-black text-slate-900 dark:text-slate-100">
                                    {t('promptLabel')}
                                </h3>
                            </div>
                            <button onClick={onToggleEnterToSubmit} className="nbu-chip">
                                {enterToSubmit ? t('composerEnterSends') : t('composerEnterNewline')}
                            </button>
                        </div>
                        <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-1.5 md:grid-cols-[8.25rem_minmax(0,1fr)] xl:grid-cols-[8.25rem_minmax(0,1fr)]">
                            <div data-testid="composer-quick-tools" className="grid gap-1.5 self-start md:gap-2">
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
                                        <span className={quickToolIconClassName}>{button.icon}</span>
                                        <span className={quickToolLabelClassName}>{button.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="min-w-0 space-y-1.5">
                                <div className="relative">
                                    <textarea
                                        ref={resolvedPromptTextareaRef}
                                        className="nbu-composer-dock-textarea nbu-scrollbar-subtle h-36 w-full resize-none overflow-y-auto rounded-[26px] border px-4 py-3.5 pr-12 text-sm leading-6 outline-none transition-all focus:ring-4 focus:ring-amber-100/70 dark:focus:ring-amber-500/10"
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
                                    <button
                                        type="button"
                                        data-testid="composer-prompt-clear"
                                        aria-label={t('clear')}
                                        title={t('clear')}
                                        disabled={prompt.length === 0}
                                        onClick={handleClearPrompt}
                                        className="absolute right-3 top-3 rounded-full border border-slate-200/80 bg-white/92 p-2 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-500 dark:hover:border-red-900/40 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                                    >
                                        {renderClearIcon()}
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    <button
                                        type="button"
                                        data-testid="composer-advanced-settings-button"
                                        aria-label={t('composerToolbarAdvancedSettings')}
                                        aria-haspopup="dialog"
                                        aria-expanded={isAdvancedSettingsOpen}
                                        onClick={onToggleAdvancedSettings}
                                        className="nbu-inline-panel group flex min-h-10 w-full min-w-0 items-center overflow-hidden rounded-[20px] px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                        <div className={summaryStripContentClassName}>
                                            <span className={summaryStripAnchorClassName}>
                                                {t('composerToolbarAdvancedSettings')}
                                            </span>
                                            {advancedSummaryItems.map((item) => (
                                                <span
                                                    key={item.key}
                                                    className={`${summaryStripChipClassName} ${item.className}`.trim()}
                                                >
                                                    {item.value}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <button onClick={onToggleEnterToSubmit} className="nbu-control-button px-3 py-1.5 lg:hidden">
                            {enterToSubmit ? t('composerEnterSends') : t('composerEnterNewline')}
                        </button>
                    </div>
                </div>

                <div className="order-3 min-w-0 nbu-floating-panel p-2.5 text-slate-900 dark:text-white">
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
                        <div className="mt-1.5 flex items-center gap-1.5">
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
                    <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
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
            <button
                type="button"
                aria-haspopup="dialog"
                data-testid="composer-queue-status-button"
                onClick={onOpenQueuedBatchJobs}
                className="nbu-inline-panel mt-1.5 flex w-full items-center gap-1.5 px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            {t('queuedBatchJobsTitle')}
                        </span>
                        <span className="nbu-chip">
                            {t('queuedBatchJobsTrackedCount').replace('{0}', trackedQueueCount.toString())}
                        </span>
                    </div>
                    <div
                        data-testid="composer-queue-status-progress"
                        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/80"
                    >
                        <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(245,158,11,0.95),rgba(16,185,129,0.95))] transition-all duration-300"
                            style={{ width: `${queueProgressPercent}%` }}
                        />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
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
        </section>
    );
}

export default React.memo(ComposerSettingsPanel);
