import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';
import type { PickerSheet } from '../components/WorkspacePickerSheet';
import { IMAGE_MODELS, MODEL_CAPABILITIES } from '../constants';
import {
    AspectRatio,
    DEFAULT_SAFETY_THRESHOLDS,
    GroundingMode,
    ImageModel,
    ImageSize,
    OutputFormat,
    SafetyThresholds,
    ThinkingLevel,
    WorkspaceSettingsDraft,
} from '../types';
import { getAvailableGroundingModes, getGroundingFlagsFromMode } from '../utils/groundingMode';
import { normalizeTemperature } from '../utils/temperature';

type GenerationSettingsDraft = Pick<WorkspaceSettingsDraft, 'imageModel' | 'aspectRatio' | 'imageSize' | 'batchSize'>;

type UseWorkspaceSettingsSessionArgs = {
    activeEditorLockedAspectRatio: AspectRatio | null;
    imageModel: ImageModel;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
    outputFormat: OutputFormat;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    groundingMode: GroundingMode;
    safetyThresholds: SafetyThresholds;
    closePickerSheet: () => void;
    setActivePickerSheet: Dispatch<SetStateAction<PickerSheet>>;
    setIsAdvancedSettingsOpen: Dispatch<SetStateAction<boolean>>;
    setImageModel: Dispatch<SetStateAction<ImageModel>>;
    setAspectRatio: Dispatch<SetStateAction<AspectRatio>>;
    setImageSize: Dispatch<SetStateAction<ImageSize>>;
    setBatchSize: Dispatch<SetStateAction<number>>;
    setOutputFormat: Dispatch<SetStateAction<OutputFormat>>;
    setTemperature: Dispatch<SetStateAction<number>>;
    setThinkingLevel: Dispatch<SetStateAction<ThinkingLevel>>;
    setGroundingMode: (mode: GroundingMode) => void;
    setSafetyThresholds: Dispatch<SetStateAction<SafetyThresholds>>;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    t: (key: string) => string;
};

