import React from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import InfoTooltip from './InfoTooltip';
import { useAnchoredFloatingPlacement } from '../hooks/useAnchoredFloatingPlacement';
import { getOutputFormatLabelKey, getThinkingLevelLabelKey, MODEL_CAPABILITIES } from '../constants';
import { getGroundingModeSummaryTranslationKey } from '../utils/groundingMode';
import { formatTemperature } from '../utils/temperature';
import { getTranslation, Language } from '../utils/translations';
import { useWorkspaceFloatingLayer } from './WorkspaceFloatingLayerContext';
import {
    AspectRatio,
    GroundingMode,
    ImageModel,
    ImageSize,
    OutputFormat,
    PromptThinkingLevel,
    StageAsset,
    StickySendIntent,
    ThinkingLevel,
    TurnLineageAction,
} from '../types';

export type ComposerSettingsPanelProps = {
    supportsQueuedBatch?: boolean;
    promptThinkingLevel?: PromptThinkingLevel;
    onPromptThinkingLevelChange?: (level: PromptThinkingLevel) => void;
    prompt: string;
    placeholder: string;
    enterToSubmit: boolean;
    isGenerating: boolean;
    isActionLocked?: boolean;
    isCancelFinalizing?: boolean;
    isEnhancingPrompt: boolean;
    activePromptTool?: 'image-to-prompt' | 'inspiration' | 'rewrite' | null;
    currentLanguage: Language;
    imageStyleLabel: string;
    modelLabel: string;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
    onBatchSizeChange?: (value: number) => void;
    outputFormat: OutputFormat;
    thinkingLevel: ThinkingLevel;
    groundingMode: GroundingMode;
    stickySendIntent: StickySendIntent;
    currentStageAsset: StageAsset | null;
    capability: (typeof MODEL_CAPABILITIES)[ImageModel];
    availableGroundingModes: GroundingMode[];
    temperature: number;
    isAdvancedSettingsOpen: boolean;
    generateLabel: string;
    isQueueBatchDisabled: boolean;
    queueBatchDisabledReason: string | null;
    queueBatchModeSummary: string;
    queueBatchGenerateModeSummary: string;
    queueBatchConversationNotice: string | null;
    onPromptChange: (value: string) => void;
    onStickySendIntentChange: (value: StickySendIntent) => void;
    onToggleEnterToSubmit: () => void;
    onGenerate: () => void;
    onQueueBatchJob: () => void;
    onQueueBatchFollowUpJob: () => void;
    onCancelGeneration: () => void;
    onStartNewConversation: () => void;
    onFollowUpGenerate: () => void;
    onSurpriseMe: () => void;
    onSmartRewrite: () => void;
    onImageToPrompt?: (file: File) => void | Promise<void>;
    onOpenStyles: () => void;
    onOpenSettings: () => void;
    onToggleAdvancedSettings: () => void;
    getStageOriginLabel: (origin?: StageAsset['origin']) => string;
    getLineageActionLabel: (action?: TurnLineageAction) => string;
    promptTextareaRef?: React.RefObject<HTMLTextAreaElement | null>;
    onClearStyle?: () => void;
    imageToolsPanel?: React.ReactNode;
    roundCount?: number;
    onRoundCountChange?: (rounds: number) => void;
    autoExportTrigger?: 'off' | 'count' | 'size' | 'both';
    onAutoExportTriggerChange?: (trigger: 'off' | 'count' | 'size' | 'both') => void;
    autoExportImageCount?: number;
    onAutoExportImageCountChange?: (count: number) => void;
    autoExportFileSizeMb?: number;
    onAutoExportFileSizeMbChange?: (size: number) => void;
    batchProgress?: {
        completed: number;
        total: number;
        currentRound?: number;
        totalRounds?: number;
    };
    supportsAutoBackup?: boolean;
    settingsLocked?: boolean;
    onToggleSettingsLock?: () => void;
    showNotification?: (message: string, type?: 'info' | 'error') => void;
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
    isActionLocked = isGenerating,
    isCancelFinalizing = false,
    isEnhancingPrompt,
    activePromptTool,
    currentLanguage,
    imageStyleLabel,
    modelLabel,
    aspectRatio,
    imageSize,
    batchSize,
    onBatchSizeChange,
    outputFormat,
    thinkingLevel,
    groundingMode,
    stickySendIntent = 'independent',
    currentStageAsset,
    capability,
    availableGroundingModes,
    temperature,
    isAdvancedSettingsOpen,
    generateLabel,
    isQueueBatchDisabled,
    queueBatchDisabledReason,
    queueBatchModeSummary,
    queueBatchGenerateModeSummary,
    queueBatchConversationNotice,
    onPromptChange,
    onStickySendIntentChange,
    onToggleEnterToSubmit,
    onGenerate,
    onQueueBatchJob,
    onQueueBatchFollowUpJob,
    onCancelGeneration,
    onStartNewConversation,
    onFollowUpGenerate,
    onSurpriseMe,
    onSmartRewrite,
    onImageToPrompt,
    onOpenStyles,
    onOpenSettings,
    onToggleAdvancedSettings,
    getStageOriginLabel,
    getLineageActionLabel,
    promptTextareaRef,
    onClearStyle,
    imageToolsPanel,
    roundCount = 1,
    onRoundCountChange,
    autoExportTrigger = 'off',
    onAutoExportTriggerChange,
    autoExportImageCount = 20,
    onAutoExportImageCountChange,
    autoExportFileSizeMb = 100,
    onAutoExportFileSizeMbChange,
    batchProgress,
    supportsAutoBackup = false,
    settingsLocked = false,
    onToggleSettingsLock,
    showNotification,
    supportsQueuedBatch = true,
    promptThinkingLevel = 'low',
    onPromptThinkingLevelChange,
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
    const [isRoundGridOpen, setIsRoundGridOpen] = React.useState(false);
    const t = (key: string) => getTranslation(currentLanguage, key);
    const cancelLabel = React.useMemo(() => {
        const totalRounds = batchProgress?.totalRounds || 1;
        const currentRound = batchProgress?.currentRound || 1;
        if (totalRounds > 1) {
            const currentBatchSize = batchProgress?.total || batchSize;
            const completedInCurrentRound = batchProgress?.completed || 0;
            const totalImages = totalRounds * currentBatchSize;
            const completedImages = (currentRound - 1) * currentBatchSize + completedInCurrentRound;
            const remainingImages = Math.max(0, totalImages - completedImages);
            return t('cancelWithCountdown')
                .replace('{0}', String(currentRound))
                .replace('{1}', String(totalRounds))
                .replace('{2}', String(remainingImages));
        }
        return t('clearHistoryCancel');
    }, [batchProgress, batchSize, currentLanguage]);
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
    const getOutputFormatSummaryLabel = (value: OutputFormat) => t(getOutputFormatLabelKey(value));
    const getThinkingLevelSummaryLabel = (value: ThinkingLevel) => t(getThinkingLevelLabelKey(value));
    const getGroundingModeSummaryLabel = (value: GroundingMode) => t(getGroundingModeSummaryTranslationKey(value));
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
    const handleSetBatchSizeToOneAndEnableMemory = () => {
        if (settingsLocked) {
            showNotification?.(t('settingsLockedNotice'), 'info');
            return;
        }
        onBatchSizeChange?.(1);
        onStickySendIntentChange('memory');
        closeSendIntentInfoCard();
    };
    const handleCancelMemoryUnavailable = () => {
        closeSendIntentInfoCard();
    };
    const handleSendIntentToggle = () => {
        if (stickySendIntent === 'memory') {
            onStickySendIntentChange('independent');
            openSendIntentInfoCard('independent', 'auto');
            return;
        }

        if (!canUseMemorySendIntent) {
            openSendIntentInfoCard('memory-unavailable', 'manual');
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
    const followUpGenerateTitle = currentStageAsset
        ? followUpSourceSummary
            ? `${t('composerFollowUpSource')}: ${followUpSourceSummary}`
            : undefined
        : t('followUpEditRequiresStageImage');
    const primaryGenerateLabel = hasStageSourceForContinuation ? followUpGenerateLabel : generateLabel;
    const primaryGenerateAriaLabel = hasStageSourceForContinuation ? followUpGenerateAriaLabel : generateLabel;
    const primaryGenerateTitle = hasStageSourceForContinuation ? followUpGenerateTitle : undefined;
    const handlePrimaryGenerate = hasStageSourceForContinuation ? onFollowUpGenerate : onGenerate;
    const showSecondaryGenerateButton = !isActionLocked && hasStageSourceForContinuation;
    const primaryQueueLabel = hasStageSourceForContinuation
        ? t('composerQueueBatchFollowUpJob')
        : t('composerQueueBatchJob');
    const secondaryQueueLabel = t('composerQueueBatchJob');
    const primaryQueueAriaLabel = hasStageSourceForContinuation ? followUpGenerateAriaLabel : primaryQueueLabel;
    const primaryQueueTitle = isQueueBatchDisabled
        ? queueBatchDisabledReason || queueBatchModeSummary
        : hasStageSourceForContinuation
          ? followUpGenerateTitle
          : undefined;
    const handlePrimaryQueueAction = hasStageSourceForContinuation ? onQueueBatchFollowUpJob : onQueueBatchJob;
    const showSecondaryQueueButton = hasStageSourceForContinuation;
    const primaryQueueModeHint = queueBatchDisabledReason || queueBatchModeSummary;
    const secondaryQueueModeHint = queueBatchDisabledReason || queueBatchGenerateModeSummary;
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
                    <div>{sendIntentInfoReason}</div>
                    <div className="mt-2.5 flex items-center gap-2">
                        <button
                            type="button"
                            data-testid="composer-sticky-send-intent-set-batch-one"
                            onClick={handleSetBatchSizeToOneAndEnableMemory}
                            className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-amber-200/90 px-2.5 py-1 text-[11px] font-semibold text-amber-950 transition-colors hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-amber-400/50 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                        >
                            {resolveIntentText('composerSendIntentSetBatchToOne', '將數量改為 1')}
                            {settingsLocked && <span className="ml-1" title={t('settingsLocked')}>🔒</span>}
                        </button>
                        <button
                            type="button"
                            data-testid="composer-sticky-send-intent-cancel"
                            onClick={handleCancelMemoryUnavailable}
                            className="inline-flex items-center justify-center rounded-xl border border-amber-300/60 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-amber-100/60 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-amber-500/30 dark:bg-slate-900/80 dark:text-amber-200 dark:hover:bg-slate-800"
                        >
                            {resolveIntentText('composerSendIntentCancel', '取消')}
                        </button>
                    </div>
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
                      value: `${t('groundingProvenanceInsightTemperature')}: ${formatTemperature(temperature)}`,
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
    const promptOverlaySpacingStyle = {
        '--composer-prompt-overlay-inset': '0.375rem',
        '--composer-prompt-overlay-inset-sm': '0.5rem',
        '--composer-prompt-text-reserve': '4.75rem',
        '--composer-prompt-text-reserve-sm': '5rem',
    } as React.CSSProperties;
    const promptTextareaReserveClassName =
        'w-[calc(100%-var(--composer-prompt-text-reserve))] sm:w-[calc(100%-var(--composer-prompt-text-reserve-sm))]';
    const promptOverlayInsetClassName =
        'right-[var(--composer-prompt-overlay-inset)] sm:right-[var(--composer-prompt-overlay-inset-sm)]';
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
    const advancedSettingsButton = (
        <button
            type="button"
            data-testid="composer-advanced-settings-button"
            aria-label={t('composerToolbarAdvancedSettings')}
            aria-haspopup="dialog"
            aria-expanded={isAdvancedSettingsOpen}
            onClick={settingsLocked ? () => showNotification?.(t('settingsLockedNotice'), 'info') : onToggleAdvancedSettings}
            className="nbu-inline-panel group flex min-h-10 w-full min-w-0 items-center overflow-hidden rounded-[20px] px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
            <div className={summaryStripContentClassName}>
                <span className={summaryStripAnchorClassName}>
                    {t('composerToolbarAdvancedSettings')}
                    {settingsLocked && <span className="ml-1" title={t('settingsLocked')}>🔒</span>}
                </span>
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
                    onClick={settingsLocked ? () => showNotification?.(t('settingsLockedNotice'), 'info') : onOpenSettings}
                    className="nbu-inline-panel group flex min-h-10 min-w-0 flex-1 items-center overflow-hidden rounded-[20px] px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                    <div className={summaryStripContentClassName}>
                        <span className={summaryStripAnchorClassName}>
                            {t('workspaceSheetTitleGenerationSettings')}
                            {settingsLocked && <span className="ml-1" title={t('settingsLocked')}>🔒</span>}
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
                        onClick={settingsLocked ? () => showNotification?.(t('settingsLockedNotice'), 'info') : onOpenStyles}
                        className="group flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left"
                    >
                        <span className={composerStyleLabelClassName}>
                            {t('workspaceViewerStyle')}
                            {settingsLocked && <span className="ml-1" title={t('settingsLocked')}>🔒</span>}
                        </span>
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
                                if (settingsLocked) {
                                    showNotification?.(t('settingsLockedNotice'), 'info');
                                    return;
                                }
                                onClearStyle();
                            }}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-fuchsia-200/90 bg-fuchsia-50/90 text-fuchsia-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-fuchsia-500/25 dark:bg-fuchsia-950/25 dark:text-fuchsia-100 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
                        >
                            {renderDismissIcon()}
                        </button>
                    )}
                </div>
                {/* Lock Settings Toggle Button */}
                <button
                    type="button"
                    data-testid="composer-lock-button"
                    title={settingsLocked ? t('unlockSettings') : t('lockSettings')}
                    aria-label={settingsLocked ? t('unlockSettings') : t('lockSettings')}
                    onClick={onToggleSettingsLock}
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[20px] border transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        settingsLocked
                            ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-500/35 dark:bg-amber-950/20 dark:text-amber-300 shadow-[0_4px_12px_rgba(245,158,11,0.1)]'
                            : 'border-slate-200/80 bg-white/80 text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-500 dark:hover:border-white/20 dark:hover:text-slate-300'
                    }`}
                >
                    {settingsLocked ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
            </div>

            <div className="grid gap-1.5 lg:grid-cols-[minmax(220px,248px)_minmax(0,1fr)] xl:grid-cols-[minmax(232px,256px)_minmax(0,1fr)]">
                <div data-testid="composer-image-tools-slot" className="min-w-0">
                    {imageToolsPanel ?? null}
                </div>

                <div className="min-w-0">
                    <div className="nbu-subpanel overflow-hidden p-2.5">
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 px-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <h3 className="text-[15px] font-black text-slate-900 dark:text-slate-100">
                                    {promptSurfaceLabel}
                                </h3>
                                {showStartNewConversationAction && (
                                    <button
                                        type="button"
                                        onClick={onStartNewConversation}
                                        disabled={isActionLocked}
                                        className={newConversationButtonClassName}
                                    >
                                        {t('workspaceViewerNewConversation')}
                                    </button>
                                )}
                            </div>
                            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                                <div
                                    data-testid="composer-prompt-thinking-level-control"
                                    className="flex items-center gap-0.5 rounded-full border border-slate-200/80 bg-slate-100/90 p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
                                    title={t('promptThinkingLevel')}
                                >
                                    {(['low', 'medium', 'high'] as const).map((level) => {
                                        const isSelected = (promptThinkingLevel || 'low') === level;
                                        const label =
                                            level === 'low'
                                                ? t('promptThinkingLevelLow')
                                                : level === 'medium'
                                                  ? t('promptThinkingLevelMedium')
                                                  : t('promptThinkingLevelHigh');
                                        const tooltip =
                                            level === 'low'
                                                ? t('promptThinkingLevelLowTooltip')
                                                : level === 'medium'
                                                  ? t('promptThinkingLevelMediumTooltip')
                                                  : t('promptThinkingLevelHighTooltip');
                                        const icon = level === 'low' ? '⚡' : level === 'medium' ? '🧠' : '🔬';

                                        return (
                                            <button
                                                key={level}
                                                type="button"
                                                data-testid={`composer-prompt-thinking-level-${level}`}
                                                data-active={isSelected ? 'true' : 'false'}
                                                title={tooltip}
                                                aria-label={`${t('promptThinkingLevel')}: ${label}`}
                                                disabled={isEnhancingPrompt}
                                                onClick={() => onPromptThinkingLevelChange?.(level)}
                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition-all ${
                                                    isSelected
                                                        ? 'bg-amber-500 text-slate-950 shadow-sm dark:bg-amber-400 dark:text-slate-950'
                                                        : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'
                                                } ${isEnhancingPrompt ? 'cursor-not-allowed opacity-50' : ''}`}
                                            >
                                                <span className="text-[10px]">{icon}</span>
                                                <span>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div
                                    ref={sendIntentInfoRootRef}
                                    data-testid="composer-sticky-send-intent"
                                    className="relative flex min-w-0 max-w-full items-center justify-end gap-1.5 sm:flex-none"
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
                            <div
                                className="relative overflow-hidden rounded-[26px] border nbu-composer-dock-textarea transition-all focus-within:border-amber-400/90 focus-within:ring-4 focus-within:ring-amber-100/70 dark:focus-within:border-amber-400/50 dark:focus-within:ring-amber-500/10"
                                style={promptOverlaySpacingStyle}
                            >
                                <textarea
                                    ref={resolvedPromptTextareaRef}
                                    className={`nbu-scrollbar-subtle block h-48 resize-none overflow-y-auto bg-transparent px-4 py-3.5 pb-3.5 pr-4 text-sm leading-6 outline-none ${promptTextareaReserveClassName}`}
                                    placeholder={promptSurfacePlaceholder}
                                    value={prompt}
                                    onChange={(e) => onPromptChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (enterToSubmit && e.key === 'Enter' && !e.shiftKey && !isActionLocked) {
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
                                    className={`absolute top-3.5 rounded-full border border-slate-200/80 bg-white/92 p-2 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-500 dark:hover:border-red-900/40 dark:hover:bg-red-950/30 dark:hover:text-red-300 ${promptOverlayInsetClassName}`}
                                >
                                    {renderClearIcon()}
                                </button>
                                <div
                                    data-testid="composer-enter-behavior-card"
                                    className={`pointer-events-none absolute bottom-3.5 z-10 ${promptOverlayInsetClassName}`}
                                >
                                    <button
                                        type="button"
                                        data-testid="composer-enter-behavior-toggle"
                                        data-active-mode={enterToSubmit ? 'send' : 'newline'}
                                        aria-label={enterBehaviorToggleAriaLabel}
                                        aria-pressed={enterToSubmit}
                                        onClick={onToggleEnterToSubmit}
                                        className="pointer-events-auto group relative grid min-h-[52px] w-[3.5rem] min-w-0 grid-rows-2 gap-1 overflow-hidden rounded-[20px] border border-slate-300/90 bg-slate-200/95 p-px text-left shadow-inner shadow-slate-300/70 transition-colors hover:border-slate-400/80 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30 sm:w-[3.75rem]"
                                    >
                                        <span
                                            data-testid="composer-enter-behavior-thumb"
                                            data-active-mode={enterToSubmit ? 'send' : 'newline'}
                                            aria-hidden="true"
                                            className={`pointer-events-none absolute left-px right-px bg-amber-500 transition-all duration-200 ease-out dark:bg-amber-300 ${
                                                enterToSubmit
                                                    ? 'top-px bottom-[calc(50%+0.125rem)] rounded-t-[19px] rounded-b-[4px] shadow-[0_10px_24px_rgba(245,158,11,0.18)] dark:shadow-none'
                                                    : 'top-[calc(50%+0.125rem)] bottom-px rounded-t-[4px] rounded-b-[19px] shadow-[0_10px_24px_rgba(245,158,11,0.18)] dark:shadow-none'
                                            }`}
                                        />
                                        <span
                                            data-testid="composer-enter-behavior-send-option"
                                            data-selected={enterToSubmit ? 'true' : 'false'}
                                            aria-hidden="true"
                                            className={`relative z-10 flex min-w-0 items-center justify-center rounded-t-[19px] rounded-b-[4px] px-1.5 py-1.5 text-center text-[10px] font-semibold leading-[0.85rem] transition-colors ${
                                                enterToSubmit
                                                    ? 'text-white dark:text-slate-950'
                                                    : 'text-slate-600 dark:text-slate-500'
                                            }`}
                                        >
                                            <span className="whitespace-pre-line break-words">
                                                {enterBehaviorSendLabel}
                                            </span>
                                        </span>
                                        <span
                                            data-testid="composer-enter-behavior-newline-option"
                                            data-selected={enterToSubmit ? 'false' : 'true'}
                                            aria-hidden="true"
                                            className={`relative z-10 flex min-w-0 items-center justify-center rounded-t-[4px] rounded-b-[19px] px-1.5 py-1.5 text-center text-[10px] font-semibold leading-[0.85rem] transition-colors ${
                                                enterToSubmit
                                                    ? 'text-slate-600 dark:text-slate-500'
                                                    : 'text-white dark:text-slate-950'
                                            }`}
                                        >
                                            <span className="whitespace-pre-line break-words">
                                                {enterBehaviorNewlineLabel}
                                            </span>
                                        </span>
                                    </button>
                                </div>
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
                <div className="space-y-1.5">
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
                                {cancelLabel}
                            </Button>
                        ) : isCancelFinalizing ? (
                            <Button
                                data-testid="composer-cancel-finalizing-button"
                                variant="secondary"
                                disabled
                                className="min-h-[64px] rounded-[28px] px-4 text-[14px]"
                            >
                                {t('composerCancelFinalizingLabel')}
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
                    {supportsQueuedBatch ? (
                        <div
                            data-testid="composer-queue-actions"
                            className={`grid gap-1.5 ${showSecondaryQueueButton ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)]' : 'sm:grid-cols-1'}`}
                        >
                            <div className="flex min-w-0 items-center gap-1.5">
                                <Button
                                    data-testid="composer-queue-batch-primary-button"
                                    variant="secondary"
                                    onClick={handlePrimaryQueueAction}
                                    aria-label={primaryQueueAriaLabel}
                                    disabled={isActionLocked || isQueueBatchDisabled}
                                    title={primaryQueueTitle}
                                    className="min-h-9 min-w-0 flex-1 rounded-[20px] px-3 text-[12px] font-semibold"
                                >
                                    {primaryQueueLabel}
                                </Button>
                                <InfoTooltip
                                    content={primaryQueueModeHint}
                                    buttonLabel={primaryQueueLabel}
                                    ariaLabel={primaryQueueModeHint}
                                    dataTestId="composer-queue-batch-mode-hint"
                                    tone="light"
                                    align="right"
                                    preferredVerticalPlacement="top"
                                    autoAdjust={true}
                                />
                            </div>
                            {showSecondaryQueueButton ? (
                                <div className="flex min-w-0 items-center gap-1.5">
                                    <Button
                                        data-testid="composer-queue-batch-generate-button"
                                        variant="secondary"
                                        onClick={onQueueBatchJob}
                                        disabled={isActionLocked || isQueueBatchDisabled}
                                        title={isQueueBatchDisabled ? secondaryQueueModeHint : undefined}
                                        className="min-h-9 min-w-0 flex-1 rounded-[20px] px-3 text-[12px] font-semibold"
                                    >
                                        {secondaryQueueLabel}
                                    </Button>
                                    <InfoTooltip
                                        content={secondaryQueueModeHint}
                                        buttonLabel={secondaryQueueLabel}
                                        ariaLabel={secondaryQueueModeHint}
                                        dataTestId="composer-queue-batch-generate-mode-hint"
                                        tone="light"
                                        align="right"
                                        preferredVerticalPlacement="top"
                                        autoAdjust={true}
                                    />
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    {isCancelFinalizing ? (
                        <p
                            data-testid="composer-cancel-finalizing-note"
                            className="px-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400"
                        >
                            {t('composerCancelFinalizingNote')}
                        </p>
                    ) : null}

                    <div
                        data-testid="composer-round-backup-strip"
                        className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-xs border-t border-gray-100/50 dark:border-slate-800 pt-2 bg-gray-50/50 dark:bg-slate-900/40 rounded-2xl mt-1.5"
                    >
                        {/* Left: Round Count */}
                        <div className="flex items-center gap-2" data-testid="composer-round-count-control">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{t('roundCount')}</span>
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-0.5 border dark:border-slate-700 shadow-sm">
                                <button
                                    type="button"
                                    data-testid="composer-round-count-decrease"
                                    disabled={roundCount <= 1 || isActionLocked || settingsLocked}
                                    onClick={() => onRoundCountChange?.(Math.max(1, roundCount - 1))}
                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 font-bold select-none text-slate-600 dark:text-slate-300"
                                >
                                    -
                                </button>
                                <div className="relative flex items-center justify-center">
                                    <button
                                        type="button"
                                        data-testid="composer-round-count-grid-trigger"
                                        disabled={isActionLocked || settingsLocked}
                                        onClick={() => setIsRoundGridOpen(!isRoundGridOpen)}
                                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-center font-mono font-bold text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none"
                                        title={t('roundCount')}
                                    >
                                        {roundCount}
                                    </button>

                                    {isRoundGridOpen && (
                                        <>
                                            {/* Click outside backdrop */}
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setIsRoundGridOpen(false)}
                                            />
                                            {/* Glassmorphic Popover Grid */}
                                            <div
                                                data-testid="composer-round-count-popover"
                                                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-gray-200/80 dark:border-slate-800 rounded-xl p-2 shadow-xl w-[130px] select-none pointer-events-auto"
                                            >
                                                <div className="grid grid-cols-5 gap-1">
                                                    {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
                                                        const isSelected = num === roundCount;
                                                        return (
                                                            <button
                                                                key={num}
                                                                type="button"
                                                                data-testid={`composer-round-count-option-${num}`}
                                                                onClick={() => {
                                                                    onRoundCountChange?.(num);
                                                                    setIsRoundGridOpen(false);
                                                                }}
                                                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono transition-all ${
                                                                    isSelected
                                                                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-500/20'
                                                                        : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                                }`}
                                                            >
                                                                {num}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {/* Popover Arrow */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-slate-900" />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    data-testid="composer-round-count-increase"
                                    disabled={roundCount >= 10 || isActionLocked || settingsLocked}
                                    onClick={() => onRoundCountChange?.(Math.min(10, roundCount + 1))}
                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 font-bold select-none text-slate-600 dark:text-slate-300"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Right: Auto-Export Backup (Rendered ONLY when supportsAutoBackup is true) */}
                        {supportsAutoBackup ? (
                            <div className="flex flex-wrap items-center gap-3" data-testid="composer-auto-export-control">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">{t('autoExportSwitch')}</span>
                                    <button
                                        type="button"
                                        data-testid="composer-auto-export-toggle"
                                        onClick={() => onAutoExportTriggerChange?.(autoExportTrigger === 'off' ? 'both' : 'off')}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-amber-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                                            autoExportTrigger !== 'off' ? 'bg-amber-500' : 'bg-gray-200 dark:bg-slate-700'
                                        }`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                autoExportTrigger !== 'off' ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {autoExportTrigger !== 'off' && (
                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                        <span className="text-[11px]">({t('autoExportTriggerCondition')}:</span>

                                        <select
                                            data-testid="composer-auto-export-count-select"
                                            value={autoExportImageCount}
                                            onChange={(e) => onAutoExportImageCountChange?.(Number(e.target.value))}
                                            className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-medium outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-slate-700 dark:text-slate-200"
                                        >
                                            <option value={10}>10 {t('imagesCountUnit')}</option>
                                            <option value={20}>20 {t('imagesCountUnit')}</option>
                                            <option value={30}>30 {t('imagesCountUnit')}</option>
                                            <option value={50}>50 {t('imagesCountUnit')}</option>
                                        </select>

                                        <span>/</span>

                                        <select
                                            data-testid="composer-auto-export-size-select"
                                            value={autoExportFileSizeMb}
                                            onChange={(e) => onAutoExportFileSizeMbChange?.(Number(e.target.value))}
                                            className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-medium outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-slate-700 dark:text-slate-200"
                                        >
                                            <option value={50}>50MB</option>
                                            <option value={100}>100MB</option>
                                            <option value={150}>150MB</option>
                                            <option value={200}>200MB</option>
                                        </select>
                                        <span className="text-[11px]">)</span>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default React.memo(ComposerSettingsPanel);
