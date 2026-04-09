import React from 'react';
import { getTranslation, Language } from '../utils/translations';
import Button from './Button';
import ImageUploader from './ImageUploader';

type WorkspaceSideToolPanelProps = {
    currentLanguage: Language;
    canEditCurrentImage: boolean;
    onOpenSketchPad: () => void;
    onOpenEditor: () => void;
    onOpenUploadToRepaint: () => void;
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
    onOpenUploadToRepaint,
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
    const [isReferencesExpanded, setIsReferencesExpanded] = React.useState(false);
    const actionButtonClassName =
        'min-w-0 justify-start rounded-[16px] px-3 py-2.5 whitespace-normal text-left text-[13px] font-semibold leading-[1.2]';
    const uploadToRepaintIcon = (
        <svg
            aria-hidden="true"
            data-testid="side-tools-upload-to-repaint-icon"
            className="h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 7.5 12 4l3.5 3.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 14.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5" />
        </svg>
    );
    const repaintCurrentImageIcon = (
        <svg
            aria-hidden="true"
            data-testid="side-tools-repaint-current-icon"
            className="h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 18.5V20h1.5L17 8.5 15.5 7 4 18.5Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 8l1.5-1.5L17.5 8 16 9.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 20h12" />
        </svg>
    );
    const sketchpadIcon = (
        <svg
            aria-hidden="true"
            data-testid="side-tools-open-sketchpad-icon"
            className="h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 19.5h14" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5 16 8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 7 2 2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18l1.5-4.5L12 9l3 3-4.5 4.5L6 18Z" />
        </svg>
    );
    const referenceSummaryItems = [
        {
            key: 'object',
            label: t('workspacePickerObjects'),
            count: objectImages.length,
            max: maxObjects,
        },
        ...(maxCharacters > 0
            ? [
                  {
                      key: 'character',
                      label: t('workspacePickerCharacters'),
                      count: characterImages.length,
                      max: maxCharacters,
                  },
              ]
            : []),
    ];

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

            <div className="mt-1.5 space-y-1.5">
                <div data-testid="workspace-side-tools-actions-card" className="nbu-inline-panel p-3">
                    <div data-testid="workspace-side-tools-actions" className="space-y-1.5">
                        <Button
                            variant="secondary"
                            onClick={onOpenUploadToRepaint}
                            icon={uploadToRepaintIcon}
                            className={`${actionButtonClassName} w-full`}
                            data-testid="side-tools-upload-to-repaint"
                        >
                            <span className="block min-w-0 leading-[1.2]">{t('workspaceSideToolUploadToRepaint')}</span>
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={onOpenEditor}
                            icon={repaintCurrentImageIcon}
                            className={`${actionButtonClassName} w-full disabled:text-slate-400 disabled:hover:shadow-none dark:disabled:text-slate-500`}
                            data-testid="side-tools-repaint-current"
                            disabled={!canEditCurrentImage}
                        >
                            <span className="block min-w-0 leading-[1.2]">
                                {t('workspaceSideToolRepaintCurrentImage')}
                            </span>
                        </Button>
                    </div>
                </div>

                <div data-testid="workspace-side-tools-sketch-card" className="nbu-inline-panel p-3">
                    <Button
                        variant="secondary"
                        onClick={onOpenSketchPad}
                        icon={sketchpadIcon}
                        className={`${actionButtonClassName} w-full`}
                        data-testid="side-tools-open-sketchpad"
                    >
                        <span className="block min-w-0 leading-[1.2]">{t('workspaceSideToolDrawReferenceSketch')}</span>
                    </Button>
                </div>

                <div data-testid="workspace-side-tools-references-card" className="nbu-inline-panel p-3">
                    <div className="space-y-1.5">
                        <button
                            type="button"
                            data-testid="workspace-side-tools-references-toggle"
                            aria-expanded={isReferencesExpanded}
                            aria-controls="workspace-side-tool-references"
                            onClick={() => setIsReferencesExpanded((previous) => !previous)}
                            className="flex w-full items-start justify-between gap-2 rounded-[18px] border border-slate-200/80 bg-white/75 px-3 py-2 text-left transition-colors hover:border-amber-200 hover:bg-amber-50/80 dark:border-slate-700/80 dark:bg-slate-900/70 dark:hover:border-amber-500/20 dark:hover:bg-amber-950/15"
                        >
                            <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                                <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-slate-200/80 bg-white/85 px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/85 dark:text-slate-300">
                                    {t('workspaceSheetTitleReferences')}
                                </span>
                                <div
                                    data-testid="workspace-side-tools-references-summary"
                                    className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                                >
                                    {referenceSummaryItems.map((item) => (
                                        <span
                                            key={item.key}
                                            data-testid={`workspace-side-tools-references-summary-${item.key}`}
                                            className="shrink-0"
                                        >
                                            {`${item.label} ${item.count}/${item.max}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-500 transition-transform dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300">
                                <svg
                                    aria-hidden="true"
                                    className={`h-4 w-4 transition-transform ${isReferencesExpanded ? 'rotate-180' : ''}`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                                </svg>
                            </span>
                        </button>

                        {isReferencesExpanded && (
                            <div data-testid="workspace-side-tool-references" id="workspace-side-tool-references" className="space-y-1.5">
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
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default React.memo(WorkspaceSideToolPanel);
