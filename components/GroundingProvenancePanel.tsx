import React, { Dispatch, SetStateAction } from 'react';
import { GeneratedImage, GroundingMetadata } from '../types';
import { GroundingSelection } from '../hooks/useSelectedResultState';
import { GroundingAttributionOverviewRow } from '../utils/groundingProvenance';
import { getTranslation, Language } from '../utils/translations';
import InfoTooltip from './InfoTooltip';

type GroundingSource = NonNullable<GroundingMetadata['sources']>[number];
type GroundingSupportBundle = NonNullable<GroundingMetadata['supports']>[number];

export type GroundingProvenancePanelProps = {
    currentLanguage: Language;
    tone: 'light' | 'dark';
    scope?: 'primary' | 'secondary' | 'dark';
    detailVisibility?: 'summary' | 'full';
    insightRows?: Array<{ label: string; value: string }>;
    provenanceSummaryRows: Array<{ id: string; label: string; value: string }>;
    attributionOverviewRows: GroundingAttributionOverviewRow[];
    provenanceSourceTurn: GeneratedImage | null;
    currentStageSourceHistoryId: string | null;
    getShortTurnId: (historyId?: string | null) => string;
    renderHistoryTurnActionRow: (args: {
        item: GeneratedImage;
        openLabel?: string | null;
        continueLabel?: string | null;
        branchLabel?: string | null;
        renameLabel?: string | null;
        testIds?: {
            open?: string;
            continue?: string;
            branch?: string;
            rename?: string;
        };
        stopPropagation?: boolean;
        renameTarget?: GeneratedImage | null;
    }) => React.ReactNode;
    provenanceContinuityMessage: string;
    provenanceSelectionMessage: string;
    activeGroundingSelection: GroundingSelection;
    setActiveGroundingSelection: Dispatch<SetStateAction<GroundingSelection>>;
    focusLinkedGroundingItems: boolean;
    setFocusLinkedGroundingItems: Dispatch<SetStateAction<boolean>>;
    totalSourceCount: number;
    totalSupportBundleCount: number;
    displayedSources: Array<{ source: GroundingSource; index: number }>;
    displayedSupportBundles: Array<{ bundle: GroundingSupportBundle; index: number }>;
    uncitedSources: Array<{ source: GroundingSource; index: number }>;
    citedSourceIndexSet: Set<number>;
    citedSourceTitleSet: Set<string>;
    sourceAttributionStatusMessage: string;
    entryPointStatusMessage: string;
    activeSource: GroundingSource | null;
    activeSupportBundle: GroundingSupportBundle | null;
    activeSourceIndexSet: Set<number>;
    activeSourceTitleSet: Set<string>;
    activeBundleIndexSet: Set<number>;
    sourceCitationCountByIndex: Map<number, number>;
    relatedSourcesForSelectedBundle: Array<{ source: GroundingSource; index: number }>;
    otherSourcesForSelectedBundle: Array<{ source: GroundingSource; index: number }>;
    relatedBundlesForSelectedSource: Array<{ bundle: GroundingSupportBundle; index: number }>;
    activeGroundingReuseSnippet: string;
    activeGroundingReuseLabel: string;
    activeGroundingAppendPreview: string;
    activeGroundingReplacePreview: string;
    activeGroundingHasExistingPrompt: boolean;
    activeGroundingCurrentPromptText: string;
    activeGroundingAppendCueText: string;
    formatSourceHost: (url: string) => string;
    handleAppendGroundingSelectionToPrompt: () => void;
    handleReplacePromptWithGroundingSelection: () => void;
    groundingStateMessage: string;
    groundingSupportMessage: string;
    groundingQueries: string[];
    searchEntryPointRenderedContent?: string | null;
};

