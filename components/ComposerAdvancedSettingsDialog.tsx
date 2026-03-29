import React from 'react';
import WorkspaceModalFrame from './WorkspaceModalFrame';
import ComposerAdvancedSettingsContent from './ComposerAdvancedSettingsContent';
import type { ComposerSettingsPanelProps } from './ComposerSettingsPanel';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { getTranslation } from '../utils/translations';

type ComposerAdvancedSettingsDialogProps = ComposerSettingsPanelProps & {
    isOpen: boolean;
    onClose: () => void;
};

export default function ComposerAdvancedSettingsDialog({
    isOpen,
    onClose,
    currentLanguage,
    outputFormat,
    structuredOutputMode,
    thinkingLevel,
    includeThoughts,
    groundingMode,
    imageModel,
    capability,
    availableGroundingModes,
    temperature,
    onOutputFormatChange,
    onStructuredOutputModeChange,
    onTemperatureChange,
    onThinkingLevelChange,
    onGroundingModeChange,
}: ComposerAdvancedSettingsDialogProps) {
    if (!isOpen) {
        return null;
    }

    const t = (key: string) => getTranslation(currentLanguage, key);

    return (
        <WorkspaceModalFrame
            dataTestId="composer-advanced-settings-dialog"
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.advancedSettings}
            maxWidthClass="max-w-6xl"
            onClose={onClose}
            closeLabel={t('workspaceViewerClose')}
            closeButtonTestId="composer-advanced-settings-close"
            eyebrow={t('composerAdvancedEyebrow')}
            title={t('composerAdvancedTitle')}
            backdropClassName="bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_34%),rgba(15,23,42,0.76)] backdrop-blur-md"
            panelClassName="nbu-overlay-panel-neutral max-h-[88vh]"
            headerClassName="border-b border-gray-200/80 px-6 py-5 dark:border-gray-700/80"
            closeButtonClassName="nbu-control-button px-3 py-2 text-sm"
        >
            <div className="max-h-[calc(88vh-108px)] overflow-y-auto p-6">
                <ComposerAdvancedSettingsContent
                    currentLanguage={currentLanguage}
                    outputFormat={outputFormat}
                    structuredOutputMode={structuredOutputMode}
                    thinkingLevel={thinkingLevel}
                    includeThoughts={includeThoughts}
                    groundingMode={groundingMode}
                    imageModel={imageModel}
                    capability={capability}
                    availableGroundingModes={availableGroundingModes}
                    temperature={temperature}
                    onOutputFormatChange={onOutputFormatChange}
                    onStructuredOutputModeChange={onStructuredOutputModeChange}
                    onTemperatureChange={onTemperatureChange}
                    onThinkingLevelChange={onThinkingLevelChange}
                    onGroundingModeChange={onGroundingModeChange}
                />
            </div>
        </WorkspaceModalFrame>
    );
}
