import React from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import InfoTooltip from './InfoTooltip';
import { useAnchoredFloatingPlacement } from '../hooks/useAnchoredFloatingPlacement';
import { MODEL_CAPABILITIES, OUTPUT_FORMATS, THINKING_LEVELS } from '../constants';
import { getGroundingModeLabel } from '../utils/groundingMode';
import { getTranslation, Language } from '../utils/translations';
import { useWorkspaceFloatingLayer } from './WorkspaceFloatingLayerContext';
import {
    AspectRatio,
    GeneratedImage,
    GroundingMode,
    ImageModel,
    ImageSize,
    OutputFormat,
    QueuedBatchJob,
    StageAsset,
    StickySendIntent,
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
    activePromptTool?: 'image-to-prompt' | 'inspiration' | 'rewrite' | null;
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
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    groundingMode: GroundingMode;
    stickySendIntent: StickySendIntent;
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
    onStickySendIntentChange: (value: StickySendIntent) => void;
    onToggleEnterToSubmit: () => void;
    onGenerate: () => void;
    onQueueBatchJob: () => void;
    onOpenQueuedBatchJobs: () => void;
    onCancelGeneration: () => void;
    onStartNewConversation: () => void;
    onFollowUpGenerate: () => void;
    onSurpriseMe: () => void;
    onSmartRewrite: () => void;
    onImageToPrompt?: (file: File) => void | Promise<void>;
    onOpenStyles: () => void;
    onOpenSettings: () => void;
    onOpenModelPicker?: () => void;
    onOpenRatioPicker?: () => void;
    onOpenSizePicker?: () => void;
    onOpenBatchPicker?: () => void;
    onToggleAdvancedSettings: () => void;
    onOutputFormatChange: (value: OutputFormat) => void;
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

type ActivePromptTool = NonNullable<ComposerSettingsPanelProps['activePromptTool']>;
type QuickToolButton = {
    id: ActivePromptTool;
    label: string;
    onClick: () => void;
    disabled: boolean;
    icon: React.ReactNode;
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

const renderInfoIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 8v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="5.6" r="0.9" fill="currentColor" />
    </svg>
);

const SEND_INTENT_INFO_AUTO_CLOSE_MS = 3200;

function ComposerSettingsPanel({
    prompt,
    placeholder,
    enterToSubmit,
    isGenerating,
    isEnhancingPrompt,
    activePromptTool,
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
    thinkingLevel,
    groundingMode,
    stickySendIntent = 'independent',
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
    onStickySendIntentChange,
    onToggleEnterToSubmit,
    onGenerate,
    onQueueBatchJob,
    onOpenQueuedBatchJobs,
    onCancelGeneration,
    onStartNewConversation,
    onFollowUpGenerate,
    onSurpriseMe,
    onSmartRewrite,
    onImageToPrompt,
    onOpenStyles,
    onOpenSettings,
    onToggleAdvancedSettings,
    onOutputFormatChange,
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
    const imageToPromptInputRef = React.useRef<HTMLInputElement | null>(null);
    const resolvedPromptTextareaRef = promptTextareaRef ?? fallbackPromptTextareaRef;
    const sendIntentInfoCardId = React.useId();
    const sendIntentInfoRootRef = React.useRef<HTMLDivElement | null>(null);
    const sendIntentInfoPanelRef = React.useRef<HTMLDivElement | null>(null);
    const sendIntentInfoAutoCloseTimerRef = React.useRef<number | null>(null);
    const workspaceFloatingLayer = useWorkspaceFloatingLayer();
    const usesWorkspaceFloatingLayer = Boolean(workspaceFloatingLayer?.hostElement);
    const [sendIntentInfoOpen, setSendIntentInfoOpen] = React.useState(false);
    const [sendIntentInfoVariant, setSendIntentInfoVariant] = React.useState<StickySendIntent | 'memory-unavailable'>(
        stickySendIntent,
    );
    const t = (key: string) => getTranslation(currentLanguage, key);
    const resolveIntentText = (key: string, fallback: string) => {
        const value = t(key);
        return value === key ? fallback : value;
    };
    const sendIntentAriaLabelPrefix = resolveIntentText(
        'workspaceTopHeaderSendIntent',
        resolveIntentText('composerSendIntentTitle', 'Send'),
    );
    const independentSendIntentLabel = resolveIntentText(
        'workspaceSendIntentIndependent',
        t('workspaceViewerNewConversation'),
    );
    const memorySendIntentLabel = resolveIntentText('workspaceSendIntentMemory', t('workspaceViewerFollowUpEdit'));
    const independentSendIntentButtonLabel = resolveIntentText(
        'composerSendIntentIndependent',
        independentSendIntentLabel,
    );
    const memorySendIntentButtonLabel = resolveIntentText('composerSendIntentMemory', memorySendIntentLabel);
    const promptSurfaceLabel =
        stickySendIntent === 'memory'
            ? resolveIntentText('composerPromptLabelMemory', t('promptLabel'))
            : resolveIntentText('composerPromptLabelIndependent', t('promptLabel'));
    const promptSurfacePlaceholder =
        stickySendIntent === 'memory'
            ? resolveIntentText('composerPromptPlaceholderMemory', placeholder)
            : resolveIntentText('composerPromptPlaceholderIndependent', placeholder);
    const independentSendIntentHelp = resolveIntentText(
        'composerSendIntentHelperIndependent',
        independentSendIntentButtonLabel,
    );
    const memorySendIntentHelp = resolveIntentText('composerSendIntentHelperMemory', memorySendIntentButtonLabel);
    const memorySendIntentTokenNotice = resolveIntentText(
        'composerSendIntentMemoryTokenNotice',
        'Remembered context increases token usage.',
    );
    const sendIntentInfoButtonLabel = resolveIntentText('composerSendIntentInfoButton', t('workspacePanelViewDetails'));
    const imageToPromptLabel = resolveIntentText('composerPromptToolImageToPrompt', 'Image to Prompt');
    const surpriseMeLabel = resolveIntentText('composerPromptToolSurpriseMe', 'Surprise Me');
    const autoRewriteLabel = resolveIntentText('composerPromptToolAutoRewrite', 'Auto Rewrite');
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
    const promptToolButtonClassName =
        'nbu-control-button group flex min-h-[42px] w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-[18px] border-slate-200/85 bg-white/92 px-3 py-2 text-center text-[11px] font-semibold tracking-normal text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300/70 hover:bg-white hover:text-amber-700 hover:shadow-md disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-900/94 dark:text-slate-200 dark:shadow-none dark:hover:border-amber-400/35 dark:hover:bg-slate-900 dark:hover:text-amber-100';
    const promptToolIconClassName =
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent bg-amber-100/80 text-amber-700 transition-colors group-hover:bg-amber-200 dark:border-amber-200/30 dark:bg-amber-400/95 dark:text-amber-50 dark:shadow-[0_10px_28px_rgba(0,0,0,0.32)] dark:group-hover:border-amber-100/45 dark:group-hover:bg-amber-500/92 dark:group-hover:text-white';
    const promptToolLabelClassName = 'block min-w-0 truncate leading-[1.1] tracking-normal';
    const newConversationButtonClassName =
        'inline-flex items-center justify-center rounded-full border border-red-200/80 bg-red-50/90 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:border-red-800 dark:hover:bg-red-950/50 dark:focus:ring-red-900/40';
    const compactModelLabel = modelLabel.replace(/\s*\([^)]*\)$/, '');
    const normalizedStyleLabel = imageStyleLabel.trim();
    const displayedStyleLabel = normalizedStyleLabel.length > 0 ? normalizedStyleLabel : t('styleNone');
    const hasActiveStyle = displayedStyleLabel !== t('styleNone');
    const composerStyleLabelClassName = hasActiveStyle
        ? 'inline-flex h-6 shrink-0 items-center rounded-full border border-fuchsia-200/90 bg-fuchsia-50 px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-700 dark:border-fuchsia-500/25 dark:bg-fuchsia-950/25 dark:text-fuchsia-200'
        : 'inline-flex h-6 shrink-0 items-center rounded-full border border-slate-200/85 bg-slate-100/90 px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/85 dark:text-slate-400';
    const composerStyleValueClassName = hasActiveStyle
        ? 'inline-flex h-6 min-w-0 flex-1 items-center rounded-full border border-fuchsia-200/80 bg-fuchsia-50/80 px-2 text-[10px] font-semibold leading-none text-fuchsia-700 transition-colors group-hover:border-fuchsia-300/90 group-hover:bg-fuchsia-100/80 dark:border-fuchsia-500/25 dark:bg-fuchsia-950/20 dark:text-fuchsia-100 dark:group-hover:border-fuchsia-400/35 dark:group-hover:bg-fuchsia-950/35'
        : 'inline-flex h-6 min-w-0 flex-1 items-center rounded-full border border-slate-200/80 bg-slate-100/85 px-2 text-[10px] font-semibold leading-none text-slate-500 transition-colors group-hover:border-slate-300/85 group-hover:bg-slate-100/95 group-hover:text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-400 dark:group-hover:border-slate-600/80 dark:group-hover:bg-slate-900/95 dark:group-hover:text-slate-300';
    const canUseMemorySendIntent = batchSize === 1;
    const enterBehaviorSendLabel = t('composerEnterSends');
    const enterBehaviorNewlineLabel = t('composerEnterNewline');
    const enterBehaviorToggleAriaLabel = enterToSubmit
        ? `${enterBehaviorSendLabel}. ${enterBehaviorNewlineLabel}.`
        : `${enterBehaviorNewlineLabel}. ${enterBehaviorSendLabel}.`;
    const sendIntentDisabledReason = !canUseMemorySendIntent
        ? resolveIntentText(
              'composerSendIntentDisabledReason',
              queueBatchConversationNotice || memorySendIntentButtonLabel,
          )
        : null;
    const clearSendIntentInfoAutoClose = React.useCallback(() => {
        if (sendIntentInfoAutoCloseTimerRef.current !== null) {
            window.clearTimeout(sendIntentInfoAutoCloseTimerRef.current);
            sendIntentInfoAutoCloseTimerRef.current = null;
        }
    }, []);
    const isWithinSendIntentInfoBoundary = React.useCallback((target: EventTarget | null) => {
        const targetNode = target as Node | null;

        if (!targetNode) {
            return false;
        }

        return Boolean(
            sendIntentInfoRootRef.current?.contains(targetNode) || sendIntentInfoPanelRef.current?.contains(targetNode),
        );
    }, []);
    const closeSendIntentInfoCard = React.useCallback(() => {
        clearSendIntentInfoAutoClose();
        setSendIntentInfoOpen(false);
    }, [clearSendIntentInfoAutoClose]);
    const openSendIntentInfoCard = React.useCallback(
        (variant: StickySendIntent | 'memory-unavailable', mode: 'auto' | 'manual') => {
            clearSendIntentInfoAutoClose();
            setSendIntentInfoVariant(variant);
            setSendIntentInfoOpen(true);
            if (mode === 'auto') {
                sendIntentInfoAutoCloseTimerRef.current = window.setTimeout(() => {
                    setSendIntentInfoOpen(false);
                    sendIntentInfoAutoCloseTimerRef.current = null;
                }, SEND_INTENT_INFO_AUTO_CLOSE_MS);
            }
        },
        [clearSendIntentInfoAutoClose],
    );
    React.useEffect(() => () => clearSendIntentInfoAutoClose(), [clearSendIntentInfoAutoClose]);
    React.useEffect(() => {
        if (!sendIntentInfoOpen) {
            return undefined;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!isWithinSendIntentInfoBoundary(event.target)) {
                closeSendIntentInfoCard();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closeSendIntentInfoCard();
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [closeSendIntentInfoCard, isWithinSendIntentInfoBoundary, sendIntentInfoOpen]);
    const sendIntentInfoTitle =
        sendIntentInfoVariant === 'memory' || sendIntentInfoVariant === 'memory-unavailable'
            ? memorySendIntentButtonLabel
            : independentSendIntentButtonLabel;
    const sendIntentInfoBody =
        sendIntentInfoVariant === 'memory' || sendIntentInfoVariant === 'memory-unavailable'
            ? memorySendIntentHelp
            : independentSendIntentHelp;
    const sendIntentInfoNote =
        sendIntentInfoVariant === 'memory' || sendIntentInfoVariant === 'memory-unavailable'
            ? memorySendIntentTokenNotice
            : null;
    const sendIntentInfoReason = sendIntentInfoVariant === 'memory-unavailable' ? sendIntentDisabledReason : null;
    const handleSendIntentInfoButtonClick = () => {
        if (sendIntentInfoOpen) {
            closeSendIntentInfoCard();
            return;
        }
        openSendIntentInfoCard(stickySendIntent, 'manual');
    };
    const handleSendIntentToggle = () => {
        if (stickySendIntent === 'memory') {
            onStickySendIntentChange('independent');
            openSendIntentInfoCard('independent', 'auto');
            return;
        }

        if (!canUseMemorySendIntent) {
            openSendIntentInfoCard('memory-unavailable', 'auto');
            return;
        }

        onStickySendIntentChange('memory');
        openSendIntentInfoCard('memory', 'auto');
    };
    const sendIntentToggleAriaLabel =
        stickySendIntent === 'memory'
            ? `${sendIntentAriaLabelPrefix}: ${memorySendIntentButtonLabel}. ${independentSendIntentButtonLabel}.`
            : canUseMemorySendIntent
              ? `${sendIntentAriaLabelPrefix}: ${independentSendIntentButtonLabel}. ${memorySendIntentButtonLabel}.`
              : `${sendIntentAriaLabelPrefix}: ${independentSendIntentButtonLabel}. ${sendIntentDisabledReason ?? memorySendIntentButtonLabel}.`;
    const { floatingStyle: sendIntentInfoFloatingStyle } = useAnchoredFloatingPlacement({
        anchorRef: sendIntentInfoRootRef,
        autoAdjustHorizontal: true,
        autoAdjustVertical: true,
        isOpen: sendIntentInfoOpen && usesWorkspaceFloatingLayer,
        panelRef: sendIntentInfoPanelRef,
        preferredHorizontalPlacement: 'end',
        preferredVerticalPlacement: 'top',
    });
    const showStartNewConversationAction = stickySendIntent === 'memory';
    const followUpSourceSummary = currentStageAsset
        ? `${getStageOriginLabel(currentStageAsset.origin)}${currentStageAsset.lineageAction ? ` · ${getLineageActionLabel(currentStageAsset.lineageAction)}` : ''}`
        : null;
    const hasStageSourceForContinuation = Boolean(currentStageAsset);
    const followUpGenerateLabel = t('stageActionContinueFromHere');
    const followUpGenerateAriaLabel = followUpSourceSummary
        ? `${followUpGenerateLabel}. ${t('composerFollowUpSource')}: ${followUpSourceSummary}.`
        : followUpGenerateLabel;
    const followUpGenerateDisabled = !currentStageAsset || isGenerating;
    const followUpGenerateTitle = currentStageAsset
        ? followUpSourceSummary
            ? `${t('composerFollowUpSource')}: ${followUpSourceSummary}`
            : undefined
        : t('followUpEditRequiresStageImage');
    const primaryGenerateLabel = hasStageSourceForContinuation ? followUpGenerateLabel : generateLabel;
    const primaryGenerateAriaLabel = hasStageSourceForContinuation ? followUpGenerateAriaLabel : generateLabel;
    const primaryGenerateTitle = hasStageSourceForContinuation ? followUpGenerateTitle : undefined;
    const handlePrimaryGenerate = hasStageSourceForContinuation ? onFollowUpGenerate : onGenerate;
    const showSecondaryGenerateButton = !isGenerating && hasStageSourceForContinuation;
    const supportsThinkingLevelControl = capability.thinkingLevels.some((level) => level !== 'disabled');
    const hasGroundingControl = availableGroundingModes.length > 1;
    const sendIntentInfoPanelNode = sendIntentInfoOpen ? (
        <div
            ref={sendIntentInfoPanelRef}
            id={sendIntentInfoCardId}
            role="dialog"
            aria-label={sendIntentInfoTitle}
            aria-hidden={!sendIntentInfoOpen}
            data-testid="composer-sticky-send-intent-info-card"
            data-placement-horizontal="end"
            data-placement-vertical="top"
            className={
                usesWorkspaceFloatingLayer
                    ? 'pointer-events-auto w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/90 bg-white px-3 py-3 text-left shadow-[0_18px_45px_rgba(15,23,42,0.14)] dark:border-slate-700/90 dark:bg-slate-950 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]'
                    : 'absolute right-0 bottom-full z-40 mb-2 w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/90 bg-white px-3 py-3 text-left shadow-[0_18px_45px_rgba(15,23,42,0.14)] dark:border-slate-700/90 dark:bg-slate-950 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)]'
            }
            style={
                usesWorkspaceFloatingLayer
                    ? {
                          ...sendIntentInfoFloatingStyle,
                          zIndex: workspaceFloatingLayer?.floatingZIndex,
                      }
                    : undefined
            }
        >
            <div
                data-testid="composer-sticky-send-intent-info-title"
                className="inline-flex rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950"
            >
                {sendIntentInfoTitle}
            </div>
            <div
                data-testid="composer-sticky-send-intent-info-body"
                className="mt-2 text-[11px] leading-5 text-slate-700 dark:text-slate-200"
            >
                {sendIntentInfoBody}
            </div>
            {sendIntentInfoNote && (
                <div
                    data-testid="composer-sticky-send-intent-info-note"
                    className="mt-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-[11px] leading-4 text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300"
                >
                    {sendIntentInfoNote}
                </div>
            )}
            {sendIntentInfoReason && (
                <div
                    data-testid="composer-sticky-send-intent-info-reason"
                    className="mt-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[11px] leading-4 text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-100"
                >
                    {sendIntentInfoReason}
                </div>
            )}
        </div>
    ) : null;
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
        ...(capability.outputFormats.length > 1
            ? [
                  {
                      key: 'output',
                      value: `${t('groundingProvenanceInsightOutputFormat')}: ${getOutputFormatSummaryLabel(outputFormat)}`,
                      className: '',
                  },
              ]
            : []),
        ...(capability.supportsTemperature
            ? [
                  {
                      key: 'temperature',
                      value: `${t('groundingProvenanceInsightTemperature')}: ${temperature.toFixed(1)}`,
                      className: '',
                  },
              ]
            : []),
        ...(supportsThinkingLevelControl
            ? [
                  {
                      key: 'thinking',
                      value: `${t('groundingProvenanceInsightThinkingLevel')}: ${getThinkingLevelSummaryLabel(thinkingLevel)}`,
                      className: '',
                  },
              ]
            : []),
        ...(hasGroundingControl && groundingMode !== 'off'
            ? [
                  {
                      key: 'grounding',
                      value: `${t('groundingProvenanceInsightGrounding')}: ${getGroundingModeSummaryLabel(groundingMode)}`,
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
    const handleImageToPromptButtonClick = () => {
        if (!onImageToPrompt || isEnhancingPrompt) {
            return;
        }

        imageToPromptInputRef.current?.click();
    };
    const handleImageToPromptInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file || !onImageToPrompt) {
            return;
        }

        void Promise.resolve(onImageToPrompt(file));
    };
    const quickToolButtons: QuickToolButton[] = [
        {
            id: 'image-to-prompt',
            label: imageToPromptLabel,
            onClick: handleImageToPromptButtonClick,
            disabled: isEnhancingPrompt || !onImageToPrompt,
            icon: (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M4.75 7.75A2.75 2.75 0 0 1 7.5 5h9A2.75 2.75 0 0 1 19.25 7.75v8.5A2.75 2.75 0 0 1 16.5 19h-9a2.75 2.75 0 0 1-2.75-2.75v-8.5Z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M8 14.75l2.5-2.5 1.75 1.75 3-3 2.25 2.25"
                    />
                    <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                </svg>
            ),
        },
        {
            id: 'inspiration',
            label: surpriseMeLabel,
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
            label: autoRewriteLabel,
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
    ];

    const renderQuickToolSpinner = (buttonId: ActivePromptTool) => (
        <svg
            data-testid={`composer-quick-tool-spinner-${buttonId}`}
            className="h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"
            />
        </svg>
    );

    const handleClearPrompt = () => {
        onPromptChange('');
        resolvedPromptTextareaRef.current?.focus();
    };
    const runningQueueCount = queuedJobs.filter(isQueuedBatchJobActive).length;
    const importReadyQueueCount = queuedJobs.filter(isQueuedBatchJobAutoImportReady).length;
    const issueQueueCount = queuedJobs.filter(isQueuedBatchJobClosedIssue).length;
    const trackedQueueCount = queuedJobs.length;
    const settledQueueCount = trackedQueueCount - runningQueueCount;
    const queueProgressPercent =
        trackedQueueCount > 0
            ? Math.max(0, Math.min(100, Math.round((settledQueueCount / trackedQueueCount) * 100)))
            : 0;
    const advancedSettingsButton = (
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
                <span className={summaryStripAnchorClassName}>{t('composerToolbarAdvancedSettings')}</span>
                {advancedSummaryItems.map((item) => (
                    <span key={item.key} className={`${summaryStripChipClassName} ${item.className}`.trim()}>
                        {item.value}
                    </span>
                ))}
            </div>
        </button>
    );

    return (
        <section
            data-testid="composer-settings-panel"
            className="nbu-shell-panel nbu-shell-surface-composer-dock shrink-0 p-3 md:p-4"
        >
            <div data-testid="composer-settings-row" className="mb-1.5 flex flex-wrap items-stretch gap-1.5">
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
                        <span className={composerStyleLabelClassName}>{t('workspaceViewerStyle')}</span>
                        <span className={composerStyleValueClassName}>
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
            </div>

            <div className="grid gap-1.5 lg:grid-cols-[minmax(220px,248px)_minmax(0,1fr)] xl:grid-cols-[minmax(232px,256px)_minmax(0,1fr)]">
                <div data-testid="composer-image-tools-slot" className="min-w-0">
                    {imageToolsPanel ?? null}
                </div>

                <div className="min-w-0">
                    <div className="nbu-subpanel overflow-hidden p-2.5">
                        <div className="mb-1.5 flex flex-wrap items-start justify-between gap-1.5 px-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <h3 className="text-[15px] font-black text-slate-900 dark:text-slate-100">
                                    {promptSurfaceLabel}
                                </h3>
                                {showStartNewConversationAction && (
                                    <button
                                        type="button"
                                        onClick={onStartNewConversation}
                                        disabled={isGenerating}
                                        className={newConversationButtonClassName}
                                    >
                                        {t('workspaceViewerNewConversation')}
                                    </button>
                                )}
                            </div>
                            <div
                                ref={sendIntentInfoRootRef}
                                data-testid="composer-sticky-send-intent"
                                className="relative flex min-w-0 max-w-full flex-1 items-center justify-end gap-1.5 sm:flex-none"
                            >
                                <button
                                    type="button"
                                    data-testid="composer-sticky-send-intent-toggle"
                                    data-active-intent={stickySendIntent}
                                    data-memory-available={canUseMemorySendIntent ? 'true' : 'false'}
                                    aria-label={sendIntentToggleAriaLabel}
                                    aria-pressed={stickySendIntent === 'memory'}
                                    onClick={handleSendIntentToggle}
                                    className="group relative grid min-w-0 flex-1 grid-cols-2 gap-1 rounded-full border border-slate-300/90 bg-slate-200/95 p-1 shadow-inner shadow-slate-300/70 transition-colors hover:border-slate-400/80 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30 sm:flex-none"
                                >
                                    <span
                                        data-testid="composer-sticky-send-intent-thumb"
                                        data-active-intent={stickySendIntent}
                                        aria-hidden="true"
                                        className={`pointer-events-none absolute bottom-1 top-1 rounded-full bg-amber-500 transition-all duration-200 ease-out dark:bg-amber-300 ${
                                            stickySendIntent === 'memory'
                                                ? 'left-[calc(50%+0.125rem)] right-1 shadow-[0_10px_24px_rgba(245,158,11,0.18)] dark:shadow-none'
                                                : 'left-1 right-[calc(50%+0.125rem)] shadow-[0_10px_24px_rgba(245,158,11,0.18)] dark:shadow-none'
                                        }`}
                                    />
                                    <span
                                        data-testid="composer-sticky-send-intent-independent"
                                        data-selected={stickySendIntent === 'independent' ? 'true' : 'false'}
                                        aria-hidden="true"
                                        className={`relative z-10 flex min-w-0 items-center justify-center rounded-full px-2 py-1.5 text-[10px] font-semibold leading-none transition-colors ${
                                            stickySendIntent === 'independent'
                                                ? 'text-white dark:text-slate-950'
                                                : 'text-slate-600 dark:text-slate-500'
                                        }`}
                                    >
                                        <span className="truncate">{independentSendIntentButtonLabel}</span>
                                    </span>
                                    <span
                                        data-testid="composer-sticky-send-intent-memory"
                                        data-selected={stickySendIntent === 'memory' ? 'true' : 'false'}
                                        data-available={canUseMemorySendIntent ? 'true' : 'false'}
                                        aria-hidden="true"
                                        className={`relative z-10 flex min-w-0 items-center justify-center rounded-full px-2 py-1.5 text-[10px] font-semibold leading-none transition-colors ${
                                            stickySendIntent === 'memory'
                                                ? 'text-white dark:text-slate-950'
                                                : canUseMemorySendIntent
                                                  ? 'text-slate-600 dark:text-slate-500'
                                                  : 'text-slate-500 dark:text-slate-600'
                                        }`}
                                    >
                                        <span className="truncate">{memorySendIntentButtonLabel}</span>
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    data-testid="composer-sticky-send-intent-info-trigger"
                                    aria-label={sendIntentInfoButtonLabel}
                                    aria-controls={sendIntentInfoOpen ? sendIntentInfoCardId : undefined}
                                    aria-expanded={sendIntentInfoOpen}
                                    aria-haspopup="dialog"
                                    title={sendIntentInfoButtonLabel}
                                    onClick={handleSendIntentInfoButtonClick}
                                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300/90 bg-slate-100/95 text-slate-600 transition-colors hover:border-amber-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-slate-700/90 dark:bg-slate-950 dark:text-slate-500 dark:hover:border-amber-400/40 dark:hover:text-slate-200"
                                >
                                    {renderInfoIcon()}
                                </button>
                                {usesWorkspaceFloatingLayer &&
                                workspaceFloatingLayer?.hostElement &&
                                sendIntentInfoPanelNode
                                    ? createPortal(sendIntentInfoPanelNode, workspaceFloatingLayer.hostElement)
                                    : sendIntentInfoPanelNode}
                            </div>
                        </div>
                        <div data-testid="composer-quick-tools" className="grid min-w-0 grid-cols-3 gap-1.5">
                            {quickToolButtons.map((button) => {
                                const isActiveTool = activePromptTool === button.id;

                                return (
                                    <button
                                        key={button.id}
                                        type="button"
                                        data-testid={`composer-quick-tool-${button.id}`}
                                        onClick={button.onClick}
                                        disabled={button.disabled}
                                        title={button.label}
                                        aria-label={button.label}
                                        className={`${promptToolButtonClassName} ${button.disabled ? 'opacity-50' : ''}`}
                                    >
                                        <span className={promptToolIconClassName}>
                                            {isActiveTool ? renderQuickToolSpinner(button.id) : button.icon}
                                        </span>
                                        <span className={promptToolLabelClassName}>{button.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <input
                            ref={imageToPromptInputRef}
                            data-testid="composer-image-to-prompt-input"
                            type="file"
                            accept="image/*"
                            tabIndex={-1}
                            className="sr-only"
                            onChange={handleImageToPromptInputChange}
                        />

                        <div className="mt-1.5 min-w-0 space-y-1.5">
                            <div className="relative">
                                <textarea
                                    ref={resolvedPromptTextareaRef}
                                    className="nbu-composer-dock-textarea nbu-scrollbar-subtle h-36 w-full resize-none overflow-y-auto rounded-[26px] border px-4 py-3.5 pr-12 text-sm leading-6 outline-none transition-all focus:ring-4 focus:ring-amber-100/70 dark:focus:ring-amber-500/10"
                                    placeholder={promptSurfacePlaceholder}
                                    value={prompt}
                                    onChange={(e) => onPromptChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (enterToSubmit && e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                                            e.preventDefault();
                                            handlePrimaryGenerate();
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
                            <div className="space-y-1.5">{advancedSettingsButton}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                data-testid="composer-generate-card"
                className="mt-1.5 min-w-0 nbu-floating-panel rounded-[30px] p-2 text-slate-900 dark:text-white"
            >
                <div className="grid gap-1.5 md:items-center md:grid-cols-[minmax(0,1fr)_minmax(0,208px)]">
                    <div
                        data-testid="composer-generate-actions"
                        className={`grid gap-1.5 ${showSecondaryGenerateButton ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)]' : 'sm:grid-cols-1'}`}
                    >
                        {isGenerating ? (
                            <Button
                                onClick={onCancelGeneration}
                                variant="danger"
                                className="min-h-[64px] rounded-[28px] text-[15px]"
                            >
                                {t('clearHistoryCancel')}
                            </Button>
                        ) : (
                            <Button
                                onClick={handlePrimaryGenerate}
                                aria-label={primaryGenerateAriaLabel}
                                title={primaryGenerateTitle}
                                className="btn-shimmer min-h-[64px] rounded-[28px] text-[15px]"
                            >
                                {primaryGenerateLabel}
                            </Button>
                        )}
                        {showSecondaryGenerateButton ? (
                            <Button
                                variant="secondary"
                                onClick={onGenerate}
                                className="min-h-[64px] min-w-0 rounded-[28px] px-3.5 text-[14px]"
                            >
                                {generateLabel}
                            </Button>
                        ) : null}
                    </div>

                    <div
                        data-testid="composer-enter-behavior-card"
                        className="flex min-w-0 justify-center md:self-center"
                    >
                        <button
                            type="button"
                            data-testid="composer-enter-behavior-toggle"
                            data-active-mode={enterToSubmit ? 'send' : 'newline'}
                            aria-label={enterBehaviorToggleAriaLabel}
                            aria-pressed={enterToSubmit}
                            onClick={onToggleEnterToSubmit}
                            className="group relative grid min-h-[56px] w-full max-w-[19rem] min-w-0 grid-rows-2 gap-1 overflow-hidden rounded-[24px] border border-slate-300/90 bg-slate-200/95 p-px text-left shadow-inner shadow-slate-300/70 transition-colors hover:border-slate-400/80 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30 md:max-w-none"
                        >
                            <span
                                data-testid="composer-enter-behavior-thumb"
                                data-active-mode={enterToSubmit ? 'send' : 'newline'}
                                aria-hidden="true"
                                className={`pointer-events-none absolute left-px right-px bg-amber-500 transition-all duration-200 ease-out dark:bg-amber-300 ${
                                    enterToSubmit
                                        ? 'top-px bottom-[calc(50%+0.125rem)] rounded-t-[23px] rounded-b-[4px] shadow-[0_10px_24px_rgba(245,158,11,0.18)] dark:shadow-none'
                                        : 'top-[calc(50%+0.125rem)] bottom-px rounded-t-[4px] rounded-b-[23px] shadow-[0_10px_24px_rgba(245,158,11,0.18)] dark:shadow-none'
                                }`}
                            />
                            <span
                                data-testid="composer-enter-behavior-send-option"
                                data-selected={enterToSubmit ? 'true' : 'false'}
                                aria-hidden="true"
                                className={`relative z-10 flex min-w-0 items-center justify-center rounded-t-[23px] rounded-b-[4px] px-2.5 py-1.5 text-center text-[11px] font-semibold leading-tight transition-colors ${
                                    enterToSubmit
                                        ? 'text-white dark:text-slate-950'
                                        : 'text-slate-600 dark:text-slate-500'
                                }`}
                            >
                                <span className="truncate">{enterBehaviorSendLabel}</span>
                            </span>
                            <span
                                data-testid="composer-enter-behavior-newline-option"
                                data-selected={enterToSubmit ? 'false' : 'true'}
                                aria-hidden="true"
                                className={`relative z-10 flex min-w-0 items-center justify-center rounded-t-[4px] rounded-b-[23px] px-2.5 py-1.5 text-center text-[11px] font-semibold leading-tight transition-colors ${
                                    enterToSubmit
                                        ? 'text-slate-600 dark:text-slate-500'
                                        : 'text-white dark:text-slate-950'
                                }`}
                            >
                                <span className="truncate">{enterBehaviorNewlineLabel}</span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div data-testid="composer-queue-row" className="nbu-subpanel mt-1.5 p-2.5">
                <div className="grid gap-1.5 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <Button
                            variant="secondary"
                            onClick={onQueueBatchJob}
                            disabled={isGenerating}
                            className="min-h-10 min-w-0 flex-1 rounded-[16px]"
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
                            preferredVerticalPlacement="top"
                            autoAdjust={true}
                        />
                    </div>

                    <button
                        type="button"
                        aria-haspopup="dialog"
                        data-testid="composer-queue-status-button"
                        onClick={onOpenQueuedBatchJobs}
                        className="nbu-inline-panel flex min-w-0 items-center gap-2 px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    {t('queuedBatchJobsTitle')}
                                </span>
                                <span className="nbu-chip px-2 py-0.5 text-[10px]">
                                    {t('queuedBatchJobsTrackedCount').replace('{0}', trackedQueueCount.toString())}
                                </span>
                            </div>
                            <div
                                data-testid="composer-queue-status-progress"
                                className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/80"
                            >
                                <div
                                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(245,158,11,0.95),rgba(16,185,129,0.95))] transition-all duration-300"
                                    style={{ width: `${queueProgressPercent}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="nbu-chip px-2 py-0.5">
                                {t('queuedBatchJobsActiveCount').replace('{0}', runningQueueCount.toString())}
                            </span>
                            <span className="nbu-chip px-2 py-0.5">
                                {t('queuedBatchJobsImportReadyCount').replace('{0}', importReadyQueueCount.toString())}
                            </span>
                            <span className="nbu-chip px-2 py-0.5">
                                {t('queuedBatchJobsClosedIssuesCount').replace('{0}', issueQueueCount.toString())}
                            </span>
                            <span className="nbu-control-button px-2.5 py-1 text-[10px] font-semibold">
                                {t('workspacePanelViewDetails')}
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </section>
    );
}

export default React.memo(ComposerSettingsPanel);
