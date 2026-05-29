import { Dispatch, MutableRefObject, SetStateAction, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import ComposerSettingsPanel from '../components/ComposerSettingsPanel';
import type { PickerSheet } from '../components/WorkspacePickerSheet';
import { Language } from '../utils/translations';
import {
    AspectRatio,
    GroundingMode,
    ImageModel,
    ImageSize,
    OutputFormat,
    StageAsset,
    StickySendIntent,
    ThinkingLevel,
    TurnLineageAction,
} from '../types';

type ComposerSettingsPanelProps = React.ComponentProps<typeof ComposerSettingsPanel>;

type UseComposerSettingsPanelPropsArgs = {
    prompt: string;
    placeholder: string;
    enterToSubmit: boolean;
    isGenerating: boolean;
    isActionLocked?: boolean;
    isCancelFinalizing?: boolean;
    isEnhancingPrompt: boolean;
    activePromptTool?: ComposerSettingsPanelProps['activePromptTool'];
    currentLanguage: Language;
    imageStyleLabel: string;
    outputFormat: OutputFormat;
    thinkingLevel: ThinkingLevel;
    groundingMode: GroundingMode;
    stickySendIntent: StickySendIntent;
    imageModel: ImageModel;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
    currentStageAsset: StageAsset | null;
    capability: ComposerSettingsPanelProps['capability'];
    availableGroundingModes: GroundingMode[];
    temperature: number;
    isAdvancedSettingsOpen: boolean;
    generateLabel: string;
    isQueueBatchDisabled: boolean;
    queueBatchDisabledReason: string | null;
    queueBatchModeSummary: string;
    queueBatchGenerateModeSummary: string;
    queueBatchConversationNotice: string | null;
    promptTextareaRef: MutableRefObject<HTMLTextAreaElement | null>;
    setPrompt: (value: string) => void;
    setStickySendIntent: Dispatch<SetStateAction<StickySendIntent>>;
    toggleEnterToSubmit: () => void;
    handleGenerate: () => void;
    handleQueueBatchJob: () => void;
    handleQueueBatchFollowUpJob: () => void;
    handleCancelGeneration: () => void;
    handleStartNewConversation: () => void;
    handleFollowUpGenerate: () => void;
    handleSurpriseMe: () => void;
    handleSmartRewrite: () => void;
    handleImageToPrompt?: (file: File) => void | Promise<void>;
    openSettings: () => void;
    openAdvancedSettings: () => void;
    setActivePickerSheet: Dispatch<SetStateAction<PickerSheet>>;
    t: (key: string) => string;
    getStageOriginLabel: (origin?: StageAsset['origin']) => string;
    getLineageActionLabel: (action?: TurnLineageAction) => string;
};

type ComposerSettingsPanelHandlers = {
    setPrompt: (value: string) => void;
    setStickySendIntent: Dispatch<SetStateAction<StickySendIntent>>;
    toggleEnterToSubmit: () => void;
    handleGenerate: () => void;
    handleQueueBatchJob: () => void;
    handleQueueBatchFollowUpJob: () => void;
    handleCancelGeneration: () => void;
    handleStartNewConversation: () => void;
    handleFollowUpGenerate: () => void;
    handleSurpriseMe: () => void;
    handleSmartRewrite: () => void;
    handleImageToPrompt?: (file: File) => void | Promise<void>;
    openSettings: () => void;
    openAdvancedSettings: () => void;
    setActivePickerSheet: Dispatch<SetStateAction<PickerSheet>>;
};

export function useComposerSettingsPanelProps({
    prompt,
    placeholder,
    enterToSubmit,
    isGenerating,
    isActionLocked,
    isCancelFinalizing,
    isEnhancingPrompt,
    activePromptTool,
    currentLanguage,
    imageStyleLabel,
    outputFormat,
    thinkingLevel,
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
    isQueueBatchDisabled,
    queueBatchDisabledReason,
    queueBatchModeSummary,
    queueBatchGenerateModeSummary,
    queueBatchConversationNotice,
    promptTextareaRef,
    setPrompt,
    setStickySendIntent,
    toggleEnterToSubmit,
    handleGenerate,
    handleQueueBatchJob,
    handleQueueBatchFollowUpJob,
    handleCancelGeneration,
    handleStartNewConversation,
    handleFollowUpGenerate,
    handleSurpriseMe,
    handleSmartRewrite,
    handleImageToPrompt,
    openSettings,
    openAdvancedSettings,
    setActivePickerSheet,
    t,
    getStageOriginLabel,
    getLineageActionLabel,
}: UseComposerSettingsPanelPropsArgs): ComposerSettingsPanelProps {
    const getModelLabel = useCallback(
        (model: ImageModel) => {
            if (model === 'gemini-3.1-flash-image') {
                return t('modelGemini31Flash');
            }
            if (model === 'gemini-3-pro-image') {
                return t('modelGemini3Pro');
            }
            return t('modelGemini25Flash');
        },
        [t],
    );
    const latestHandlersRef = useRef<ComposerSettingsPanelHandlers>({
        setPrompt,
        setStickySendIntent,
        toggleEnterToSubmit,
        handleGenerate,
        handleQueueBatchJob,
        handleQueueBatchFollowUpJob,
        handleCancelGeneration,
        handleStartNewConversation,
        handleFollowUpGenerate,
        handleSurpriseMe,
        handleSmartRewrite,
        handleImageToPrompt,
        openSettings,
        openAdvancedSettings,
        setActivePickerSheet,
    });

    useLayoutEffect(() => {
        latestHandlersRef.current = {
            setPrompt,
            setStickySendIntent,
            toggleEnterToSubmit,
            handleGenerate,
            handleQueueBatchJob,
            handleQueueBatchFollowUpJob,
            handleCancelGeneration,
            handleStartNewConversation,
            handleFollowUpGenerate,
            handleSurpriseMe,
            handleSmartRewrite,
            handleImageToPrompt,
            openSettings,
            openAdvancedSettings,
            setActivePickerSheet,
        };
    }, [
        setPrompt,
        setStickySendIntent,
        toggleEnterToSubmit,
        handleGenerate,
        handleQueueBatchJob,
        handleQueueBatchFollowUpJob,
        handleCancelGeneration,
        handleStartNewConversation,
        handleFollowUpGenerate,
        handleSurpriseMe,
        handleSmartRewrite,
        handleImageToPrompt,
        openSettings,
        openAdvancedSettings,
        setActivePickerSheet,
    ]);

    return useMemo(
        () => ({
            prompt,
            placeholder,
            enterToSubmit,
            isGenerating,
            isActionLocked,
            isCancelFinalizing,
            isEnhancingPrompt,
            activePromptTool,
            currentLanguage,
            imageStyleLabel,
            outputFormat,
            thinkingLevel,
            groundingMode,
            stickySendIntent,
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
            isQueueBatchDisabled,
            queueBatchDisabledReason,
            queueBatchModeSummary,
            queueBatchGenerateModeSummary,
            queueBatchConversationNotice,
            promptTextareaRef,
            onPromptChange: (value: string) => latestHandlersRef.current.setPrompt(value),
            onStickySendIntentChange: (value: StickySendIntent) => latestHandlersRef.current.setStickySendIntent(value),
            onToggleEnterToSubmit: () => latestHandlersRef.current.toggleEnterToSubmit(),
            onGenerate: () => latestHandlersRef.current.handleGenerate(),
            onQueueBatchJob: () => latestHandlersRef.current.handleQueueBatchJob(),
            onQueueBatchFollowUpJob: () => latestHandlersRef.current.handleQueueBatchFollowUpJob(),
            onCancelGeneration: () => latestHandlersRef.current.handleCancelGeneration(),
            onStartNewConversation: () => latestHandlersRef.current.handleStartNewConversation(),
            onFollowUpGenerate: () => latestHandlersRef.current.handleFollowUpGenerate(),
            onSurpriseMe: () => latestHandlersRef.current.handleSurpriseMe(),
            onSmartRewrite: () => latestHandlersRef.current.handleSmartRewrite(),
            onImageToPrompt: handleImageToPrompt
                ? (file: File) => latestHandlersRef.current.handleImageToPrompt?.(file)
                : undefined,
            onOpenStyles: () => latestHandlersRef.current.setActivePickerSheet('styles'),
            onOpenSettings: () => latestHandlersRef.current.openSettings(),
            onToggleAdvancedSettings: () => latestHandlersRef.current.openAdvancedSettings(),
            getStageOriginLabel,
            getLineageActionLabel,
        }),
        [
            prompt,
            placeholder,
            enterToSubmit,
            isGenerating,
            isActionLocked,
            isCancelFinalizing,
            isEnhancingPrompt,
            activePromptTool,
            currentLanguage,
            imageStyleLabel,
            outputFormat,
            thinkingLevel,
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
            isQueueBatchDisabled,
            queueBatchDisabledReason,
            queueBatchModeSummary,
            queueBatchGenerateModeSummary,
            queueBatchConversationNotice,
            promptTextareaRef,
            getModelLabel,
            handleImageToPrompt,
            getStageOriginLabel,
            getLineageActionLabel,
        ],
    );
}
