import React from 'react';
import { getTranslation, Language } from '../utils/translations';

export type SurfaceSharedControlSheet =
    | 'prompt'
    | 'styles'
    | 'settings'
    | 'model'
    | 'ratio'
    | 'size'
    | 'batch'
    | 'references';

export type SurfaceSharedControlsVariant = 'full' | 'sketch';

type SurfaceSharedControlsProps = {
    currentLanguage: Language;
    isOpen: boolean;
    workspaceLabel: string;
    stateDescription: string;
    activeSheetLabel: string;
    activePickerSheet: SurfaceSharedControlSheet | null;
    isAdvancedSettingsOpen: boolean;
    promptPreview: string;
    totalReferenceCount: number;
    styleLabel: string;
    modelLabel: string;
    aspectRatio: string;
    imageSize: string;
    batchSize: number;
    objectImageCount: number;
    characterImageCount: number;
    maxObjects: number;
    maxCharacters: number;
    settingsVariant: SurfaceSharedControlsVariant;
    containerClassName: string;
    containerStyle?: React.CSSProperties;
    onToggleOpen: () => void;
    onClosePanel: () => void;
    onOpenSheet: (sheet: SurfaceSharedControlSheet) => void;
    onOpenAdvancedSettings: () => void;
};

type SheetButtonConfig = {
    id: string;
    title: string;
    detail: string;
    isActive: boolean;
    onClick: () => void;
    testId?: string;
    wide?: boolean;
    badge?: string;
};

const buildButtonClassName = (isActive: boolean) =>
    `${isActive ? 'rounded-2xl border px-4 py-3 text-left transition-colors' : 'nbu-control-button rounded-2xl px-4 py-3 text-left'} ${
        isActive
            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
            : 'text-gray-800 dark:text-gray-100'
    }`;