export function useWorkspaceSettingsSession({
    activeEditorLockedAspectRatio,
    imageModel,
    aspectRatio,
    imageSize,
    batchSize,
    outputFormat,
    temperature,
    thinkingLevel,
    groundingMode,
    safetyThresholds,
    closePickerSheet,
    setActivePickerSheet,
    setIsAdvancedSettingsOpen,
    setImageModel,
    setAspectRatio,
    setImageSize,
    setBatchSize,
    setOutputFormat,
    setTemperature,
    setThinkingLevel,
    setGroundingMode,
    setSafetyThresholds,
    showNotification,
    t,
}: UseWorkspaceSettingsSessionArgs) {
    const [settingsSessionDraft, setSettingsSessionDraft] = useState<WorkspaceSettingsDraft | null>(null);
    const [settingsSessionReturnToGeneration, setSettingsSessionReturnToGeneration] = useState(false);

    const normalizeSettingsSessionDraft = useCallback(
        (draft: WorkspaceSettingsDraft): WorkspaceSettingsDraft => {
            let nextImageModel = draft.imageModel;

            if (
                activeEditorLockedAspectRatio &&
                !MODEL_CAPABILITIES[nextImageModel].supportedRatios.includes(activeEditorLockedAspectRatio)
            ) {
                nextImageModel =
                    IMAGE_MODELS.find((model) =>
                        MODEL_CAPABILITIES[model].supportedRatios.includes(activeEditorLockedAspectRatio),
                    ) || nextImageModel;
            }

            const nextCapability = MODEL_CAPABILITIES[nextImageModel];
            const nextAspectRatio = activeEditorLockedAspectRatio
                ? activeEditorLockedAspectRatio
                : nextCapability.supportedRatios.includes(draft.aspectRatio)
                  ? draft.aspectRatio
                  : nextCapability.supportedRatios.includes('1:1')
                    ? '1:1'
                    : nextCapability.supportedRatios[0] || draft.aspectRatio;
            const nextImageSize =
                nextCapability.supportedSizes.length === 0
                    ? draft.imageSize
                    : nextCapability.supportedSizes.includes(draft.imageSize)
                      ? draft.imageSize
                      : nextCapability.supportedSizes.includes('1K')
                        ? '1K'
                        : nextCapability.supportedSizes[0];
            const nextThinkingLevel = nextCapability.thinkingLevels.includes(draft.thinkingLevel)
                ? draft.thinkingLevel
                : nextCapability.thinkingLevels.includes('minimal')
                  ? 'minimal'
                  : nextCapability.thinkingLevels[0] || 'disabled';
            const nextGroundingMode = getAvailableGroundingModes(nextCapability).includes(draft.groundingMode)
                ? draft.groundingMode
                : 'off';
            let nextOutputFormat = nextCapability.outputFormats.includes(draft.outputFormat)
                ? draft.outputFormat
                : nextCapability.outputFormats[0];

            if (getGroundingFlagsFromMode(nextGroundingMode).imageSearch) {
                nextOutputFormat = 'images-and-text';
            }

            return {
                ...draft,
                imageModel: nextImageModel,
                aspectRatio: nextAspectRatio,
                imageSize: nextImageSize,
                outputFormat: nextOutputFormat,
                temperature: normalizeTemperature(draft.temperature),
                thinkingLevel: nextThinkingLevel,
                groundingMode: nextGroundingMode,
                safetyThresholds: {
                    ...DEFAULT_SAFETY_THRESHOLDS,
                    ...(draft.safetyThresholds || {}),
                },
            };
        },
        [activeEditorLockedAspectRatio],
    );

    const buildSettingsSessionDraft = useCallback(
        () =>
            normalizeSettingsSessionDraft({
                imageModel,
                aspectRatio,
                imageSize,
                batchSize,
                outputFormat,
                temperature,
                thinkingLevel,
                groundingMode,
                safetyThresholds,
            }),
        [
            normalizeSettingsSessionDraft,
            imageModel,
            aspectRatio,
            imageSize,
            batchSize,
            outputFormat,
            temperature,
            thinkingLevel,
            groundingMode,
            safetyThresholds,
        ],
    );

    const updateSettingsSessionDraft = useCallback(
        (updater: SetStateAction<WorkspaceSettingsDraft>) => {
            setSettingsSessionDraft((previous) => {
                const baseDraft = previous ?? buildSettingsSessionDraft();
                const nextDraft = typeof updater === 'function' ? updater(baseDraft) : updater;

                return normalizeSettingsSessionDraft(nextDraft);
            });
        },
        [buildSettingsSessionDraft, normalizeSettingsSessionDraft],
    );

    const clearSettingsSession = useCallback(() => {
        setSettingsSessionDraft(null);
        setSettingsSessionReturnToGeneration(false);
    }, []);

    const settingsSessionView = useMemo(
        () => settingsSessionDraft ?? buildSettingsSessionDraft(),
        [buildSettingsSessionDraft, settingsSessionDraft],
    );
    const settingsSessionCapability = useMemo(
        () => MODEL_CAPABILITIES[settingsSessionView.imageModel],
        [settingsSessionView.imageModel],
    );
    const settingsSessionAvailableGroundingModes = useMemo(
        () => getAvailableGroundingModes(settingsSessionCapability),
        [settingsSessionCapability],
    );
    const generationSettingsDraft = useMemo<GenerationSettingsDraft>(
        () => ({
            imageModel: settingsSessionView.imageModel,
            aspectRatio: settingsSessionView.aspectRatio,
            imageSize: settingsSessionView.imageSize,
            batchSize: settingsSessionView.batchSize,
        }),
        [
            settingsSessionView.aspectRatio,
            settingsSessionView.batchSize,
            settingsSessionView.imageModel,
            settingsSessionView.imageSize,
        ],
    );

    const ensureSettingsSessionDraft = useCallback(() => {
        setSettingsSessionDraft((previous) => previous ?? buildSettingsSessionDraft());
    }, [buildSettingsSessionDraft]);

    const openGenerationSettingsSession = useCallback(() => {
        ensureSettingsSessionDraft();
        setSettingsSessionReturnToGeneration(false);
        setIsAdvancedSettingsOpen(false);
        setActivePickerSheet('settings');
    }, [ensureSettingsSessionDraft, setActivePickerSheet, setIsAdvancedSettingsOpen]);

    const openAdvancedSettingsSession = useCallback(() => {
        ensureSettingsSessionDraft();
        setSettingsSessionReturnToGeneration(false);
        setActivePickerSheet(null);
        setIsAdvancedSettingsOpen(true);
    }, [ensureSettingsSessionDraft, setActivePickerSheet, setIsAdvancedSettingsOpen]);

    const openAdvancedSettingsFromGeneration = useCallback(() => {
        ensureSettingsSessionDraft();
        setSettingsSessionReturnToGeneration(true);
        setActivePickerSheet(null);
        setIsAdvancedSettingsOpen(true);
    }, [ensureSettingsSessionDraft, setActivePickerSheet, setIsAdvancedSettingsOpen]);

    const handleCloseSettingsSheetSession = useCallback(() => {
        clearSettingsSession();
        closePickerSheet();
    }, [clearSettingsSession, closePickerSheet]);

    const handleCloseAdvancedSettingsSession = useCallback(() => {
        if (settingsSessionReturnToGeneration) {
            setIsAdvancedSettingsOpen(false);
            setSettingsSessionReturnToGeneration(false);
            setActivePickerSheet('settings');
            return;
        }

        setIsAdvancedSettingsOpen(false);
        clearSettingsSession();
    }, [clearSettingsSession, setActivePickerSheet, setIsAdvancedSettingsOpen, settingsSessionReturnToGeneration]);

    const handleApplySettingsSessionDraft = useCallback(() => {
        const nextDraft = normalizeSettingsSessionDraft(settingsSessionDraft ?? buildSettingsSessionDraft());
        const nextCapability = MODEL_CAPABILITIES[nextDraft.imageModel];

        setImageModel(nextDraft.imageModel);
        setAspectRatio(nextDraft.aspectRatio);
        if (nextCapability.supportedSizes.length > 0) {
            setImageSize(nextDraft.imageSize);
        }
        setBatchSize(nextDraft.batchSize);
        setOutputFormat(nextDraft.outputFormat);
        setTemperature(nextDraft.temperature);
        setThinkingLevel(nextDraft.thinkingLevel);
        setGroundingMode(nextDraft.groundingMode);
        setSafetyThresholds(nextDraft.safetyThresholds);
        setActivePickerSheet(null);
        setIsAdvancedSettingsOpen(false);
        clearSettingsSession();
    }, [
        buildSettingsSessionDraft,
        clearSettingsSession,
        normalizeSettingsSessionDraft,
        setActivePickerSheet,
        setAspectRatio,
        setBatchSize,
        setGroundingMode,
        setImageModel,
        setImageSize,
        setIsAdvancedSettingsOpen,
        setOutputFormat,
        setSafetyThresholds,
        setTemperature,
        setThinkingLevel,
        settingsSessionDraft,
    ]);

    const handleUpdateGenerationSettingsDraft = useCallback(
        (updater: SetStateAction<GenerationSettingsDraft>) => {
            updateSettingsSessionDraft((previous) => {
                const baseGenerationDraft = {
                    imageModel: previous.imageModel,
                    aspectRatio: previous.aspectRatio,
                    imageSize: previous.imageSize,
                    batchSize: previous.batchSize,
                };
                const nextGenerationDraft = typeof updater === 'function' ? updater(baseGenerationDraft) : updater;

                return {
                    ...previous,
                    ...nextGenerationDraft,
                };
            });
        },
        [updateSettingsSessionDraft],
    );

    const handleSettingsSessionGroundingModeChange = useCallback(
        (nextMode: WorkspaceSettingsDraft['groundingMode']) => {
            const nextFlags = getGroundingFlagsFromMode(nextMode);
            const shouldUpgrade = nextFlags.imageSearch && settingsSessionView.outputFormat !== 'images-and-text';

            updateSettingsSessionDraft((previous) => ({
                ...previous,
                groundingMode: nextMode,
                outputFormat: nextFlags.imageSearch ? 'images-and-text' : previous.outputFormat,
            }));

            if (shouldUpgrade) {
                showNotification(t('composerGroundingImageSearchUpgradeNotice'), 'info');
            }
        },
        [settingsSessionView.outputFormat, showNotification, t, updateSettingsSessionDraft],
    );

    return {
        clearSettingsSession,
        generationSettingsDraft,
        handleApplySettingsSessionDraft,
        handleCloseAdvancedSettingsSession,
        handleCloseSettingsSheetSession,
        handleSettingsSessionGroundingModeChange,
        handleUpdateGenerationSettingsDraft,
        openAdvancedSettingsFromGeneration,
        openAdvancedSettingsSession,
        openGenerationSettingsSession,
        settingsSessionAvailableGroundingModes,
        settingsSessionCapability,
        settingsSessionView,
        updateSettingsSessionDraft,
    };
}
