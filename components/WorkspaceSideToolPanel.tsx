import React from 'react';
import { getTranslation, Language } from '../utils/translations';
import Button from './Button';
import ImageUploader from './ImageUploader';

type WorkspaceSideToolPanelProps = {
    currentLanguage: Language;
    canEditCurrentImage: boolean;
    onOpenSketchPad: () => void;
    onOpenEditor: () => void;
    objectImages: string[];
    characterImages: string[];
    maxObjects: number;
    maxCharacters: number;
    setObjectImages: (nextImages: string[] | ((prev: string[]) => string[])) => void;
    setCharacterImages: (nextImages: string[] | ((prev: string[]) => string[])) => void;
    isGenerating: boolean;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    handleRemoveObjectReference: (index: number) => void;
    handleRemoveCharacterReference: (index: number) => void;
};

function WorkspaceSideToolPanel({
    currentLanguage,
    canEditCurrentImage,
    onOpenSketchPad,
    onOpenEditor,
    objectImages,
    characterImages,
    maxObjects,
    maxCharacters,
    setObjectImages,
    setCharacterImages,
    isGenerating,
    showNotification,
    handleRemoveObjectReference,
    handleRemoveCharacterReference,
}: WorkspaceSideToolPanelProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const editorEntryLabel = canEditCurrentImage
        ? t('workspaceViewerEditCurrentImage')
        : t('workspaceViewerUploadBaseToEdit');

    return (
        <aside
            data-testid="workspace-side-tool-panel"
            className="nbu-subpanel nbu-shell-surface-actions-bar min-w-0 overflow-hidden p-3"
        >
            <div className="min-w-0">
                <div className="min-w-0 flex-1">
                    <h2 className="text-[15px] font-black text-gray-900 dark:text-gray-100">
                        {t('workspaceSideToolTitle')}
                    </h2>
                </div>
            </div>

            <div className="mt-3 space-y-3">
                <div data-testid="workspace-side-tools-actions-card" className="nbu-inline-panel p-3">
                    <div
                        data-testid="workspace-side-tools-actions"
                        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2"
                    >
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
                </div>

                <div data-testid="workspace-side-tools-references-card" className="nbu-inline-panel p-3">
                    <div data-testid="workspace-side-tool-references" className="space-y-4">
                        <ImageUploader
                            images={objectImages}
                            onImagesChange={setObjectImages}
                            disabled={isGenerating}
                            label={t('objectRefs')}
                            currentLanguage={currentLanguage}
                            onWarning={(message) => showNotification(message, 'error')}
                            maxImages={maxObjects}
                            prefixTag="Obj"
                            safeLimit={Math.max(1, Math.floor(maxObjects / 2))}
                            onRemove={handleRemoveObjectReference}
                        />

                        {maxCharacters > 0 && (
                            <ImageUploader
                                images={characterImages}
                                onImagesChange={setCharacterImages}
                                disabled={isGenerating}
                                label={t('characterRefs')}
                                currentLanguage={currentLanguage}
                                onWarning={(message) => showNotification(message, 'error')}
                                maxImages={maxCharacters}
                                prefixTag="Char"
                                safeLimit={Math.max(1, Math.floor(maxCharacters / 2))}
                                onRemove={handleRemoveCharacterReference}
                            />
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default React.memo(WorkspaceSideToolPanel);