function GroundingProvenancePanel({
    currentLanguage,
    tone,
    scope = tone === 'dark' ? 'dark' : 'secondary',
    detailVisibility = 'full',
    provenanceSummaryRows,
    attributionOverviewRows,
    provenanceSourceTurn,
    currentStageSourceHistoryId,
    getShortTurnId,
    renderHistoryTurnActionRow,
    provenanceContinuityMessage,
    provenanceSelectionMessage,
    activeGroundingSelection,
    setActiveGroundingSelection,
    focusLinkedGroundingItems,
    setFocusLinkedGroundingItems,
    totalSourceCount,
    totalSupportBundleCount,
    displayedSources,
    displayedSupportBundles,
    uncitedSources,
    citedSourceIndexSet,
    citedSourceTitleSet,
    sourceAttributionStatusMessage,
    entryPointStatusMessage,
    activeSource,
    activeSupportBundle,
    activeSourceIndexSet,
    activeSourceTitleSet,
    activeBundleIndexSet,
    sourceCitationCountByIndex,
    relatedSourcesForSelectedBundle,
    otherSourcesForSelectedBundle,
    relatedBundlesForSelectedSource,
    activeGroundingReuseSnippet,
    activeGroundingReuseLabel,
    activeGroundingAppendPreview,
    activeGroundingReplacePreview,
    activeGroundingHasExistingPrompt,
    activeGroundingCurrentPromptText,
    activeGroundingAppendCueText,
    formatSourceHost,
    handleAppendGroundingSelectionToPrompt,
    handleReplacePromptWithGroundingSelection,
    groundingStateMessage,
    groundingSupportMessage,
    groundingQueries,
    searchEntryPointRenderedContent,
}: GroundingProvenancePanelProps) {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const formatMessage = (key: string, ...values: Array<string | number>) =>
        values.reduce((message, value, index) => message.replace(`{${index}}`, String(value)), t(key));
    const getTranslatedModeLabel = (mode?: string | null) => {
        if (!mode) {
            return t('historyModeImage');
        }

        if (mode.includes('Inpaint') || mode.includes('Retouch')) return t('modeInpaint');
        if (mode.includes('Text')) return t('modeTextToImg');
        if (mode.includes('Image to')) return t('modeImgToImg');
        if (mode.includes('Follow-up')) return t('workspaceViewerFollowUpEdit');
        if (
            mode.includes('Outpaint') ||
            mode.includes('Reframe') ||
            mode.includes('Reposition') ||
            mode.includes('Upscale') ||
            mode.includes('Refine')
        ) {
            return t('modeOutpaint');
        }

        return mode;
    };
    const getTranslatedSourceTypeLabel = (sourceType?: string | null) => {
        if (sourceType === 'web') return t('groundingPanelAttributionSourceTypeWeb');
        if (sourceType === 'image') return t('groundingPanelAttributionSourceTypeImage');
        if (sourceType === 'context') return t('groundingPanelAttributionSourceTypeContext');
        return sourceType || '';
    };
    const formatSourceMeta = (source: Pick<GroundingSource, 'url' | 'sourceType'>) => {
        const parts = [formatSourceHost(source.url)];
        const sourceTypeLabel = getTranslatedSourceTypeLabel(source.sourceType);

        if (sourceTypeLabel) {
            parts.push(sourceTypeLabel);
        }

        return parts.join(' · ');
    };
    const getProvenanceTestId = (baseId: string) => (scope === 'primary' ? baseId : `${baseId}-${scope}`);
    const wrapperClassName =
        tone === 'dark'
            ? 'space-y-2.5 rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-3 text-sm text-white/75'
            : scope === 'primary'
              ? 'space-y-2.5 text-sm text-gray-600 dark:text-gray-300'
              : 'nbu-dashed-panel space-y-2.5 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300';
    const sectionLabelClassName =
        tone === 'dark'
            ? 'text-[11px] font-bold uppercase tracking-[0.16em] text-white/45'
            : 'text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500';
    const emptyClassName = tone === 'dark' ? 'text-sm text-white/60' : 'text-sm text-gray-500 dark:text-gray-400';
    const selectionNoticeClassName =
        tone === 'dark'
            ? 'rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'
            : 'rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-200';
    const detailCardClassName =
        tone === 'dark' ? 'rounded-xl border border-white/10 bg-black/10 px-3 py-3' : 'nbu-subpanel px-3 py-3';
    const detailSecondaryActionClassName =
        tone === 'dark'
            ? 'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/10'
            : 'nbu-control-button px-3 py-1.5 text-[11px] font-semibold';
    const detailMetaClassName =
        tone === 'dark' ? 'mt-1 text-xs text-white/55' : 'mt-1 text-xs text-gray-500 dark:text-gray-400';

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

    const renderPromptPreview = (value?: string | null) => {
        const preview = value?.trim();
        if (!preview) {
            return null;
        }

        return preview.length > 88 ? `${preview.slice(0, 88)}...` : preview;
    };
    const renderReusePreview = () => {
        if (!activeGroundingReuseSnippet.trim()) {
            return null;
        }

        return (
            <div
                data-testid={getProvenanceTestId('provenance-detail-reuse-preview')}
                className={`mt-4 ${detailCardClassName}`}
            >
                <div className={sectionLabelClassName}>{t('groundingPanelReusePreview')}</div>
                <div className={detailMetaClassName}>{activeGroundingReuseLabel}</div>
                <div
                    data-testid={getProvenanceTestId('provenance-detail-reuse-snippet')}
                    className={
                        tone === 'dark'
                            ? 'mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/85 whitespace-pre-wrap break-words'
                            : 'mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 whitespace-pre-wrap break-words dark:border-gray-800 dark:bg-[#0a0c10] dark:text-gray-200'
                    }
                >
                    {activeGroundingReuseSnippet}
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div
                        data-testid={getProvenanceTestId('provenance-detail-reuse-append-preview')}
                        className={
                            tone === 'dark'
                                ? 'rounded-lg border border-white/10 bg-black/10 px-3 py-3 text-sm text-white/85'
                                : 'rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-[#11151b] dark:text-gray-200'
                        }
                    >
                        <div className={sectionLabelClassName}>{t('groundingPanelReuseAppendPreview')}</div>
                        <div className="mt-2 whitespace-pre-wrap break-words">{activeGroundingAppendPreview}</div>
                        <div className={detailMetaClassName}>
                            {activeGroundingHasExistingPrompt
                                ? t('groundingPanelReuseAppendImpactKeep')
                                : t('groundingPanelReuseAppendImpactEmpty')}
                        </div>
                    </div>
                    <div
                        data-testid={getProvenanceTestId('provenance-detail-reuse-replace-preview')}
                        className={
                            tone === 'dark'
                                ? 'rounded-lg border border-white/10 bg-black/10 px-3 py-3 text-sm text-white/85'
                                : 'rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-[#11151b] dark:text-gray-200'
                        }
                    >
                        <div className={sectionLabelClassName}>{t('groundingPanelReuseReplacePreview')}</div>
                        <div className="mt-2 whitespace-pre-wrap break-words">{activeGroundingReplacePreview}</div>
                        <div className={detailMetaClassName}>{t('groundingPanelReuseReplaceImpact')}</div>
                    </div>
                </div>
                {activeGroundingHasExistingPrompt && activeGroundingCurrentPromptText ? (
                    <div
                        data-testid={getProvenanceTestId('provenance-detail-reuse-current-prompt')}
                        className={
                            tone === 'dark'
                                ? 'mt-3 rounded-lg border border-white/10 bg-black/10 px-3 py-3 text-sm text-white/85'
                                : 'mt-3 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-[#11151b] dark:text-gray-200'
                        }
                    >
                        <div className={sectionLabelClassName}>{t('groundingPanelReuseCurrentPromptLabel')}</div>
                        <div className="mt-2 whitespace-pre-wrap break-words">{activeGroundingCurrentPromptText}</div>
                    </div>
                ) : null}
                {activeGroundingAppendCueText ? (
                    <div
                        data-testid={getProvenanceTestId('provenance-detail-reuse-appended-cue')}
                        className={
                            tone === 'dark'
                                ? 'mt-3 rounded-lg border border-white/10 bg-black/10 px-3 py-3 text-sm text-white/85'
                                : 'mt-3 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-[#11151b] dark:text-gray-200'
                        }
                    >
                        <div className={sectionLabelClassName}>{t('groundingPanelReuseAddedCueLabel')}</div>
                        <div className="mt-2 whitespace-pre-wrap break-words">{activeGroundingAppendCueText}</div>
                    </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        data-testid={getProvenanceTestId('provenance-detail-append-prompt')}
                        onClick={handleAppendGroundingSelectionToPrompt}
                        className={detailSecondaryActionClassName}
                    >
                        {t('groundingPanelAppendPrompt')}
                    </button>
                    <button
                        type="button"
                        data-testid={getProvenanceTestId('provenance-detail-replace-prompt')}
                        onClick={handleReplacePromptWithGroundingSelection}
                        className={detailSecondaryActionClassName}
                    >
                        {t('groundingPanelReplacePrompt')}
                    </button>
                </div>
            </div>
        );
    };
    const compareStateChipClassName = (state: 'linked' | 'outside') =>
        state === 'linked'
            ? tone === 'dark'
                ? 'rounded-full border border-amber-300/35 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200'
                : 'rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:border-amber-500/25 dark:bg-amber-950/20 dark:text-amber-200'
            : tone === 'dark'
              ? 'rounded-full border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200'
              : 'rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700 dark:border-sky-500/25 dark:bg-sky-950/20 dark:text-sky-200';
    const hasSelectableArtifacts = displayedSources.length > 0 || displayedSupportBundles.length > 0;
    const shouldShowDetailSection = Boolean(activeGroundingSelection) || hasSelectableArtifacts;
    const shouldShowSourcesSection =
        displayedSources.length > 0 || (focusLinkedGroundingItems && Boolean(activeGroundingSelection));
    const shouldShowCoverageSection =
        displayedSupportBundles.length > 0 || (focusLinkedGroundingItems && Boolean(activeGroundingSelection));
    const shouldShowAttributionStatusSection =
        attributionOverviewRows.length > 0 &&
        (displayedSources.length > 0 ||
            displayedSupportBundles.length > 0 ||
            uncitedSources.length > 0 ||
            groundingQueries.length > 0 ||
            Boolean(searchEntryPointRenderedContent));
    const effectiveTotalSourceCount =
        totalSourceCount ??
        (displayedSources.length > 0
            ? displayedSources.length
            : relatedSourcesForSelectedBundle.length + otherSourcesForSelectedBundle.length);
    const effectiveTotalSupportBundleCount =
        totalSupportBundleCount ??
        (displayedSupportBundles.length > 0 ? displayedSupportBundles.length : relatedBundlesForSelectedSource.length);

    const renderGroundingSourceCard = (source: GroundingSource, index: number, testId?: string) => {
        const isCited = citedSourceIndexSet.has(index) || citedSourceTitleSet.has(source.title);
        const citationCount = sourceCitationCountByIndex.get(index) || 0;
        const isHighlighted =
            activeSourceIndexSet.size === 0 && activeSourceTitleSet.size === 0
                ? false
                : activeSourceIndexSet.has(index) || activeSourceTitleSet.has(source.title);
        const isActive = activeGroundingSelection?.kind === 'source' && activeGroundingSelection.index === index;
        const isMuted = (activeSourceIndexSet.size > 0 || activeSourceTitleSet.size > 0) && !isHighlighted;
        const cardClassName =
            tone === 'dark'
                ? `overflow-hidden rounded-2xl border bg-white/5 transition-all hover:bg-white/10 ${isHighlighted || isActive ? 'border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]' : 'border-white/10'} ${isMuted ? 'opacity-45' : ''}`
                : `overflow-hidden rounded-xl border bg-white transition-all hover:bg-amber-50 dark:bg-[#10141b] dark:hover:bg-amber-950/20 ${isHighlighted || isActive ? 'border-amber-400 shadow-[0_0_0_1px_rgba(245,158,11,0.22)] dark:border-amber-400/60' : 'border-amber-200 dark:border-amber-500/20'} ${isMuted ? 'opacity-55' : ''}`;
        const titleClassName =
            tone === 'dark' ? 'font-semibold text-white' : 'font-semibold text-amber-700 dark:text-amber-200';
        const metaClassName = tone === 'dark' ? 'mt-1 text-xs text-white/50' : 'mt-1 text-xs opacity-70';
        const sourceStatusClassName = isCited
            ? tone === 'dark'
                ? 'rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200'
                : 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:text-emerald-200'
            : tone === 'dark'
              ? 'rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70'
              : 'rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600 dark:border-gray-700 dark:bg-[#181d26] dark:text-gray-300';

        return (
            <div key={`${source.url}-${index}`} className={cardClassName}>
                <button
                    data-testid={testId}
                    type="button"
                    onClick={() =>
                        setActiveGroundingSelection((current) =>
                            current?.kind === 'source' && current.index === index ? null : { kind: 'source', index },
                        )
                    }
                    className="w-full text-left"
                >
                    {source.imageUrl && (
                        <img
                            src={source.imageUrl}
                            alt={source.title}
                            className={tone === 'dark' ? 'h-28 w-full object-cover' : 'h-24 w-full object-cover'}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                        />
                    )}
                    <div className={tone === 'dark' ? 'px-3 py-3' : 'px-3 py-2'}>
                        <div className="mb-2 flex flex-wrap gap-2">
                            {(isHighlighted || isActive) && (
                                <div
                                    className={
                                        tone === 'dark'
                                            ? 'text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300'
                                            : 'text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300'
                                    }
                                >
                                    {isActive
                                        ? t('groundingPanelSelectedSourceState')
                                        : t('groundingPanelCoveredBySelectedBundleState')}
                                </div>
                            )}
                            <span
                                data-testid={testId ? `${testId}-status` : undefined}
                                className={sourceStatusClassName}
                            >
                                {isCited
                                    ? t('groundingPanelSourceStatusCited')
                                    : t('groundingPanelSourceStatusRetrievedOnly')}
                            </span>
                        </div>
                        <div className={titleClassName}>{source.title}</div>
                        <div className={metaClassName}>{formatSourceMeta(source)}</div>
                        <div className={metaClassName}>
                            {citationCount > 0
                                ? formatMessage('groundingPanelSourceCitationCount', citationCount)
                                : t('groundingPanelNoBundleCitesSource')}
                        </div>
                    </div>
                </button>
                <div
                    className={
                        tone === 'dark'
                            ? 'flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2'
                            : 'flex items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 dark:border-gray-800'
                    }
                >
                    <div
                        className={
                            tone === 'dark'
                                ? 'text-[11px] text-white/50'
                                : 'text-[11px] text-gray-500 dark:text-gray-400'
                        }
                    >
                        {formatMessage('groundingPanelSourceIndex', index + 1)}
                    </div>
                    <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className={
                            tone === 'dark'
                                ? 'rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/70 transition-colors hover:bg-white/10'
                                : 'rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#0a0c10]'
                        }
                    >
                        {t('groundingPanelOpenSource')}
                    </a>
                </div>
            </div>
        );
    };

    const renderGroundingCoverageBundle = (bundle: GroundingSupportBundle, index: number, testId?: string) => {
        const isActive = activeBundleIndexSet.has(index);
        const cardClassName =
            tone === 'dark'
                ? `w-full rounded-xl border px-3 py-3 text-left transition-all ${isActive ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.28)]' : 'border-white/10 bg-black/10 hover:bg-white/10'}`
                : `w-full rounded-xl border px-3 py-3 text-left transition-all ${isActive ? 'border-amber-400 bg-amber-50 shadow-[0_0_0_1px_rgba(245,158,11,0.16)] dark:border-amber-400/60 dark:bg-amber-950/20' : 'border-gray-200 bg-white hover:bg-amber-50 dark:border-gray-800 dark:bg-[#10141b] dark:hover:bg-amber-950/20'}`;

        return (
            <button
                key={`${bundle.chunkIndices.join('-')}-${index}`}
                data-testid={testId}
                type="button"
                onClick={() =>
                    setActiveGroundingSelection((current) =>
                        current?.kind === 'bundle' && current.index === index ? null : { kind: 'bundle', index },
                    )
                }
                className={cardClassName}
            >
                <div className="flex items-start justify-between gap-3">
                    <div
                        className={
                            tone === 'dark'
                                ? 'text-xs font-semibold uppercase tracking-[0.14em] text-white/45'
                                : 'text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500'
                        }
                    >
                        {formatMessage('groundingPanelSupportBundleTitle', index + 1)}
                    </div>
                    <span
                        className={
                            tone === 'dark'
                                ? 'rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/65'
                                : 'rounded-full border border-gray-200 px-2 py-1 text-[10px] text-gray-500 dark:border-gray-700 dark:text-gray-300'
                        }
                    >
                        {formatMessage(
                            'groundingPanelSourcesCount',
                            bundle.sourceIndices?.length || bundle.sourceTitles?.length || 0,
                        )}
                    </span>
                </div>
                {bundle.segmentText && (
                    <div
                        className={
                            tone === 'dark'
                                ? 'mt-2 text-sm text-white/80'
                                : 'mt-2 text-sm text-gray-700 dark:text-gray-200'
                        }
                    >
                        {renderPromptPreview(bundle.segmentText)}
                    </div>
                )}
                <div
                    className={
                        tone === 'dark' ? 'mt-2 text-xs text-white/60' : 'mt-2 text-xs text-gray-500 dark:text-gray-400'
                    }
                >
                    {formatMessage(
                        'groundingPanelChunksMeta',
                        bundle.chunkIndices.join(', ') || t('groundingProvenanceNone'),
                    )}
                </div>
                {bundle.sourceTitles && bundle.sourceTitles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {bundle.sourceTitles.map((title) => (
                            <span
                                key={title}
                                className={
                                    tone === 'dark'
                                        ? 'rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/75'
                                        : 'rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700 dark:border-gray-700 dark:bg-[#0a0c10] dark:text-gray-200'
                                }
                            >
                                {title}
                            </span>
                        ))}
                    </div>
                )}
            </button>
        );
    };

    return (
        <div
            data-testid={tone === 'light' ? 'provenance-panel-light' : 'provenance-panel-dark'}
            className={`${wrapperClassName} min-w-0 overflow-x-hidden`}
        >
            <div
                data-testid={getProvenanceTestId('provenance-summary')}
                className={
                    tone === 'dark'
                        ? 'rounded-xl border border-white/10 bg-black/10 px-3 py-3'
                        : 'rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-[#10141b]'
                }
            >
                <div className={sectionLabelClassName}>{t('groundingPanelContinuitySummary')}</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {provenanceSummaryRows.map((row) => (
                        <div
                            data-testid={getProvenanceTestId(`provenance-summary-${row.id}`)}
                            key={row.id}
                            className={
                                tone === 'dark'
                                    ? 'min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2'
                                    : 'min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-[#0a0c10]'
                            }
                        >
                            <div
                                className={
                                    tone === 'dark'
                                        ? 'text-[10px] font-bold uppercase tracking-[0.14em] text-white/45'
                                        : 'text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500'
                                }
                            >
                                {row.label}
                            </div>
                            <div
                                className={
                                    tone === 'dark'
                                        ? 'mt-1 break-words text-sm font-semibold text-white'
                                        : 'mt-1 break-words text-sm font-semibold text-gray-900 dark:text-gray-100'
                                }
                            >
                                {row.value}
                            </div>
                        </div>
                    ))}
                </div>
                {provenanceContinuityMessage ? (
                    <div className={detailMetaClassName}>{provenanceContinuityMessage}</div>
                ) : null}
                {detailVisibility === 'full' && provenanceSourceTurn && (
                    <div
                        data-testid={getProvenanceTestId('provenance-source-card')}
                        className={`mt-3 ${
                            tone === 'dark'
                                ? 'rounded-xl border border-white/10 bg-white/5 px-3 py-3'
                                : 'rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-[#0a0c10]'
                        }`}
                    >
                        <div
                            data-testid={getProvenanceTestId('provenance-source-details')}
                            className="flex items-start justify-between gap-3"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className={sectionLabelClassName}>{t('groundingPanelProvenanceSource')}</div>
                                    <span
                                        className={
                                            tone === 'dark'
                                                ? 'rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-mono text-white/70'
                                                : 'rounded-full bg-white px-2 py-0.5 text-[10px] font-mono text-gray-500 dark:bg-[#181d26] dark:text-gray-400'
                                        }
                                    >
                                        {getShortTurnId(provenanceSourceTurn.id)}
                                    </span>
                                    {currentStageSourceHistoryId === provenanceSourceTurn.id && (
                                        <span
                                            data-testid={getProvenanceTestId('provenance-source-stage-badge')}
                                            className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                                        >
                                            {t('workflowCurrentStageSource')}
                                        </span>
                                    )}
                                </div>
                                {renderPromptPreview(provenanceSourceTurn.prompt) && (
                                    <div
                                        className={
                                            tone === 'dark'
                                                ? 'mt-2 text-sm font-semibold text-white'
                                                : 'mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100'
                                        }
                                    >
                                        {renderPromptPreview(provenanceSourceTurn.prompt)}
                                    </div>
                                )}
                                <div
                                    className={
                                        tone === 'dark'
                                            ? 'mt-1 text-xs text-white/50'
                                            : 'mt-1 text-xs text-gray-500 dark:text-gray-400'
                                    }
                                >
                                    {getTranslatedModeLabel(provenanceSourceTurn.mode)} ·{' '}
                                    {new Date(provenanceSourceTurn.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>
                        <div
                            className={
                                tone === 'dark'
                                    ? 'mt-3 rounded-xl border border-white/10 bg-black/10 px-3 py-3'
                                    : 'mt-3 rounded-xl border border-dashed border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-[#10141b]'
                            }
                        >
                            <div
                                className={
                                    tone === 'dark'
                                        ? 'rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-3'
                                        : 'rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-500/20 dark:bg-amber-950/20'
                                }
                            >
                                <div
                                    className={
                                        tone === 'dark'
                                            ? 'text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200'
                                            : 'text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200'
                                    }
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{t('historyActionOwnerRoute')}</span>
                                        <InfoTooltip
                                            content={t('historyActionOwnerRouteHint')}
                                            buttonLabel={t('historyActionOwnerRoute')}
                                            dataTestId={getProvenanceTestId('provenance-source-route-hint')}
                                            tone={tone === 'dark' ? 'dark' : 'light'}
                                        />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    {renderHistoryTurnActionRow({
                                        item: provenanceSourceTurn,
                                        openLabel: t('historyActionOpenInHistory'),
                                        continueLabel: null,
                                        branchLabel: null,
                                        testIds: {
                                            open: getProvenanceTestId('provenance-source-open'),
                                        },
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {detailVisibility === 'full' && attributionOverviewRows.length > 0 && (
                <div
                    data-testid={getProvenanceTestId('provenance-attribution-overview')}
                    className={
                        tone === 'dark'
                            ? 'rounded-xl border border-white/10 bg-black/10 px-3 py-3'
                            : 'rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-[#10141b]'
                    }
                >
                    <div className={sectionLabelClassName}>{t('groundingPanelAttributionOverview')}</div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {attributionOverviewRows.map((row) => (
                            <div
                                data-testid={getProvenanceTestId(`provenance-attribution-${row.id}`)}
                                key={row.id}
                                className={
                                    tone === 'dark'
                                        ? 'rounded-lg border border-white/10 bg-white/5 px-3 py-2'
                                        : 'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-[#0a0c10]'
                                }
                            >
                                <div
                                    className={
                                        tone === 'dark'
                                            ? 'text-[10px] font-bold uppercase tracking-[0.14em] text-white/45'
                                            : 'text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500'
                                    }
                                >
                                    {row.label}
                                </div>
                                <div
                                    className={
                                        tone === 'dark'
                                            ? 'mt-1 text-sm font-semibold text-white'
                                            : 'mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'
                                    }
                                >
                                    {row.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {detailVisibility === 'full' && shouldShowAttributionStatusSection && (
                <div
                    className={
                        tone === 'dark'
                            ? 'rounded-xl border border-white/10 bg-black/10 px-3 py-3'
                            : 'rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-[#10141b]'
                    }
                >
                    <div className={sectionLabelClassName}>{t('groundingPanelAttributionStatus')}</div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div
                            data-testid={getProvenanceTestId('provenance-status-source-status')}
                            className={
                                tone === 'dark'
                                    ? 'rounded-lg border border-white/10 bg-white/5 px-3 py-2'
                                    : 'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-[#0a0c10]'
                            }
                        >
                            <div className={sectionLabelClassName}>{t('groundingPanelAttributionSourceStatus')}</div>
                            <div
                                className={
                                    tone === 'dark'
                                        ? 'mt-1 text-sm font-semibold text-white'
                                        : 'mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'
                                }
                            >
                                {sourceAttributionStatusMessage}
                            </div>
                        </div>
                        <div
                            data-testid={getProvenanceTestId('provenance-status-grounding-status')}
                            className={
                                tone === 'dark'
                                    ? 'rounded-lg border border-white/10 bg-white/5 px-3 py-2'
                                    : 'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-[#0a0c10]'
                            }
                        >
                            <div className={sectionLabelClassName}>{t('groundingPanelSourcesSection')}</div>
                            <div
                                className={
                                    tone === 'dark'
                                        ? 'mt-1 text-sm font-semibold text-white'
                                        : 'mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'
                                }
                            >
                                {groundingStateMessage}
                            </div>
                        </div>
                        <div
                            data-testid={getProvenanceTestId('provenance-status-support-status')}
                            className={
                                tone === 'dark'
                                    ? 'rounded-lg border border-white/10 bg-white/5 px-3 py-2'
                                    : 'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-[#0a0c10]'
                            }
                        >
                            <div className={sectionLabelClassName}>{t('groundingPanelCoverageSection')}</div>
                            <div
                                className={
                                    tone === 'dark'
                                        ? 'mt-1 text-sm font-semibold text-white'
                                        : 'mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'
                                }
                            >
                                {groundingSupportMessage}
                            </div>
                        </div>
                        <div
                            data-testid={getProvenanceTestId('provenance-status-entry-point-status')}
                            className={
                                tone === 'dark'
                                    ? 'rounded-lg border border-white/10 bg-white/5 px-3 py-2'
                                    : 'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-[#0a0c10]'
                            }
                        >
                            <div className={sectionLabelClassName}>{t('groundingPanelSearchEntryPoint')}</div>
                            <div
                                className={
                                    tone === 'dark'
                                        ? 'mt-1 text-sm font-semibold text-white'
                                        : 'mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'
                                }
                            >
                                {entryPointStatusMessage}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {detailVisibility === 'full' && uncitedSources.length > 0 && (
                <div>
                    <div className={sectionLabelClassName}>{t('groundingPanelUncitedSourcesSection')}</div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {uncitedSources.map(({ source, index }) => (
                            <div
                                key={`uncited-source-${index}`}
                                data-testid={getProvenanceTestId(`provenance-uncited-source-${index}`)}
                                className={
                                    tone === 'dark'
                                        ? 'rounded-xl border border-white/10 bg-black/10 px-3 py-3'
                                        : 'rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-[#10141b]'
                                }
                            >
                                <div
                                    className={
                                        tone === 'dark'
                                            ? 'text-sm font-semibold text-white'
                                            : 'text-sm font-semibold text-gray-900 dark:text-gray-100'
                                    }
                                >
                                    {source.title}
                                </div>
                                <div className={detailMetaClassName}>{formatSourceMeta(source)}</div>
                                <div className={detailMetaClassName}>{t('groundingPanelUncitedSourcesHint')}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {detailVisibility === 'full' && (groundingQueries.length > 0 || searchEntryPointRenderedContent) && (
                <div
                    className={
                        tone === 'dark'
                            ? 'rounded-xl border border-white/10 bg-black/10 px-3 py-3'
                            : 'rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-[#10141b]'
                    }
                >
                    {groundingQueries.length > 0 && (
                        <div>
                            <div className={sectionLabelClassName}>{t('groundingPanelQueriesSection')}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {groundingQueries.map((query, index) => (
                                    <span
                                        key={`${query}-${index}`}
                                        data-testid={getProvenanceTestId(`provenance-query-${index}`)}
                                        className={
                                            tone === 'dark'
                                                ? 'rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/75'
                                                : 'rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700 dark:border-gray-700 dark:bg-[#0a0c10] dark:text-gray-200'
                                        }
                                    >
                                        {query}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {searchEntryPointRenderedContent && (
                        <div className={groundingQueries.length > 0 ? 'mt-4' : undefined}>
                            <div className={sectionLabelClassName}>{t('groundingPanelSearchEntryPoint')}</div>
                            <div
                                data-testid={getProvenanceTestId('provenance-search-entry-point')}
                                className={
                                    tone === 'dark'
                                        ? 'mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/85 whitespace-pre-wrap break-words'
                                        : 'mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 whitespace-pre-wrap break-words dark:border-gray-800 dark:bg-[#0a0c10] dark:text-gray-200'
                                }
                            >
                                <div className={detailMetaClassName}>{entryPointStatusMessage}</div>
                                <div className="mt-2">{searchEntryPointRenderedContent}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {detailVisibility === 'full' && shouldShowDetailSection && (
                <div
                    data-testid={getProvenanceTestId('provenance-detail-shell')}
                    className={`mt-2 ${detailCardClassName}`}
                >
                    <div
                        data-testid={getProvenanceTestId('provenance-detail-summary')}
                        className="flex items-start justify-between gap-3"
                    >
                        <div className="min-w-0 flex-1">
                            <div className={sectionLabelClassName}>{t('groundingPanelCitationDetail')}</div>
                            <div
                                className={
                                    tone === 'dark'
                                        ? 'mt-2 text-sm text-white/85'
                                        : 'mt-2 text-sm text-gray-700 dark:text-gray-200'
                                }
                            >
                                {provenanceSelectionMessage}
                            </div>
                            {activeGroundingSelection && (
                                <div
                                    className={
                                        tone === 'dark'
                                            ? 'mt-1 text-xs text-white/55'
                                            : 'mt-1 text-xs text-gray-500 dark:text-gray-400'
                                    }
                                >
                                    {focusLinkedGroundingItems
                                        ? formatMessage(
                                              'groundingPanelFocusState',
                                              displayedSources.length,
                                              displayedSupportBundles.length,
                                          )
                                        : t('groundingPanelFullContextState')}
                                </div>
                            )}
                        </div>
                    </div>
                    <div data-testid={getProvenanceTestId('provenance-detail')} className="mt-3">
                        {!activeGroundingSelection && (
                            <div
                                data-testid={getProvenanceTestId('provenance-detail-empty')}
                                className={emptyClassName}
                            >
                                {t('groundingPanelEmptyDetail')}
                            </div>
                        )}
                        {activeGroundingSelection && (
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div
                                    data-testid={getProvenanceTestId('provenance-detail-focus-state')}
                                    className={
                                        tone === 'dark'
                                            ? 'text-xs text-white/55'
                                            : 'text-xs text-gray-500 dark:text-gray-400'
                                    }
                                >
                                    {focusLinkedGroundingItems
                                        ? formatMessage(
                                              'groundingPanelFocusState',
                                              displayedSources.length,
                                              displayedSupportBundles.length,
                                          )
                                        : t('groundingPanelFullContextState')}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        data-testid={getProvenanceTestId('provenance-detail-toggle-focus')}
                                        onClick={() => setFocusLinkedGroundingItems((current) => !current)}
                                        className={detailSecondaryActionClassName}
                                    >
                                        {focusLinkedGroundingItems
                                            ? t('groundingPanelShowAllItems')
                                            : t('groundingPanelFocusLinkedItems')}
                                    </button>
                                    <button
                                        type="button"
                                        data-testid={getProvenanceTestId('provenance-detail-clear-selection')}
                                        onClick={() => setActiveGroundingSelection(null)}
                                        className={detailSecondaryActionClassName}
                                    >
                                        {t('groundingPanelClearSelection')}
                                    </button>
                                </div>
                            </div>
                        )}
                        {activeGroundingSelection?.kind === 'source' && activeSource && (
                            <>
                                <div
                                    data-testid={getProvenanceTestId('provenance-detail-selected-source-details')}
                                    className={detailCardClassName}
                                >
                                    <div
                                        data-testid={getProvenanceTestId('provenance-detail-selected-source-summary')}
                                        className="flex items-start justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className={sectionLabelClassName}>
                                                {t('groundingPanelSelectedSource')}
                                            </div>
                                            <div
                                                className={
                                                    tone === 'dark'
                                                        ? 'mt-2 text-sm font-semibold text-white'
                                                        : 'mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100'
                                                }
                                            >
                                                {activeSource.title}
                                            </div>
                                            <div className={detailMetaClassName}>{formatSourceMeta(activeSource)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <a
                                            href={activeSource.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={detailSecondaryActionClassName}
                                        >
                                            {t('groundingPanelOpenSource')}
                                        </a>
                                    </div>
                                </div>
                                <div
                                    data-testid={getProvenanceTestId('provenance-detail-source-status')}
                                    className={`mt-4 ${detailCardClassName}`}
                                >
                                    <div className={sectionLabelClassName}>{t('groundingPanelAttributionStatus')}</div>
                                    <div
                                        className={
                                            tone === 'dark'
                                                ? 'mt-2 text-sm text-white/85'
                                                : 'mt-2 text-sm text-gray-700 dark:text-gray-200'
                                        }
                                    >
                                        {relatedBundlesForSelectedSource.length > 0
                                            ? formatMessage(
                                                  'groundingPanelSourceCitationCount',
                                                  relatedBundlesForSelectedSource.length,
                                              )
                                            : t('groundingPanelNoBundleCitesSource')}
                                    </div>
                                    <div
                                        data-testid={getProvenanceTestId('provenance-detail-source-compare-summary')}
                                        className={detailMetaClassName}
                                    >
                                        {formatMessage(
                                            relatedBundlesForSelectedSource.length > 0
                                                ? 'groundingPanelSourceCompareSummaryCited'
                                                : 'groundingPanelSourceCompareSummaryUncited',
                                            relatedBundlesForSelectedSource.length,
                                            effectiveTotalSupportBundleCount,
                                        )}
                                    </div>
                                    <div className={detailMetaClassName}>{sourceAttributionStatusMessage}</div>
                                </div>
                                {renderReusePreview()}
                                <div
                                    data-testid={getProvenanceTestId('provenance-detail-cited-segments-details')}
                                    className={`mt-4 ${detailCardClassName}`}
                                >
                                    <div
                                        data-testid={getProvenanceTestId('provenance-detail-cited-segments-summary')}
                                        className="flex items-start justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className={sectionLabelClassName}>
                                                {t('groundingPanelCitedSegments')}
                                            </div>
                                            <div
                                                className={
                                                    tone === 'dark'
                                                        ? 'mt-2 text-sm text-white/85'
                                                        : 'mt-2 text-sm text-gray-700 dark:text-gray-200'
                                                }
                                            >
                                                {relatedBundlesForSelectedSource.length > 0
                                                    ? formatMessage(
                                                          'groundingPanelSourceCitationCount',
                                                          relatedBundlesForSelectedSource.length,
                                                      )
                                                    : t('groundingPanelNoBundleCitesSource')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {relatedBundlesForSelectedSource.length > 0 ? (
                                            relatedBundlesForSelectedSource.map(({ bundle, index }) => (
                                                <div
                                                    key={`detail-bundle-${index}`}
                                                    data-testid={getProvenanceTestId(
                                                        `provenance-compare-bundle-${index}`,
                                                    )}
                                                    className={
                                                        tone === 'dark'
                                                            ? 'rounded-xl border border-white/10 bg-white/5 px-3 py-3'
                                                            : 'rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-[#0a0c10]'
                                                    }
                                                >
                                                    <div
                                                        data-testid={getProvenanceTestId(
                                                            `provenance-compare-bundle-details-${index}`,
                                                        )}
                                                    >
                                                        <button
                                                            type="button"
                                                            data-testid={getProvenanceTestId(
                                                                `provenance-compare-bundle-summary-${index}`,
                                                            )}
                                                            onClick={() =>
                                                                setActiveGroundingSelection({
                                                                    kind: 'bundle',
                                                                    index,
                                                                })
                                                            }
                                                            className="flex w-full cursor-pointer items-start justify-between gap-3 bg-transparent p-0 text-left"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div
                                                                    className={
                                                                        tone === 'dark'
                                                                            ? 'text-[10px] font-bold uppercase tracking-[0.16em] text-white/45'
                                                                            : 'text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500'
                                                                    }
                                                                >
                                                                    {formatMessage(
                                                                        'groundingPanelSupportBundleTitle',
                                                                        index + 1,
                                                                    )}
                                                                </div>
                                                                <div
                                                                    className={
                                                                        tone === 'dark'
                                                                            ? 'mt-2 text-sm text-white/85'
                                                                            : 'mt-2 text-sm text-gray-700 dark:text-gray-200'
                                                                    }
                                                                >
                                                                    {renderPromptPreview(bundle.segmentText) ||
                                                                        t('groundingPanelNoBundleSegmentText')}
                                                                </div>
                                                                <div className={detailMetaClassName}>
                                                                    {formatMessage(
                                                                        'groundingPanelChunksMeta',
                                                                        bundle.chunkIndices.join(', ') ||
                                                                            t('groundingProvenanceNone'),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                        <div
                                                            className={
                                                                tone === 'dark'
                                                                    ? 'mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/85'
                                                                    : 'mt-3 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-[#11151b] dark:text-gray-200'
                                                            }
                                                        >
                                                            {bundle.segmentText ||
                                                                t('groundingPanelNoBundleSegmentText')}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className={emptyClassName}>
                                                {t('groundingPanelNoBundleCitesSource')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                        {activeGroundingSelection?.kind === 'bundle' && activeSupportBundle && (
                            <>
                                <div
                                    data-testid={getProvenanceTestId('provenance-detail-selected-bundle-details')}
                                    className={detailCardClassName}
                                >
                                    <div
                                        data-testid={getProvenanceTestId('provenance-detail-selected-bundle-summary')}
                                        className="flex items-start justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className={sectionLabelClassName}>
                                                {t('groundingPanelSelectedBundle')}
                                            </div>
                                            <div
                                                className={
                                                    tone === 'dark'
                                                        ? 'mt-2 text-sm font-semibold text-white'
                                                        : 'mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100'
                                                }
                                            >
                                                {formatMessage(
                                                    'groundingPanelSupportBundleTitle',
                                                    activeGroundingSelection.index + 1,
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span
                                                className={
                                                    tone === 'dark'
                                                        ? 'rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/65'
                                                        : 'rounded-full border border-gray-200 px-2 py-1 text-[10px] text-gray-500 dark:border-gray-700 dark:text-gray-300'
                                                }
                                            >
                                                {formatMessage(
                                                    'groundingPanelCitedSourcesCount',
                                                    activeSupportBundle.sourceIndices?.length ||
                                                        activeSupportBundle.sourceTitles?.length ||
                                                        0,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`mt-3 ${detailMetaClassName}`}>
                                        {formatMessage(
                                            'groundingPanelSelectedBundleMeta',
                                            activeSupportBundle.chunkIndices.join(', ') || t('groundingProvenanceNone'),
                                            relatedSourcesForSelectedBundle.length,
                                        )}
                                    </div>
                                </div>
                                <div
                                    data-testid={getProvenanceTestId('provenance-detail-bundle-segment-details')}
                                    className={`mt-3 ${detailCardClassName}`}
                                >
                                    <div
                                        data-testid={getProvenanceTestId('provenance-detail-bundle-segment-summary')}
                                        className="flex items-start justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className={sectionLabelClassName}>
                                                {t('groundingPanelCitedSegments')}
                                            </div>
                                            <div
                                                className={
                                                    tone === 'dark'
                                                        ? 'mt-2 text-sm text-white/85'
                                                        : 'mt-2 text-sm text-gray-700 dark:text-gray-200'
                                                }
                                            >
                                                {renderPromptPreview(activeSupportBundle.segmentText) ||
                                                    t('groundingPanelNoBundleSegmentText')}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className={
                                            tone === 'dark'
                                                ? 'mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/85'
                                                : 'mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-[#0a0c10] dark:text-gray-200'
                                        }
                                    >
                                        {activeSupportBundle.segmentText || t('groundingPanelNoBundleSegmentText')}
                                    </div>
                                </div>
                                <div
                                    data-testid={getProvenanceTestId('provenance-detail-linked-sources-details')}
                                    className={`mt-4 ${detailCardClassName}`}
                                >
                                    <div
                                        data-testid={getProvenanceTestId('provenance-detail-linked-sources-summary')}
                                        className="flex items-start justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className={sectionLabelClassName}>
                                                {t('groundingPanelLinkedSources')}
                                            </div>
                                            <div
                                                className={
                                                    tone === 'dark'
                                                        ? 'mt-2 text-sm text-white/85'
                                                        : 'mt-2 text-sm text-gray-700 dark:text-gray-200'
                                                }
                                            >
                                                {relatedSourcesForSelectedBundle.length > 0
                                                    ? formatMessage(
                                                          'groundingPanelCitedSourcesCount',
                                                          relatedSourcesForSelectedBundle.length,
                                                      )
                                                    : t('groundingPanelNoLinkedSourcesForBundle')}
                                            </div>
                                            <div
                                                data-testid={getProvenanceTestId(
                                                    'provenance-detail-bundle-compare-summary',
                                                )}
                                                className={detailMetaClassName}
                                            >
                                                {formatMessage(
                                                    'groundingPanelBundleCompareSummary',
                                                    relatedSourcesForSelectedBundle.length,
                                                    effectiveTotalSourceCount,
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {relatedSourcesForSelectedBundle.length > 0 ? (
                                            relatedSourcesForSelectedBundle.map(({ source, index }) => (
                                                <div
                                                    key={`detail-source-${index}`}
                                                    data-testid={getProvenanceTestId(
                                                        `provenance-compare-source-${index}`,
                                                    )}
                                                    className={
                                                        tone === 'dark'
                                                            ? 'rounded-xl border border-white/10 bg-white/5 px-3 py-3'
                                                            : 'rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-[#0a0c10]'
                                                    }
                                                >
                                                    <div
                                                        data-testid={getProvenanceTestId(
                                                            `provenance-compare-source-details-${index}`,
                                                        )}
                                                    >
                                                        <button
                                                            type="button"
                                                            data-testid={getProvenanceTestId(
                                                                `provenance-compare-source-summary-${index}`,
                                                            )}
                                                            onClick={() =>
                                                                setActiveGroundingSelection({
                                                                    kind: 'source',
                                                                    index,
                                                                })
                                                            }
                                                            className="flex w-full cursor-pointer items-start justify-between gap-3 bg-transparent p-0 text-left"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div
                                                                    className={
                                                                        tone === 'dark'
                                                                            ? 'text-sm font-semibold text-white'
                                                                            : 'text-sm font-semibold text-gray-900 dark:text-gray-100'
                                                                    }
                                                                >
                                                                    {source.title}
                                                                </div>
                                                                <div className={detailMetaClassName}>
                                                                    {formatSourceMeta(source)}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-start gap-3">
                                                                <span className={compareStateChipClassName('linked')}>
                                                                    {t('groundingPanelCompareStateLinked')}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className={emptyClassName}>
                                                {t('groundingPanelNoLinkedSourcesForBundle')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {otherSourcesForSelectedBundle.length > 0 && (
                                    <div
                                        data-testid={getProvenanceTestId('provenance-detail-other-sources-details')}
                                        className={`mt-4 ${detailCardClassName}`}
                                    >
                                        <div
                                            data-testid={getProvenanceTestId('provenance-detail-other-sources-summary')}
                                            className="flex items-start justify-between gap-3"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className={sectionLabelClassName}>
                                                    {t('groundingPanelOtherRetrievedSources')}
                                                </div>
                                                <div
                                                    className={
                                                        tone === 'dark'
                                                            ? 'mt-2 text-sm text-white/85'
                                                            : 'mt-2 text-sm text-gray-700 dark:text-gray-200'
                                                    }
                                                >
                                                    {formatMessage(
                                                        'groundingPanelBundleCompareOtherSources',
                                                        otherSourcesForSelectedBundle.length,
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {otherSourcesForSelectedBundle.map(({ source, index }) => (
                                                <div
                                                    key={`detail-other-source-${index}`}
                                                    data-testid={getProvenanceTestId(
                                                        `provenance-compare-other-source-${index}`,
                                                    )}
                                                    className={
                                                        tone === 'dark'
                                                            ? 'rounded-xl border border-white/10 bg-white/5 px-3 py-3'
                                                            : 'rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-[#0a0c10]'
                                                    }
                                                >
                                                    <div
                                                        data-testid={getProvenanceTestId(
                                                            `provenance-compare-other-source-details-${index}`,
                                                        )}
                                                    >
                                                        <button
                                                            type="button"
                                                            data-testid={getProvenanceTestId(
                                                                `provenance-compare-other-source-summary-${index}`,
                                                            )}
                                                            onClick={() =>
                                                                setActiveGroundingSelection({
                                                                    kind: 'source',
                                                                    index,
                                                                })
                                                            }
                                                            className="flex w-full cursor-pointer items-start justify-between gap-3 bg-transparent p-0 text-left"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div
                                                                    className={
                                                                        tone === 'dark'
                                                                            ? 'text-sm font-semibold text-white'
                                                                            : 'text-sm font-semibold text-gray-900 dark:text-gray-100'
                                                                    }
                                                                >
                                                                    {source.title}
                                                                </div>
                                                                <div className={detailMetaClassName}>
                                                                    {formatSourceMeta(source)}
                                                                </div>
                                                                <div className={detailMetaClassName}>
                                                                    {t('groundingPanelSourceStatusRetrievedOnly')}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap items-start justify-end gap-2">
                                                                <span
                                                                    className={
                                                                        tone === 'dark'
                                                                            ? 'rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70'
                                                                            : 'rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600 dark:border-gray-700 dark:bg-[#181d26] dark:text-gray-300'
                                                                    }
                                                                >
                                                                    {t('groundingPanelSourceStatusRetrievedOnly')}
                                                                </span>
                                                                <span className={compareStateChipClassName('outside')}>
                                                                    {t('groundingPanelCompareStateOutside')}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {renderReusePreview()}
                            </>
                        )}
                    </div>
                </div>
            )}

            {shouldShowSourcesSection && (
                <div>
                    <div className={sectionLabelClassName}>{t('groundingPanelSourcesSection')}</div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {displayedSources.length > 0 ? (
                            displayedSources.map(({ source, index }) =>
                                renderGroundingSourceCard(
                                    source,
                                    index,
                                    getProvenanceTestId(`provenance-source-${index}`),
                                ),
                            )
                        ) : (
                            <div className={emptyClassName}>
                                {focusLinkedGroundingItems && activeGroundingSelection
                                    ? t('groundingPanelNoLinkedSourcesForSelection')
                                    : groundingStateMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {shouldShowCoverageSection && (
                <div>
                    <div className={sectionLabelClassName}>{t('groundingPanelCoverageSection')}</div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {displayedSupportBundles.length > 0 ? (
                            displayedSupportBundles.map(({ bundle, index }) =>
                                renderGroundingCoverageBundle(
                                    bundle,
                                    index,
                                    getProvenanceTestId(`provenance-bundle-${index}`),
                                ),
                            )
                        ) : (
                            <div className={emptyClassName}>
                                {focusLinkedGroundingItems && activeGroundingSelection
                                    ? t('groundingPanelNoLinkedBundlesForSelection')
                                    : groundingSupportMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(GroundingProvenancePanel);
