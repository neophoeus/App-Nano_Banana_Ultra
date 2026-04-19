import { Dispatch, MutableRefObject, SetStateAction, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import ComposerSettingsPanel from '../components/ComposerSettingsPanel';
import type { PickerSheet } from '../components/WorkspacePickerSheet';
import { Language } from '../utils/translations';
import {
    AspectRatio,
    GeneratedImage,
    GroundingMode,
    OutputFormat,
    QueuedBatchJob,
    StageAsset,
    StickySendIntent,
    ThinkingLevel,
    TurnLineageAction,
    ImageSize,
} from '../types';

type ComposerSettingsPanelProps = React.ComponentProps<typeof ComposerSettingsPanel>;
export type ComposerSettingsPanelPickerEntryProps = {
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
    onOpenSettings: () => void;
};
type ComposerSettingsPanelOwnedProps = ComposerSettingsPanelProps & ComposerSettingsPanelPickerEntryProps;

type UseComposerSettingsPanelPropsArgs = {
    prompt: string;
    placeholder: string;
    enterToSubmit: boolean;
    isGenerating: boolean;
    isEnhancingPrompt: boolean;
    activePromptTool?: ComposerSettingsPanelProps['activePromptTool'];
    currentLanguage: Language;
    imageStyleLabel: string;
    outputFormat: OutputFormat;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    groundingMode: GroundingMode;
    stickySendIntent: StickySendIntent;
    imageModel: ComposerSettingsPanelProps['imageModel'];
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
    currentStageAsset: StageAsset | null;
    capability: ComposerSettingsPanelProps['capability'];
    availableGroundingModes: GroundingMode[];
    temperature: number;
    isAdvancedSettingsOpen: boolean;
    generateLabel: string;
    hasSizePicker: boolean;
    totalReferenceCount: number;
    objectCount: number;
    characterCount: number;
    maxObjects: number;
    maxCharacters: number;
    queuedJobs: QueuedBatchJob[];
    isQueueBatchDisabled: boolean;
    queueBatchDisabledReason: string | null;
    queueBatchModeSummary: string;
    queueBatchConversationNotice: string | null;
    getImportedQueuedResultCount: (job: QueuedBatchJob) => number;
    getImportedQueuedHistoryItems: (job: QueuedBatchJob) => GeneratedImage[];
    activeImportedQueuedHistoryId: string | null;
    promptTextareaRef: MutableRefObject<HTMLTextAreaElement | null>;
    setPrompt: (value: string) => void;
    setStickySendIntent: Dispatch<SetStateAction<StickySendIntent>>;
    toggleEnterToSubmit: () => void;
    handleGenerate: () => void;
    handleQueueBatchJob: () => void;
    handleOpenQueuedBatchJobs: () => void;
    handleCancelGeneration: () => void;
    handleStartNewConversation: () => void;
    handleFollowUpGenerate: () => void;
    handleSurpriseMe: () => void;
    handleSmartRewrite: () => void;
    handleImageToPrompt?: (file: File) => void | Promise<void>;
    openSettings: () => void;
    openAdvancedSettings: () => void;
    setActivePickerSheet: Dispatch<SetStateAction<PickerSheet>>;
    setIsAdvancedSettingsOpen: Dispatch<SetStateAction<boolean>>;
    setOutputFormat: (value: OutputFormat) => void;
    setTemperature: (value: number) => void;
    setThinkingLevel: (value: ThinkingLevel) => void;
    setGroundingMode: (value: GroundingMode) => void;
    getGroundingFlagsFromMode: (mode: GroundingMode) => { googleSearch: boolean; imageSearch: boolean };
    showNotification: (message: string, type?: 'info' | 'error') => void;
    t: (key: string) => string;
    handleImportAllQueuedJobs: () => void;
    handlePollAllQueuedJobs: () => void;
    handlePollQueuedJob: (localId: string) => void;
    handleCancelQueuedJob: (localId: string) => void;
    handleImportQueuedJob: (localId: string) => void;
    handleOpenImportedQueuedJob: (localId: string) => void;
    handleOpenLatestImportedQueuedJob: (localId: string) => void;
    handleOpenImportedQueuedHistoryItem: (historyId: string) => void;
    handleRemoveQueuedJob: (localId: string) => void;
    getStageOriginLabel: (origin?: StageAsset['origin']) => string;
    getLineageActionLabel: (action?: TurnLineageAction) => string;
};

export function useComposerSettingsPanelProps({
    prompt,
    placeholder,
    enterToSubmit,
    isGenerating,
    isEnhancingPrompt,
    activePromptTool,
    currentLanguage,
    imageStyleLabel,
    outputFormat,
    thinkingLevel,
    includeThoughts,
    groundingMode,
    stickySendIntent,
    imageModel,
    aspectRatio,
    imageSize,
    batchSize,
    currentStageAsset,
    capability,
    availableGroundingModes,
    temperature,
    isAdvancedSettingsOpen,
    generateLabel,
    hasSizePicker,
    totalReferenceCount,
    objectCount,
    characterCount,
    maxObjects,
    maxCharacters,
    queuedJobs,
    isQueueBatchDisabled,
    queueBatchDisabledReason,
    queueBatchModeSummary,
    queueBatchConversationNotice,
    getImportedQueuedResultCount,
    getImportedQueuedHistoryItems,
    activeImportedQueuedHistoryId,
    promptTextareaRef,
    setPrompt,
    setStickySendIntent,
    toggleEnterToSubmit,
    handleGenerate,
    handleQueueBatchJob,
    handleOpenQueuedBatchJobs,
    handleCancelGeneration,
    handleStartNewConversation,
    handleFollowUpGenerate,
    handleSurpriseMe,
    handleSmartRewrite,
    handleImageToPrompt,
    openSettings,
    openAdvancedSettings,
    setActivePickerSheet,
    setIsAdvancedSettingsOpen,
    setOutputFormat,
    setTemperature,
    setThinkingLevel,
    setGroundingMode,
    getGroundingFlagsFromMode,
    showNotification,
    t,
    handleImportAllQueuedJobs,
    handlePollAllQueuedJobs,
    handlePollQueuedJob,
    handleCancelQueuedJob,
    handleImportQueuedJob,
    handleOpenImportedQueuedJob,
    handleOpenLatestImportedQueuedJob,
    handleOpenImportedQueuedHistoryItem,
    handleRemoveQueuedJob,
    getStageOriginLabel,
    getLineageActionLabel,
}: UseComposerSettingsPanelPropsArgs): ComposerSettingsPanelOwnedProps {
    const getModelLabel = useCallback(
        (model: ComposerSettingsPanelProps['imageModel']) => {
            if (model === 'gemini-3.1-flash-image-preview') {
                return t('modelGemini31Flash');
            }
            if (model === 'gemini-3-pro-image-preview') {
                return t('modelGemini3Pro');
            }
            return t('modelGemini25Flash');
        },
        [t],
    );
    const latestHandlersRef = useRef({
        setPrompt,
        setStickySendIntent,
        toggleEnterToSubmit,
        handleGenerate,
        handleQueueBatchJob,
        handleOpenQueuedBatchJobs,
        handleCancelGeneration,
        handleStartNewConversation,
        handleFollowUpGenerate,
        handleSurpriseMe,
        handleSmartRewrite,
        handleImageToPrompt,
        openSettings,
        openAdvancedSettings,
        setActivePickerSheet,
        setIsAdvancedSettingsOpen,
        setOutputFormat,
        setTemperature,
        setThinkingLevel,
        setGroundingMode,
        getGroundingFlagsFromMode,
        showNotification,
        t,
        outputFormat,
        handleImportAllQueuedJobs,
        handlePollAllQueuedJobs,
        handlePollQueuedJob,
        handleCancelQueuedJob,
        handleImportQueuedJob,
        handleOpenImportedQueuedJob,
        handleOpenLatestImportedQueuedJob,
        handleOpenImportedQueuedHistoryItem,
        handleRemoveQueuedJob,
        getImportedQueuedResultCount,
        getImportedQueuedHistoryItems,
    });

    useLayoutEffect(() => {
        latestHandlersRef.current = {
            setPrompt,
            setStickySendIntent,
            toggleEnterToSubmit,
            handleGenerate,
            handleQueueBatchJob,
            handleOpenQueuedBatchJobs,
            handleCancelGeneration,
            handleStartNewConversation,
            handleFollowUpGenerate,
            handleSurpriseMe,
            handleSmartRewrite,
            handleImageToPrompt,
            openSettings,
            openAdvancedSettings,
            setActivePickerSheet,
            setIsAdvancedSettingsOpen,
            setOutputFormat,
            setTemperature,
            setThinkingLevel,
            setGroundingMode,
            getGroundingFlagsFromMode,
            showNotification,
            t,
            outputFormat,
            handleImportAllQueuedJobs,
            handlePollAllQueuedJobs,
            handlePollQueuedJob,
            handleCancelQueuedJob,
            handleImportQueuedJob,
            handleOpenImportedQueuedJob,
            handleOpenLatestImportedQueuedJob,
            handleOpenImportedQueuedHistoryItem,
            handleRemoveQueuedJob,
            getImportedQueuedResultCount,
            getImportedQueuedHistoryItems,
        };
    }, [
        setPrompt,
        setStickySendIntent,
        toggleEnterToSubmit,
        handleGenerate,
        handleQueueBatchJob,
        handleOpenQueuedBatchJobs,
        handleCancelGeneration,
        handleStartNewConversation,
        handleFollowUpGenerate,
        handleSurpriseMe,
        handleSmartRewrite,
        handleImageToPrompt,
        setActivePickerSheet,
        setIsAdvancedSettingsOpen,
        setOutputFormat,
        setTemperature,
        setThinkingLevel,
        setGroundingMode,
        getGroundingFlagsFromMode,
        showNotification,
        t,
        outputFormat,
        handleImportAllQueuedJobs,
        handlePollAllQueuedJobs,
        handlePollQueuedJob,
        handleCancelQueuedJob,
        handleImportQueuedJob,
        handleOpenImportedQueuedJob,
        handleOpenLatestImportedQueuedJob,
        handleOpenImportedQueuedHistoryItem,
        handleRemoveQueuedJob,
        getImportedQueuedResultCount,
        getImportedQueuedHistoryItems,
    ]);

    return useMemo(
        () => ({
            prompt,
            placeholder,
            enterToSubmit,
            isGenerating,
            isEnhancingPrompt,
            activePromptTool,
            currentLanguage,
            imageStyleLabel,
            outputFormat,
            thinkingLevel,
            includeThoughts,
            groundingMode,
            stickySendIntent,
            imageModel,
            currentStageAsset,
            capability,
            availableGroundingModes,
            temperature,
            isAdvancedSettingsOpen,
            generateLabel,
            modelLabel: getModelLabel(imageModel),
            aspectRatio,
            imageSize,
            batchSize,
            hasSizePicker,
            totalReferenceCount,
            objectCount,
            characterCount,
            maxObjects,
            maxCharacters,
            queuedJobs,
            isQueueBatchDisabled,
            queueBatchDisabledReason,
            queueBatchModeSummary,
            queueBatchConversationNotice,
            getImportedQueuedResultCount: (job: QueuedBatchJob) =>
                latestHandlersRef.current.getImportedQueuedResultCount(job),
            getImportedQueuedHistoryItems: (job: QueuedBatchJob) =>
                latestHandlersRef.current.getImportedQueuedHistoryItems(job),
            activeImportedQueuedHistoryId,
            promptTextareaRef,
            onPromptChange: (value: string) => latestHandlersRef.current.setPrompt(value),
            onStickySendIntentChange: (value: StickySendIntent) => latestHandlersRef.current.setStickySendIntent(value),
            onToggleEnterToSubmit: () => latestHandlersRef.current.toggleEnterToSubmit(),
            onGenerate: () => latestHandlersRef.current.handleGenerate(),
            onQueueBatchJob: () => latestHandlersRef.current.handleQueueBatchJob(),
            onOpenQueuedBatchJobs: () => latestHandlersRef.current.handleOpenQueuedBatchJobs(),
            onCancelGeneration: () => latestHandlersRef.current.handleCancelGeneration(),
            onStartNewConversation: () => latestHandlersRef.current.handleStartNewConversation(),
            onFollowUpGenerate: () => latestHandlersRef.current.handleFollowUpGenerate(),
            onSurpriseMe: () => latestHandlersRef.current.handleSurpriseMe(),
            onSmartRewrite: () => latestHandlersRef.current.handleSmartRewrite(),
            onImageToPrompt: latestHandlersRef.current.handleImageToPrompt,
            onOpenStyles: () => latestHandlersRef.current.setActivePickerSheet('styles'),
            onOpenSettings: () => latestHandlersRef.current.openSettings(),
            onToggleAdvancedSettings: () => latestHandlersRef.current.openAdvancedSettings(),
            onOutputFormatChange: (value: OutputFormat) => latestHandlersRef.current.setOutputFormat(value),
            onTemperatureChange: (value: number) => latestHandlersRef.current.setTemperature(value),
            onThinkingLevelChange: (value: ThinkingLevel) => latestHandlersRef.current.setThinkingLevel(value),
            onGroundingModeChange: (nextMode: GroundingMode) => {
                const nextFlags = latestHandlersRef.current.getGroundingFlagsFromMode(nextMode);
                latestHandlersRef.current.setGroundingMode(nextMode);
                if (nextFlags.imageSearch && latestHandlersRef.current.outputFormat !== 'images-and-text') {
                    latestHandlersRef.current.setOutputFormat('images-and-text');
                    latestHandlersRef.current.showNotification(
                        latestHandlersRef.current.t('composerGroundingImageSearchUpgradeNotice'),
                        'info',
                    );
                }
            },
            onImportAllQueuedJobs: () => latestHandlersRef.current.handleImportAllQueuedJobs(),
            onPollAllQueuedJobs: () => latestHandlersRef.current.handlePollAllQueuedJobs(),
            onPollQueuedJob: (localId: string) => latestHandlersRef.current.handlePollQueuedJob(localId),
            onCancelQueuedJob: (localId: string) => latestHandlersRef.current.handleCancelQueuedJob(localId),
            onImportQueuedJob: (localId: string) => latestHandlersRef.current.handleImportQueuedJob(localId),
            onOpenImportedQueuedJob: (localId: string) =>
                latestHandlersRef.current.handleOpenImportedQueuedJob(localId),
            onOpenLatestImportedQueuedJob: (localId: string) =>
                latestHandlersRef.current.handleOpenLatestImportedQueuedJob(localId),
            onOpenImportedQueuedHistoryItem: (historyId: string) =>
                latestHandlersRef.current.handleOpenImportedQueuedHistoryItem(historyId),
            onRemoveQueuedJob: (localId: string) => latestHandlersRef.current.handleRemoveQueuedJob(localId),
            getStageOriginLabel,
            getLineageActionLabel,
        }),
        [
            prompt,
            placeholder,
            enterToSubmit,
            isGenerating,
            isEnhancingPrompt,
            activePromptTool,
            currentLanguage,
            imageStyleLabel,
            outputFormat,
            thinkingLevel,
            includeThoughts,
            groundingMode,
            stickySendIntent,
            imageModel,
            aspectRatio,
            imageSize,
            batchSize,
            currentStageAsset,
            capability,
            availableGroundingModes,
            temperature,
            isAdvancedSettingsOpen,
            generateLabel,
            hasSizePicker,
            totalReferenceCount,
            objectCount,
            characterCount,
            maxObjects,
            maxCharacters,
            queuedJobs,
            isQueueBatchDisabled,
            queueBatchDisabledReason,
            queueBatchModeSummary,
            queueBatchConversationNotice,
            activeImportedQueuedHistoryId,
            promptTextareaRef,
            getModelLabel,
            getStageOriginLabel,
            getLineageActionLabel,
            openSettings,
            openAdvancedSettings,
        ],
    );
}
