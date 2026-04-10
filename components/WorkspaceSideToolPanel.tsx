import React from 'react';
import { useResponsivePanelState } from '../hooks/useResponsivePanelState';
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
    const { isDesktop, isOpen: isPanelOpen, setIsOpen: setIsPanelOpen } = useResponsivePanelState();
    const referencesCardId = React.useId();
    const referencesRootRef = React.useRef<HTMLDivElement | null>(null);
    const [isReferencesOpen, setIsReferencesOpen] = React.useState(false);
    const actionButtonClassName =
        'min-w-0 justify-start rounded-[14px] px-2.5 py-2 whitespace-normal text-left text-[12px] font-semibold leading-[1.15]';
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
            isActive: objectImages.length > 0,
        },
        ...(maxCharacters > 0
            ? [
                  {
                      key: 'character',
                      label: t('workspacePickerCharacters'),
                      count: characterImages.length,
                      max: maxCharacters,
                      isActive: characterImages.length > 0,
                  },
              ]
            : []),
    ];
    const renderDisclosureChevron = () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
        >
            <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
            />
        </svg>
    );

    React.useEffect(() => {
        if (!isReferencesOpen) {
            return undefined;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!referencesRootRef.current?.contains(event.target as Node)) {
                setIsReferencesOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsReferencesOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isReferencesOpen]);

    const panelBody = (
        <div className="mt-1.5 space-y-1.5">
            <div data-testid="workspace-side-tools-actions-card" className="nbu-inline-panel p-2.5">
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
                        <span className="block min-w-0 leading-[1.2]">{t('workspaceSideToolRepaintCurrentImage')}</span>
                    </Button>
                </div>
            </div>

            <div data-testid="workspace-side-tools-sketch-card" className="nbu-inline-panel p-2.5">
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

            <div
                ref={referencesRootRef}
                data-testid="workspace-side-tools-references-card"
                className="relative nbu-inline-panel p-2.5"
            >
                <div className="space-y-1.5 overflow-visible">
                    <button
                        type="button"
                        data-testid="workspace-side-tools-references-toggle"
                        aria-expanded={isReferencesOpen}
                        aria-controls={isReferencesOpen ? referencesCardId : undefined}
                        aria-haspopup="dialog"
                        onClick={() => setIsReferencesOpen((previous) => !previous)}
                        className="flex w-full items-start justify-between gap-2 rounded-[16px] border border-slate-200/80 bg-white/80 px-3 py-2 text-left transition-colors hover:border-amber-200 hover:bg-amber-50/85 dark:border-slate-700/80 dark:bg-slate-900/70 dark:hover:border-amber-500/20 dark:hover:bg-amber-950/15"
                    >
                        <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                            <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-slate-200/80 bg-white/85 px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/85 dark:text-slate-300">
                                {t('workspaceSheetTitleReferences')}
                            </span>
                            <div
                                data-testid="workspace-side-tools-references-summary"
                                className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]"
                            >
                                {referenceSummaryItems.map((item) => (
                                    <span
                                        key={item.key}
                                        data-testid={`workspace-side-tools-references-summary-${item.key}`}
                                        className={item.isActive
                                            ? 'shrink-0 font-black tracking-[0.01em] text-amber-700 dark:text-amber-200'
                                            : 'shrink-0 font-semibold text-slate-500 dark:text-slate-400'}
                                    >
                                        {`${item.label} ${item.count}/${item.max}`}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300">
                            <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                {isReferencesOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M17 7 7 17" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M6 12h12" />
                                )}
                            </svg>
                        </span>
                    </button>

                    {isReferencesOpen && (
                        <div
                            data-testid="workspace-side-tool-references"
                            id={referencesCardId}
                            role="dialog"
                            aria-label={t('workspaceSheetTitleReferences')}
                            className="nbu-floating-panel absolute bottom-[calc(100%+0.5rem)] left-0 top-auto z-40 flex max-h-[min(32rem,calc(100vh-1rem))] w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-2.5 xl:right-[calc(100%+0.75rem)] xl:bottom-0 xl:left-auto xl:top-auto xl:w-[min(23rem,calc(100vw-4rem))]"
                        >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="inline-flex h-6 items-center rounded-full border border-slate-200/80 bg-white/85 px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/85 dark:text-slate-300">
                                    {t('workspaceSheetTitleReferences')}
                                </span>
                                <button
                                    type="button"
                                    aria-label={t('workspaceViewerClose')}
                                    onClick={() => setIsReferencesOpen(false)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-500 transition-colors hover:border-amber-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:text-slate-100"
                                >
                                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
                                        <path
                                            d="M5 5 15 15M15 5 5 15"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <div className="nbu-scrollbar-subtle space-y-1.5 overflow-y-auto pr-1">
                                <ImageUploader
                                    images={objectImages}
                                    onImagesChange={setObjectImages}
                                    disabled={isGenerating}
                                    label={t('objectRefs')}
                                    currentLanguage={currentLanguage}
                                    onWarning={(message) => showNotification(message, 'error')}
                                    maxImages={maxObjects}
                                    gridColumns={5}
                                    lazyMountImages={true}
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
                                        gridColumns={5}
                                        lazyMountImages={true}
                                        prefixTag="Char"
                                        safeLimit={Math.max(1, Math.floor(maxCharacters / 2))}
                                        onRemove={handleRemoveCharacterReference}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <aside
            data-testid="workspace-side-tool-panel"
            className="nbu-subpanel nbu-shell-surface-actions-bar min-w-0 overflow-visible p-2.5"
        >
            {isDesktop ? (
                <>
                    <div className="min-w-0">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-[14px] font-black text-gray-900 dark:text-gray-100">
                                {t('workspaceSideToolTitle')}
                            </h2>
                        </div>
                    </div>
                    {panelBody}
                </>
            ) : (
                <details
                    data-testid="workspace-side-tool-panel-disclosure"
                    open={isPanelOpen}
                    onToggle={(event) => setIsPanelOpen(event.currentTarget.open)}
                    className="group"
                >
                    <summary
                        data-testid="workspace-side-tool-panel-summary"
                        className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 py-1 text-left [&::-webkit-details-marker]:hidden"
                    >
                        <span className="text-[14px] font-black text-gray-900 dark:text-gray-100">
                            {t('workspaceSideToolTitle')}
                        </span>
                        {renderDisclosureChevron()}
                    </summary>
                    {panelBody}
                </details>
            )}
        </aside>
    );
}

export default React.memo(WorkspaceSideToolPanel);
