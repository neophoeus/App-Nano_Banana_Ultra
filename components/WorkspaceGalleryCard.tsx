import React from 'react';
import HistoryPanel from './HistoryPanel';
import { BranchNameOverrides, GeneratedImage } from '../types';
import { getTranslation, Language } from '../utils/translations';

type WorkspaceGalleryCardProps = {
    currentLanguage: Language;
    history: GeneratedImage[];
    onSelect: (item: GeneratedImage) => void;
    onRenameBranch: (item: GeneratedImage) => void;
    getContinueActionLabel: (item: GeneratedImage) => string;
    branchNameOverrides: BranchNameOverrides;
    selectedHistoryId: string | null;
    currentSourceHistoryId?: string | null;
    onClear: () => void;
};

function WorkspaceGalleryCard({
    currentLanguage,
    history,
    onSelect,
    onRenameBranch,
    getContinueActionLabel,
    branchNameOverrides,
    selectedHistoryId,
    currentSourceHistoryId,
    onClear,
}: WorkspaceGalleryCardProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const summaryLabel = t('workspaceInsightsItemsCount').replace('{0}', String(history.length));

    return (
        <div
            data-testid="workspace-gallery-card"
            className="nbu-stage-hero-filmstrip-shell min-w-0 max-w-full overflow-hidden rounded-[24px] border p-2.5"
        >
            {history.length > 0 ? (
                <HistoryPanel
                    history={history}
                    onSelect={onSelect}
                    onRenameBranch={onRenameBranch}
                    getContinueActionLabel={getContinueActionLabel}
                    branchNameOverrides={branchNameOverrides}
                    selectedId={selectedHistoryId || undefined}
                    currentSourceHistoryId={currentSourceHistoryId}
                    currentLanguage={currentLanguage}
                    onClear={onClear}
                    title={t('workspacePickerFullGallery')}
                    surface="embedded"
                />
            ) : (
                <>
                    <div className="mb-2.5 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3
                                data-testid="workspace-gallery-title"
                                className="text-[15px] font-black text-slate-900 dark:text-slate-100"
                            >
                                {t('workspacePickerFullGallery')}
                            </h3>
                        </div>
                        <span
                            data-testid="workspace-gallery-summary"
                            className="nbu-stage-hero-filmstrip-summary rounded-full border px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-300"
                        >
                            {summaryLabel}
                        </span>
                    </div>

                    <div
                        data-testid="workspace-gallery-empty"
                        className="rounded-2xl border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
                    >
                        {t('workspacePickerEmptyGallery')}
                    </div>
                </>
            )}
        </div>
    );
}

export default React.memo(WorkspaceGalleryCard);
