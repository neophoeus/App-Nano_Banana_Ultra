import React from 'react';
import Button from './Button';
import WorkspaceModalFrame from './WorkspaceModalFrame';
import ComposerAdvancedSettingsContent from './ComposerAdvancedSettingsContent';
import { MODEL_CAPABILITIES } from '../constants';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { SAFETY_CATEGORY_KEYS, type GroundingMode, type ImageModel, type OutputFormat, type SafetyThresholds, type ThinkingLevel } from '../types';
import { getTranslation, type Language } from '../utils/translations';

type ComposerAdvancedSettingsDialogProps = {
    currentLanguage: Language;
    outputFormat: OutputFormat;
    thinkingLevel: ThinkingLevel;
    groundingMode: GroundingMode;
    safetyThresholds: SafetyThresholds;
    imageModel: ImageModel;
    capability: (typeof MODEL_CAPABILITIES)[ImageModel];
    availableGroundingModes: GroundingMode[];
    temperature: number;
    onOutputFormatChange: (value: OutputFormat) => void;
    onTemperatureChange: (value: number) => void;
    onThinkingLevelChange: (value: ThinkingLevel) => void;
    onGroundingModeChange: (value: GroundingMode) => void;
    onSafetyThresholdsChange: (value: SafetyThresholds) => void;
    isOpen: boolean;
    onClose: () => void;
    onApply?: () => void;
};

type AdvancedSettingsDraft = {
    outputFormat: OutputFormat;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    groundingMode: GroundingMode;
    safetyThresholds: SafetyThresholds;
};

export default function ComposerAdvancedSettingsDialog({
    isOpen,
    onClose,
    onApply,
    currentLanguage,
    outputFormat,
    thinkingLevel,
    groundingMode,
    safetyThresholds,
    imageModel,
    capability,
    availableGroundingModes,
    temperature,
    onOutputFormatChange,
    onTemperatureChange,
    onThinkingLevelChange,
    onGroundingModeChange,
    onSafetyThresholdsChange,
}: ComposerAdvancedSettingsDialogProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const usesControlledDraft = Boolean(onApply);
    const [localDraft, setLocalDraft] = React.useState<AdvancedSettingsDraft>({
        outputFormat,
        temperature,
        thinkingLevel,
        groundingMode,
        safetyThresholds,
    });
    const draft = usesControlledDraft
        ? {
              outputFormat,
              temperature,
              thinkingLevel,
              groundingMode,
              safetyThresholds,
          }
        : localDraft;

    React.useEffect(() => {
        if (!isOpen || usesControlledDraft) {
            return;
        }

        setLocalDraft({
            outputFormat,
            temperature,
            thinkingLevel,
            groundingMode,
            safetyThresholds,
        });
    }, [groundingMode, isOpen, outputFormat, safetyThresholds, temperature, thinkingLevel, usesControlledDraft]);

    const handleApply = () => {
        if (onApply) {
            onApply();
            return;
        }

        if (draft.outputFormat !== outputFormat) {
            onOutputFormatChange(draft.outputFormat);
        }
        if (draft.temperature !== temperature) {
            onTemperatureChange(draft.temperature);
        }
        if (draft.thinkingLevel !== thinkingLevel) {
            onThinkingLevelChange(draft.thinkingLevel);
        }
        if (draft.groundingMode !== groundingMode) {
            onGroundingModeChange(draft.groundingMode);
        }
        if (
            SAFETY_CATEGORY_KEYS.some(
                (categoryKey) => draft.safetyThresholds[categoryKey] !== safetyThresholds[categoryKey],
            )
        ) {
            onSafetyThresholdsChange(draft.safetyThresholds);
        }

        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <WorkspaceModalFrame
            dataTestId="composer-advanced-settings-dialog"
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.advancedSettings}
            maxWidthClass="max-w-6xl"
            onClose={onClose}
            closeLabel={t('clearHistoryCancel')}
            closeButtonTestId="composer-advanced-settings-close"
            title={t('composerAdvancedTitle')}
            backdropClassName="bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_34%),rgba(15,23,42,0.76)] backdrop-blur-md"
            panelClassName="nbu-overlay-panel-neutral max-h-[88vh]"
            headerClassName="border-b border-gray-200/80 px-5 py-4 dark:border-gray-700/80"
            closeButtonClassName="nbu-control-button px-3 py-1.5 text-[11px] font-semibold"
        >
            <div className="flex max-h-[calc(88vh-96px)] min-h-0 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <ComposerAdvancedSettingsContent
                        currentLanguage={currentLanguage}
                        outputFormat={draft.outputFormat}
                        thinkingLevel={draft.thinkingLevel}
                        groundingMode={draft.groundingMode}
                        safetyThresholds={draft.safetyThresholds}
                        imageModel={imageModel}
                        capability={capability}
                        availableGroundingModes={availableGroundingModes}
                        temperature={draft.temperature}
                        onOutputFormatChange={(value) =>
                            usesControlledDraft
                                ? onOutputFormatChange(value)
                                : setLocalDraft((previous) => ({
                                      ...previous,
                                      outputFormat: value,
                                  }))
                        }
                        onTemperatureChange={(value) =>
                            usesControlledDraft
                                ? onTemperatureChange(value)
                                : setLocalDraft((previous) => ({
                                      ...previous,
                                      temperature: value,
                                  }))
                        }
                        onThinkingLevelChange={(value) =>
                            usesControlledDraft
                                ? onThinkingLevelChange(value)
                                : setLocalDraft((previous) => ({
                                      ...previous,
                                      thinkingLevel: value,
                                  }))
                        }
                        onGroundingModeChange={(value) =>
                            usesControlledDraft
                                ? onGroundingModeChange(value)
                                : setLocalDraft((previous) => ({
                                      ...previous,
                                      groundingMode: value,
                                  }))
                        }
                        onSafetyThresholdsChange={(value) =>
                            usesControlledDraft
                                ? onSafetyThresholdsChange(value)
                                : setLocalDraft((previous) => ({
                                      ...previous,
                                      safetyThresholds: value,
                                  }))
                        }
                    />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-200/80 px-5 py-4 dark:border-gray-700/80">
                    <Button type="button" data-testid="composer-advanced-settings-apply" onClick={handleApply}>
                        {t('generationSettingsApply')}
                    </Button>
                </div>
            </div>
        </WorkspaceModalFrame>
    );
}
