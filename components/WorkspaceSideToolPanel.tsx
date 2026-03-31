import React from 'react';
import { StageAsset, TurnLineageAction } from '../types';
import { getTranslation, Language } from '../utils/translations';
import Button from './Button';

type WorkspaceSideToolPanelProps = {
    currentLanguage: Language;
    editorBaseAsset: StageAsset | null;
    currentStageAsset: StageAsset | null;
    onUploadBaseImage: () => void;
    onOpenSketchPad: () => void;
    onOpenEditor: () => void;
    getStageOriginLabel: (origin?: StageAsset['origin']) => string;
    getLineageActionLabel: (action?: TurnLineageAction) => string;
};

function WorkspaceSideToolPanel({
    currentLanguage,
    editorBaseAsset,
    currentStageAsset,
    onUploadBaseImage,
    onOpenSketchPad,
    onOpenEditor,
    getStageOriginLabel,
    getLineageActionLabel,
}: WorkspaceSideToolPanelProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const editorEntryLabel = currentStageAsset
        ? t('workspaceViewerEditCurrentImage')
        : editorBaseAsset
          ? t('workspaceViewerContinueEditing')
          : t('workspaceViewerUploadBaseToEdit');
    const stageSourceDetail = currentStageAsset
        ? [
              getStageOriginLabel(currentStageAsset.origin),
              currentStageAsset.lineageAction ? getLineageActionLabel(currentStageAsset.lineageAction) : null,
          ]
              .filter(Boolean)
              .join(' · ')
        : t('stageOriginNotStaged');
    const editorBaseDetail = editorBaseAsset ? getStageOriginLabel(editorBaseAsset.origin) : t('stageOriginNotStaged');

    return (
        <aside
            data-testid="workspace-side-tool-panel"
            className="nbu-subpanel nbu-shell-surface-actions-bar min-w-0 overflow-hidden p-3"
        >
            <div className="min-w-0">
                <div className="min-w-0 flex-1">
                    <p className="nbu-section-eyebrow">{t('composerActionPanelEyebrow')}</p>
                    <h2 className="mt-1 text-[15px] font-black text-gray-900 dark:text-gray-100">
                        {t('workspaceSideToolTitle')}
                    </h2>
                    <p className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {stageSourceDetail}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="nbu-chip">
                            {t('workspaceSideToolBaseImage')}: {editorBaseDetail}
                        </span>
                    </div>
                </div>
            </div>

            <div data-testid="workspace-side-tools-actions" className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
                <Button
                    variant="secondary"
                    onClick={onUploadBaseImage}
                    className="min-w-0 justify-center rounded-[16px] whitespace-normal text-center"
                    data-testid="side-tools-upload-base"
                >
                    {t('workspacePickerUploadBaseImage')}
                </Button>
                <Button
                    variant="secondary"
                    onClick={onOpenEditor}
                    className="min-w-0 justify-center rounded-[16px] whitespace-normal text-center"
                    data-testid="side-tools-open-editor"
                >
                    {editorEntryLabel}
                </Button>
                <Button
                    variant="secondary"
                    onClick={onOpenSketchPad}
                    className="min-w-0 justify-center rounded-[16px] whitespace-normal text-center"
                    data-testid="side-tools-open-sketchpad"
                >
                    {t('workspacePickerOpenSketchPad')}
                </Button>
            </div>

            <div className="mt-3 grid gap-2.5 xl:grid-cols-2">
                <div className="nbu-inline-panel px-3 py-2.5">
                    <div className="min-w-0">
                        <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                            {t('workspaceSideToolBaseImage')}
                        </div>
                        <div className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {editorBaseDetail}
                        </div>
                    </div>
                </div>

                <div className="nbu-inline-panel px-3 py-2.5">
                    <div className="min-w-0">
                        <div className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                            {t('workspaceSideToolCurrentImage')}
                        </div>
                        <div className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {stageSourceDetail}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default React.memo(WorkspaceSideToolPanel);
