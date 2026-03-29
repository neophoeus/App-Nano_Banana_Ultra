import React, { useRef } from 'react';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { getTranslation, Language } from '../utils/translations';
import InfoTooltip from './InfoTooltip';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';
import WorkspaceModalFrame from './WorkspaceModalFrame';

type WorkspaceRestoreNoticeProps = {
    currentLanguage: Language;
    onLanguageChange: (language: Language) => void;
    historyCount: number;
    stagedAssetCount: number;
    viewerImageCount: number;
    activeBranchLabel?: string | null;
    onOpenLatestTurn?: () => void;
    onContinueRestoredChain?: () => void;
    onBranchFromRestore?: () => void;
    continueActionLabel?: string;
    onUseSettingsClearChain: () => void;
    onDismiss: () => void;
};

const WorkspaceRestoreNotice: React.FC<WorkspaceRestoreNoticeProps> = ({
    currentLanguage,
    onLanguageChange,
    historyCount,
    stagedAssetCount,
    viewerImageCount,
    activeBranchLabel,
    onOpenLatestTurn,
    onContinueRestoredChain,
    onBranchFromRestore,
    continueActionLabel,
    onUseSettingsClearChain,
    onDismiss,
}) => {
    const primaryActionRef = useRef<HTMLButtonElement>(null);
    const t = (key: string) => getTranslation(currentLanguage, key);
    const compactNeutralActionButtonClassName = 'nbu-control-button px-3 py-1.5 text-[11px] font-semibold';
    const effectiveContinueActionLabel = continueActionLabel || t('workspaceRestoreContinueChain');
    const summaryItems = [
        t('workspaceRestoreTurns').replace('{0}', String(historyCount)),
        t('workspaceRestoreStagedAssets').replace('{0}', String(stagedAssetCount)),
        t('workspaceRestoreViewerImages').replace('{0}', String(viewerImageCount)),
        ...(activeBranchLabel ? [t('workspaceRestoreActiveBranch').replace('{0}', activeBranchLabel)] : []),
    ];
    return (
        <WorkspaceModalFrame
            dataTestId="workspace-restore-notice"
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.restoreNotice}
            maxWidthClass="max-w-[840px]"
            onClose={onDismiss}
            closeLabel={t('workspaceRestoreDismiss')}
            title={t('workspaceRestoreTitle')}
            headerExtra={
                <div className="mt-4 flex items-center gap-3">
                    <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={onLanguageChange} />
                    <ThemeToggle currentLanguage={currentLanguage} className="h-9 w-9" />
                </div>
            }
            backdropClassName="bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.1),_transparent_34%),linear-gradient(180deg,rgba(255,251,235,0.9),rgba(255,255,255,0.94))] backdrop-blur-md dark:bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.1),_transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.86),rgba(2,6,23,0.92))]"
            panelClassName="max-h-[calc(100vh-2rem)] overflow-y-auto border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(255,247,232,0.96))] px-6 py-6 shadow-[0_32px_120px_rgba(15,23,42,0.16)] dark:border-amber-500/18 dark:bg-[linear-gradient(180deg,rgba(20,16,12,0.98),rgba(10,14,20,0.97))] dark:shadow-[0_32px_120px_rgba(0,0,0,0.5)]"
            headerClassName="flex flex-wrap items-start justify-between gap-4 border-b border-amber-100 pb-5 dark:border-amber-500/10"
            closeButtonClassName={compactNeutralActionButtonClassName}
            containerClassName="items-start justify-center overflow-y-auto sm:items-center"
            closeOnBackdropClick
            initialFocusRef={primaryActionRef}
        >
            <div className="space-y-5 pt-2">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryItems.map((item) => (
                        <div
                            key={item}
                            className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,250,240,0.96),rgba(255,244,227,0.92))] px-4 py-3 text-sm font-semibold text-gray-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-amber-500/18 dark:bg-[linear-gradient(180deg,rgba(56,38,11,0.42),rgba(28,22,14,0.38))] dark:text-gray-100 dark:shadow-[inset_0_1px_0_rgba(255,244,214,0.04)]"
                        >
                            {item}
                        </div>
                    ))}
                </div>

                <div className="rounded-[28px] border border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,250,252,0.9))] p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(23,28,36,0.94),rgba(14,18,24,0.9))] dark:shadow-[0_16px_48px_rgba(0,0,0,0.28)]">
                    <div className="flex items-center gap-2">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            {t('workspaceRestoreActionsTitle')}
                        </div>
                        <InfoTooltip
                            content={t('workspaceRestoreActionsHint')}
                            buttonLabel={t('workspaceRestoreActionsTitle')}
                            dataTestId="workspace-restore-actions-hint"
                        />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {onOpenLatestTurn && (
                            <button
                                ref={primaryActionRef}
                                onClick={onOpenLatestTurn}
                                className="rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-600"
                            >
                                {t('workspaceRestoreOpenLatest')}
                            </button>
                        )}
                        {onContinueRestoredChain && (
                            <button
                                data-testid="workspace-restore-continue"
                                ref={!onOpenLatestTurn ? primaryActionRef : undefined}
                                onClick={onContinueRestoredChain}
                                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-100 dark:hover:border-amber-500/40 dark:hover:bg-amber-950/30"
                            >
                                {effectiveContinueActionLabel}
                            </button>
                        )}
                        {onBranchFromRestore && (
                            <button
                                ref={!onOpenLatestTurn && !onContinueRestoredChain ? primaryActionRef : undefined}
                                onClick={onBranchFromRestore}
                                className={compactNeutralActionButtonClassName}
                            >
                                {t('workspaceRestoreBranch')}
                            </button>
                        )}
                        <button
                            ref={
                                !onOpenLatestTurn && !onContinueRestoredChain && !onBranchFromRestore
                                    ? primaryActionRef
                                    : undefined
                            }
                            onClick={onUseSettingsClearChain}
                            className={compactNeutralActionButtonClassName}
                        >
                            {t('workspaceRestoreUseSettingsClear')}
                        </button>
                    </div>
                </div>
            </div>
        </WorkspaceModalFrame>
    );
};

export default WorkspaceRestoreNotice;