const SurfaceSharedControls: React.FC<SurfaceSharedControlsProps> = ({
    currentLanguage,
    isOpen,
    workspaceLabel,
    stateDescription,
    activeSheetLabel,
    activePickerSheet,
    isAdvancedSettingsOpen,
    promptPreview,
    totalReferenceCount,
    styleLabel,
    modelLabel,
    aspectRatio,
    imageSize,
    batchSize,
    objectImageCount,
    characterImageCount,
    maxObjects,
    maxCharacters,
    settingsVariant,
    containerClassName,
    containerStyle,
    onToggleOpen,
    onClosePanel,
    onOpenSheet,
    onOpenAdvancedSettings,
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const renderDisclosureChevron = () => (
        <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
        >
            <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
    const renderPromptPreview = (value: string, limit = 140) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
            return t('workspaceSurfacePromptEmpty');
        }
        if (trimmedValue.length <= limit) {
            return trimmedValue;
        }
        return `${trimmedValue.slice(0, limit).trimEnd()}...`;
    };
    const settingsDetail =
        settingsVariant === 'sketch'
            ? `${modelLabel} · ${aspectRatio}`
            : `${modelLabel} · ${aspectRatio} · ${imageSize} · ${t('surfaceSharedControlsQuantityDetail').replace('{0}', String(batchSize))}`;
    const sheetButtons: SheetButtonConfig[] = [
        {
            id: 'prompt',
            title: t('workspaceSheetTitlePrompt'),
            detail: t('surfaceSharedControlsPromptDetail'),
            isActive: activePickerSheet === 'prompt',
            onClick: () => onOpenSheet('prompt'),
            testId: 'shared-control-prompt',
        },
        {
            id: 'styles',
            title: t('style'),
            detail: styleLabel,
            isActive: activePickerSheet === 'styles',
            onClick: () => onOpenSheet('styles'),
        },
        {
            id: 'settings',
            title: t('workspaceSheetTitleGenerationSettings'),
            detail: settingsDetail,
            isActive: activePickerSheet === 'settings',
            onClick: () => onOpenSheet('settings'),
            testId: 'shared-control-settings',
        },
        {
            id: 'advanced-settings',
            title: t('composerToolbarAdvancedSettings'),
            detail: t('composerAdvancedDesc'),
            isActive: isAdvancedSettingsOpen,
            onClick: onOpenAdvancedSettings,
            testId: 'shared-control-advanced-settings',
        },
        {
            id: 'references',
            title: t('workspaceTopHeaderReferenceTray'),
            detail: t('surfaceSharedControlsReferenceDetail')
                .replace('{0}', String(objectImageCount))
                .replace('{1}', String(maxObjects))
                .replace('{2}', String(characterImageCount))
                .replace('{3}', String(maxCharacters)),
            isActive: activePickerSheet === 'references',
            onClick: () => onOpenSheet('references'),
            wide: true,
            badge: String(totalReferenceCount),
        },
    ];

    return (
        <div className={containerClassName} style={containerStyle}>
            <button
                data-testid="shared-controls-toggle"
                type="button"
                onClick={onToggleOpen}
                className="nbu-control-button rounded-[24px] px-4 py-3 text-left text-sm"
            >
                <div className="flex items-center gap-3">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                        {t('surfaceSharedControlsBadge')}
                    </span>
                    <div className="min-w-0">
                        <div>{isOpen ? t('surfaceSharedControlsHide') : t('surfaceSharedControlsOpen')}</div>
                        <div className="mt-0.5 truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            {activeSheetLabel} ·{' '}
                            {t('surfaceSharedControlsRefsCount').replace('{0}', String(totalReferenceCount))}
                        </div>
                    </div>
                </div>
            </button>

            {isOpen && (
                <div data-testid="shared-controls-panel" className="nbu-floating-panel w-[min(92vw,380px)] p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                            <details
                                data-testid="shared-controls-state-details"
                                className="group nbu-subpanel px-4 py-3"
                            >
                                <summary
                                    data-testid="shared-controls-state-summary"
                                    className="flex cursor-pointer list-none items-start justify-between gap-3 marker:hidden"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                            {t('surfaceSharedControlsStateTitle')}
                                        </div>
                                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                            {workspaceLabel}
                                        </div>
                                    </div>
                                    <span className="mt-1 shrink-0">{renderDisclosureChevron()}</span>
                                </summary>
                                <div
                                    data-testid="shared-controls-state-body"
                                    className="mt-3 border-t border-gray-200/80 pt-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200"
                                >
                                    {stateDescription}
                                </div>
                            </details>
                        </div>
                        <button
                            type="button"
                            onClick={onClosePanel}
                            className="nbu-control-button rounded-xl px-3 py-2 text-xs"
                        >
                            {t('workspaceViewerClose')}
                        </button>
                    </div>

                    <details data-testid="shared-controls-prompt-details" className="group nbu-subpanel mb-4 px-4 py-3">
                        <summary
                            data-testid="shared-controls-prompt-summary"
                            className="flex cursor-pointer list-none items-start justify-between gap-3 marker:hidden"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                                    <span>{t('surfaceSharedControlsCurrentPrompt')}</span>
                                    {activePickerSheet === 'prompt' && (
                                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                                            {t('historyActionOpen')}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                    {renderPromptPreview(promptPreview)}
                                </div>
                            </div>
                            <span className="mt-1 shrink-0">{renderDisclosureChevron()}</span>
                        </summary>
                        <div
                            data-testid="shared-controls-prompt-body"
                            className="mt-2 text-sm text-gray-700 dark:text-gray-200"
                        >
                            {promptPreview || t('workspaceSurfacePromptEmpty')}
                        </div>
                    </details>

                    <div className="grid gap-2 sm:grid-cols-2">
                        {sheetButtons.map((button) => (
                            <button
                                key={button.id}
                                data-testid={button.testId}
                                onClick={button.onClick}
                                className={`${buildButtonClassName(button.isActive)} ${button.wide ? 'sm:col-span-2' : ''}`}
                            >
                                {button.badge ? (
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold">{button.title}</div>
                                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                {button.detail}
                                            </div>
                                        </div>
                                        <div className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                            {button.badge}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm font-semibold">{button.title}</div>
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {button.detail}
                                        </div>
                                    </>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 grid gap-2 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2">
                        <div className="nbu-subpanel px-3 py-3">
                            {t('surfaceSharedControlsActiveSheet')}
                            <br />
                            <span className="mt-1 block text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {activeSheetLabel}
                            </span>
                        </div>
                        <div className="nbu-subpanel px-3 py-3">
                            {t('surfaceSharedControlsWorkspace')}
                            <br />
                            <span className="mt-1 block text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {workspaceLabel}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SurfaceSharedControls;
