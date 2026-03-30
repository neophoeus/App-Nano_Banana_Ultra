import { useCallback, useMemo } from 'react';
import { GenerationSettings, GroundingMetadata, ResultArtifacts, WorkspaceSessionState } from '../types';
import { deriveGroundingMode, getGroundingModeLabel } from '../utils/groundingMode';
import { buildGroundingAttributionDetails, buildGroundingAttributionOverview } from '../utils/groundingProvenance';
import { formatStructuredOutputDisplay, normalizeStructuredOutputMode } from '../utils/structuredOutputs';
import { GroundingSelection } from './useSelectedResultState';

type UseGroundingProvenanceViewArgs = {
    selectedResultText: string | null;
    selectedThoughts: string | null;
    selectedStructuredData: Record<string, unknown> | null;
    selectedGrounding: GroundingMetadata | null;
    selectedMetadata: Record<string, unknown> | null;
    selectedSessionHints: Record<string, unknown> | null;
    workspaceSession: WorkspaceSessionState;
    viewSettings: GenerationSettings;
    activeGroundingSelection: GroundingSelection;
    focusLinkedGroundingItems: boolean;
    getHistoryTurnById: (historyId?: string | null) => any;
    getShortTurnId: (historyId?: string | null) => string;
    currentStageSourceHistoryId: string | null;
    setPrompt: React.Dispatch<React.SetStateAction<string>>;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    addLog: (message: string) => void;
    t: (key: string) => string;
};

const normalizeGroundingPromptSnippet = (value: string) => value.replace(/\s+/g, ' ').trim();
const normalizeOptionalDisplayString = (value: unknown) => {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue || normalizedValue === 'undefined' || normalizedValue === 'null') {
        return null;
    }

    return normalizedValue;
};
const OUTPUT_DIMENSION_SIZE_LABELS: Record<string, string> = {
    '1024x1024': '1K',
    '2048x2048': '2K',
    '4096x4096': '4K',
};
const EMPTY_GROUNDING_SOURCES: NonNullable<GroundingMetadata['sources']> = [];
const EMPTY_GROUNDING_SUPPORTS: NonNullable<GroundingMetadata['supports']> = [];
const EMPTY_SESSION_HINT_ENTRIES: Array<[string, unknown]> = [];

export function useGroundingProvenanceView({
    selectedResultText,
    selectedThoughts,
    selectedStructuredData,
    selectedGrounding,
    selectedMetadata,
    selectedSessionHints,
    workspaceSession,
    viewSettings,
    activeGroundingSelection,
    focusLinkedGroundingItems,
    getHistoryTurnById,
    getShortTurnId,
    currentStageSourceHistoryId,
    setPrompt,
    showNotification,
    addLog,
    t,
}: UseGroundingProvenanceViewArgs) {
    const formatMessage = useCallback(
        (key: string, ...values: string[]) =>
            values.reduce((message, value, index) => message.replace(`{${index}}`, value), t(key)),
        [t],
    );
    const getSessionContinuitySourceLabel = useCallback(
        (source: WorkspaceSessionState['source']) => {
            switch (source) {
                case 'generated':
                    return t('workspaceInsightsContinuitySourceGenerated');
                case 'history':
                    return t('workspaceInsightsContinuitySourceHistory');
                case 'follow-up':
                    return t('workspaceInsightsContinuitySourceFollowUp');
                default:
                    return null;
            }
        },
        [t],
    );
    const effectiveResultText = selectedResultText ?? workspaceSession.activeResult?.text ?? null;
    const effectiveThoughts = selectedThoughts ?? workspaceSession.activeResult?.thoughts ?? null;
    const effectiveStructuredData = selectedStructuredData ?? workspaceSession.activeResult?.structuredData ?? null;
    const effectiveGrounding =
        selectedGrounding ?? workspaceSession.activeResult?.grounding ?? workspaceSession.continuityGrounding ?? null;
    const effectiveMetadata = selectedMetadata ?? workspaceSession.activeResult?.metadata ?? null;
    const effectiveSessionHints =
        selectedSessionHints ??
        workspaceSession.activeResult?.sessionHints ??
        workspaceSession.continuitySessionHints ??
        null;
    const effectiveStructuredOutputMode = normalizeStructuredOutputMode(
        effectiveMetadata?.structuredOutputMode || viewSettings.structuredOutputMode,
    );
    const formattedStructuredOutput = formatStructuredOutputDisplay(effectiveStructuredData, effectiveResultText);
    const sessionUpdatedLabel = workspaceSession.updatedAt
        ? new Date(workspaceSession.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : t('groundingProvenanceNoActiveSessionTurn');
    const normalizedSessionActualDimensions = normalizeOptionalDisplayString(
        effectiveSessionHints?.actualImageDimensions,
    );
    const normalizedRequestedImageSize =
        normalizeOptionalDisplayString(effectiveMetadata?.requestedImageSize) ||
        normalizeOptionalDisplayString(effectiveSessionHints?.imageSizeRequested);
    const actualOutputDimensions = normalizedSessionActualDimensions
        ? normalizedSessionActualDimensions
        : typeof effectiveMetadata?.actualOutput === 'object' &&
            effectiveMetadata?.actualOutput !== null &&
            typeof (effectiveMetadata.actualOutput as Record<string, unknown>).width === 'number' &&
            typeof (effectiveMetadata.actualOutput as Record<string, unknown>).height === 'number'
          ? `${String((effectiveMetadata.actualOutput as Record<string, unknown>).width)}x${String((effectiveMetadata.actualOutput as Record<string, unknown>).height)}`
          : null;
    const requestedImageSize = normalizedRequestedImageSize;
    const fallbackRequestedImageSize = normalizeOptionalDisplayString(viewSettings.size);
    const actualOutputSizeLabel = actualOutputDimensions
        ? OUTPUT_DIMENSION_SIZE_LABELS[actualOutputDimensions] || actualOutputDimensions
        : null;
    const effectiveGroundingMode = deriveGroundingMode(viewSettings.googleSearch, viewSettings.imageSearch);
    const effectiveGroundingModeLabel = getGroundingModeLabel(effectiveGroundingMode);
    const effectiveRequestedImageSize =
        requestedImageSize || fallbackRequestedImageSize || t('groundingProvenanceNone');
    const groundingResolutionStatusSummary =
        effectiveGroundingMode !== 'off' && actualOutputSizeLabel
            ? formatMessage(
                  'stageGroundingResultSummary',
                  effectiveGroundingModeLabel,
                  effectiveRequestedImageSize,
                  actualOutputSizeLabel,
              )
            : null;
    const groundingResolutionStatusTone = groundingResolutionStatusSummary
        ? actualOutputSizeLabel !== effectiveRequestedImageSize
            ? 'warning'
            : 'success'
        : null;

    const sessionContinuitySignals = useMemo(() => {
        const sourceLabel = getSessionContinuitySourceLabel(workspaceSession.source);

        return [
            sourceLabel ? formatMessage('workspaceInsightsContinuitySourceTurn', sourceLabel) : null,
            workspaceSession.sourceHistoryId ? t('workspaceInsightsContinuityHistoryLinked') : null,
            workspaceSession.conversationId ? t('workspaceInsightsContinuityOfficialChat') : null,
            workspaceSession.conversationTurnIds.length > 0
                ? formatMessage(
                      'workspaceInsightsContinuityChatTurns',
                      String(workspaceSession.conversationTurnIds.length),
                  )
                : null,
            workspaceSession.provenanceMode === 'inherited'
                ? t('workspaceInsightsContinuityProvenanceInherited')
                : workspaceSession.provenanceMode === 'live'
                  ? t('workspaceInsightsContinuityProvenanceLive')
                  : null,
            workspaceSession.activeResult?.sessionHints?.thoughtSignatureReturned
                ? t('workspaceInsightsContinuityThoughtSignature')
                : null,
            workspaceSession.activeResult?.sessionHints?.groundingMetadataReturned
                ? t('workspaceInsightsContinuityGroundingMetadata')
                : null,
            workspaceSession.activeResult?.sessionHints?.groundingSupportsReturned
                ? t('workspaceInsightsContinuityGroundingSupports')
                : null,
        ].filter(Boolean) as string[];
    }, [
        formatMessage,
        getSessionContinuitySourceLabel,
        t,
        workspaceSession.activeResult?.sessionHints?.groundingMetadataReturned,
        workspaceSession.activeResult?.sessionHints?.groundingSupportsReturned,
        workspaceSession.activeResult?.sessionHints?.thoughtSignatureReturned,
        workspaceSession.conversationId,
        workspaceSession.conversationTurnIds.length,
        workspaceSession.provenanceMode,
        workspaceSession.source,
        workspaceSession.sourceHistoryId,
    ]);

    const insightRows = useMemo(
        () => [
            {
                label: t('groundingProvenanceInsightOutputFormat'),
                value: String(effectiveMetadata?.outputFormat || viewSettings.outputFormat),
            },
            ...(effectiveStructuredOutputMode !== 'off'
                ? [
                      {
                          label: t('composerAdvancedStructuredOutput'),
                          value: effectiveStructuredOutputMode,
                      },
                  ]
                : []),
            {
                label: t('groundingProvenanceInsightTemperature'),
                value: String(effectiveMetadata?.temperature || viewSettings.temperature),
            },
            {
                label: t('groundingProvenanceInsightThinkingLevel'),
                value: String(effectiveMetadata?.thinkingLevel || viewSettings.thinkingLevel),
            },
            {
                label: t('groundingProvenanceInsightReturnThoughts'),
                value: String(Boolean(effectiveMetadata?.includeThoughts ?? viewSettings.includeThoughts)),
            },
            {
                label: t('groundingProvenanceInsightGrounding'),
                value: getGroundingModeLabel(deriveGroundingMode(viewSettings.googleSearch, viewSettings.imageSearch)),
            },
            {
                label: t('groundingProvenanceInsightRequestedSize'),
                value: requestedImageSize || fallbackRequestedImageSize || t('groundingProvenanceNone'),
            },
            {
                label: t('groundingProvenanceInsightActualOutput'),
                value: actualOutputDimensions || t('groundingProvenanceNone'),
            },
        ],
        [
            actualOutputDimensions,
            effectiveMetadata?.includeThoughts,
            effectiveMetadata?.outputFormat,
            effectiveMetadata?.temperature,
            effectiveMetadata?.thinkingLevel,
            effectiveStructuredOutputMode,
            fallbackRequestedImageSize,
            requestedImageSize,
            t,
            viewSettings.googleSearch,
            viewSettings.imageSearch,
            viewSettings.includeThoughts,
            viewSettings.outputFormat,
            viewSettings.temperature,
            viewSettings.thinkingLevel,
        ],
    );

    const selectedSources = effectiveGrounding?.sources ?? EMPTY_GROUNDING_SOURCES;
    const selectedSupportBundles = effectiveGrounding?.supports ?? EMPTY_GROUNDING_SUPPORTS;
    const activeSupportBundle =
        activeGroundingSelection?.kind === 'bundle' ? selectedSupportBundles[activeGroundingSelection.index] : null;
    const activeSource =
        activeGroundingSelection?.kind === 'source' ? selectedSources[activeGroundingSelection.index] : null;

    const activeSourceIndexSet = useMemo(
        () =>
            activeGroundingSelection?.kind === 'bundle'
                ? new Set(activeSupportBundle?.sourceIndices || [])
                : activeGroundingSelection?.kind === 'source'
                  ? new Set([activeGroundingSelection.index])
                  : new Set<number>(),
        [activeGroundingSelection, activeSupportBundle?.sourceIndices],
    );

    const activeSourceTitleSet = useMemo(
        () =>
            activeGroundingSelection?.kind === 'bundle'
                ? new Set(activeSupportBundle?.sourceTitles || [])
                : activeGroundingSelection?.kind === 'source' && activeSource
                  ? new Set([activeSource.title])
                  : new Set<string>(),
        [activeGroundingSelection, activeSource, activeSupportBundle?.sourceTitles],
    );

    const activeBundleIndexSet = useMemo(
        () =>
            activeGroundingSelection?.kind === 'source'
                ? new Set(
                      selectedSupportBundles
                          .map((bundle, index) => ({ bundle, index }))
                          .filter(({ bundle }) => {
                              const sourceIndexMatch =
                                  Array.isArray(bundle.sourceIndices) &&
                                  bundle.sourceIndices.includes(activeGroundingSelection.index);
                              const sourceTitleMatch =
                                  typeof activeSource?.title === 'string' &&
                                  Array.isArray(bundle.sourceTitles) &&
                                  bundle.sourceTitles.includes(activeSource.title);
                              return sourceIndexMatch || sourceTitleMatch;
                          })
                          .map(({ index }) => index),
                  )
                : activeGroundingSelection?.kind === 'bundle'
                  ? new Set([activeGroundingSelection.index])
                  : new Set<number>(),
        [activeGroundingSelection, activeSource?.title, selectedSupportBundles],
    );

    const relatedSourcesForSelectedBundle = useMemo(
        () =>
            activeGroundingSelection?.kind === 'bundle'
                ? selectedSources
                      .map((source, index) => ({ source, index }))
                      .filter(
                          ({ source, index }) =>
                              activeSourceIndexSet.has(index) || activeSourceTitleSet.has(source.title),
                      )
                : [],
        [activeGroundingSelection, activeSourceIndexSet, activeSourceTitleSet, selectedSources],
    );

    const otherSourcesForSelectedBundle = useMemo(() => {
        if (activeGroundingSelection?.kind !== 'bundle') {
            return [];
        }

        return selectedSources
            .map((source, index) => ({ source, index }))
            .filter(({ source, index }) => !activeSourceIndexSet.has(index) && !activeSourceTitleSet.has(source.title));
    }, [activeGroundingSelection, activeSourceIndexSet, activeSourceTitleSet, selectedSources]);

    const relatedBundlesForSelectedSource = useMemo(
        () =>
            activeGroundingSelection?.kind === 'source'
                ? selectedSupportBundles
                      .map((bundle, index) => ({ bundle, index }))
                      .filter(({ index }) => activeBundleIndexSet.has(index))
                : [],
        [activeBundleIndexSet, activeGroundingSelection, selectedSupportBundles],
    );

    const sourceCitationCountByIndex = useMemo(
        () =>
            new Map(
                selectedSources.map((source, index) => {
                    const citationCount = selectedSupportBundles.reduce((count, bundle) => {
                        const sourceIndexMatch =
                            Array.isArray(bundle.sourceIndices) && bundle.sourceIndices.includes(index);
                        const sourceTitleMatch =
                            Array.isArray(bundle.sourceTitles) && bundle.sourceTitles.includes(source.title);
                        return count + (sourceIndexMatch || sourceTitleMatch ? 1 : 0);
                    }, 0);

                    return [index, citationCount] as const;
                }),
            ),
        [selectedSources, selectedSupportBundles],
    );

    const displayedSources = useMemo(
        () =>
            focusLinkedGroundingItems && activeGroundingSelection
                ? activeGroundingSelection.kind === 'bundle'
                    ? relatedSourcesForSelectedBundle
                    : activeGroundingSelection.kind === 'source' && activeSource
                      ? [{ source: activeSource, index: activeGroundingSelection.index }]
                      : []
                : selectedSources.map((source, index) => ({ source, index })),
        [
            activeGroundingSelection,
            activeSource,
            focusLinkedGroundingItems,
            relatedSourcesForSelectedBundle,
            selectedSources,
        ],
    );

    const displayedSupportBundles = useMemo(
        () =>
            focusLinkedGroundingItems && activeGroundingSelection
                ? activeGroundingSelection.kind === 'source'
                    ? relatedBundlesForSelectedSource
                    : activeGroundingSelection.kind === 'bundle' && activeSupportBundle
                      ? [{ bundle: activeSupportBundle, index: activeGroundingSelection.index }]
                      : []
                : selectedSupportBundles.map((bundle, index) => ({ bundle, index })),
        [
            activeGroundingSelection,
            activeSupportBundle,
            focusLinkedGroundingItems,
            relatedBundlesForSelectedSource,
            selectedSupportBundles,
        ],
    );

    const groundingQueries = useMemo(
        () => [...(effectiveGrounding?.webQueries || []), ...(effectiveGrounding?.imageQueries || [])],
        [effectiveGrounding?.imageQueries, effectiveGrounding?.webQueries],
    );

    const searchEntryPointRenderedContent = effectiveGrounding?.searchEntryPointRenderedContent;
    const attributionOverviewRows = useMemo(
        () =>
            buildGroundingAttributionOverview({
                grounding: effectiveGrounding,
                t,
            }),
        [effectiveGrounding, t],
    );
    const {
        uncitedSources,
        citedSourceIndexSet,
        citedSourceTitleSet,
        sourceAttributionStatusMessage,
        entryPointStatusMessage,
    } = useMemo(
        () =>
            buildGroundingAttributionDetails({
                grounding: effectiveGrounding,
                t,
            }),
        [effectiveGrounding, t],
    );
    const sessionHintEntries = useMemo(
        () => (effectiveSessionHints ? Object.entries(effectiveSessionHints) : EMPTY_SESSION_HINT_ENTRIES),
        [effectiveSessionHints],
    );
    const formatSessionHintKey = useCallback(
        (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()),
        [],
    );
    const formatSessionHintValue = useCallback(
        (value: unknown) => {
            if (typeof value === 'string') {
                return normalizeOptionalDisplayString(value) || t('groundingProvenanceNone');
            }
            if (typeof value === 'number' || typeof value === 'boolean' || value == null) {
                return String(value);
            }

            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        },
        [t],
    );
    const formatSourceHost = useCallback((url: string) => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }, []);

    const activeGroundingReuseSnippet =
        activeGroundingSelection?.kind === 'bundle'
            ? normalizeGroundingPromptSnippet(
                  [
                      activeSupportBundle?.segmentText
                          ? formatMessage('groundingProvenanceCitedDetail', activeSupportBundle.segmentText)
                          : null,
                      activeSupportBundle?.sourceTitles?.length
                          ? formatMessage('groundingProvenanceSources', activeSupportBundle.sourceTitles.join(', '))
                          : null,
                  ]
                      .filter(Boolean)
                      .join('. '),
              )
            : activeGroundingSelection?.kind === 'source' && activeSource
              ? normalizeGroundingPromptSnippet(
                    formatMessage(
                        'groundingProvenanceReferenceSource',
                        activeSource.title,
                        formatSourceHost(activeSource.url),
                    ),
                )
              : '';

    const activeGroundingReuseLabel =
        activeGroundingSelection?.kind === 'bundle'
            ? formatMessage('groundingProvenanceReuseSupportBundle', String(activeGroundingSelection.index + 1))
            : activeGroundingSelection?.kind === 'source' && activeSource
              ? formatMessage('groundingProvenanceReuseSource', formatSourceHost(activeSource.url))
              : t('groundingProvenanceReuseDetail');

    const activeGroundingAppendPreview = activeGroundingReuseSnippet
        ? viewSettings.prompt.trim()
            ? `${viewSettings.prompt.trim()}\n${formatMessage('groundingProvenanceReferenceCue', activeGroundingReuseSnippet)}`
            : activeGroundingReuseSnippet
        : '';

    const activeGroundingReplacePreview = activeGroundingReuseSnippet;
    const activeGroundingHasExistingPrompt = Boolean(viewSettings.prompt.trim());
    const activeGroundingCurrentPromptText = viewSettings.prompt.trim();
    const activeGroundingAppendCueText = activeGroundingReuseSnippet
        ? formatMessage('groundingProvenanceReferenceCue', activeGroundingReuseSnippet)
        : '';

    const handleAppendGroundingSelectionToPrompt = useCallback(() => {
        if (!activeGroundingReuseSnippet) {
            showNotification(t('groundingProvenanceSelectFirst'), 'error');
            return;
        }

        setPrompt(activeGroundingAppendPreview);
        showNotification(t('groundingProvenanceAppendNotice'), 'info');
        addLog(formatMessage('groundingProvenanceAppendLog', activeGroundingReuseLabel));
    }, [
        activeGroundingAppendPreview,
        activeGroundingReuseLabel,
        activeGroundingReuseSnippet,
        addLog,
        formatMessage,
        setPrompt,
        showNotification,
        t,
    ]);

    const handleReplacePromptWithGroundingSelection = useCallback(() => {
        if (!activeGroundingReuseSnippet) {
            showNotification(t('groundingProvenanceSelectFirst'), 'error');
            return;
        }

        setPrompt(activeGroundingReplacePreview);
        showNotification(t('groundingProvenanceReplaceNotice'), 'info');
        addLog(formatMessage('groundingProvenanceReplaceLog', activeGroundingReuseLabel));
    }, [
        activeGroundingReplacePreview,
        activeGroundingReuseLabel,
        activeGroundingReuseSnippet,
        addLog,
        formatMessage,
        setPrompt,
        showNotification,
        t,
    ]);

    const thoughtStateMessage = effectiveThoughts
        ? t('groundingProvenanceThoughtVisible')
        : effectiveSessionHints?.thoughtSignatureReturned
          ? t('groundingProvenanceThoughtHiddenSignature')
          : viewSettings.includeThoughts
            ? t('groundingProvenanceThoughtRequestedNone')
            : t('groundingProvenanceThoughtNotRequested');

    const groundingStateMessage =
        selectedSources.length > 0
            ? t('groundingProvenanceGroundingSourcesReturned')
            : groundingQueries.length > 0
              ? t('groundingProvenanceGroundingQueriesNoSources')
              : effectiveSessionHints?.groundingMetadataReturned
                ? t('groundingProvenanceGroundingMetadataNoSources')
                : viewSettings.googleSearch
                  ? t('groundingProvenanceGroundingRequestedNone')
                  : t('groundingProvenanceGroundingNotRequested');

    const groundingSupportMessage =
        selectedSupportBundles.length > 0
            ? t('groundingProvenanceSupportBundlesUsed')
            : effectiveSessionHints?.groundingSupportsReturned
              ? t('groundingProvenanceSupportMetadataNoBundles')
              : t('groundingProvenanceSupportNone');

    const provenanceContinuityMessage =
        workspaceSession.provenanceMode === 'inherited'
            ? t('groundingProvenanceContinuityInherited')
            : workspaceSession.provenanceMode === 'live'
              ? t('groundingProvenanceContinuityLive')
              : t('groundingProvenanceContinuityInactive');

    const provenanceModeLabel =
        workspaceSession.provenanceMode === 'inherited'
            ? t('groundingProvenanceModeInherited')
            : workspaceSession.provenanceMode === 'live'
              ? t('groundingProvenanceModeLive')
              : t('groundingProvenanceModeInactive');

    const sessionSourceTurn = getHistoryTurnById(workspaceSession.sourceHistoryId);
    const provenanceSourceTurn = getHistoryTurnById(workspaceSession.provenanceSourceHistoryId);
    const provenanceSummaryRows = useMemo(
        () => [
            { id: 'mode', label: t('groundingProvenanceSummaryMode'), value: provenanceModeLabel },
            {
                id: 'source-turn',
                label: t('groundingProvenanceSummarySourceTurn'),
                value: workspaceSession.provenanceSourceHistoryId
                    ? getShortTurnId(workspaceSession.provenanceSourceHistoryId)
                    : t('groundingProvenanceNoActiveSessionTurn'),
            },
            { id: 'sources', label: t('groundingProvenanceSummarySources'), value: String(selectedSources.length) },
            {
                id: 'support-bundles',
                label: t('groundingProvenanceSummarySupportBundles'),
                value: String(selectedSupportBundles.length),
            },
        ],
        [
            getShortTurnId,
            provenanceModeLabel,
            selectedSources.length,
            selectedSupportBundles.length,
            t,
            workspaceSession.provenanceSourceHistoryId,
        ],
    );

    const provenanceSelectionMessage =
        activeGroundingSelection?.kind === 'bundle'
            ? formatMessage('groundingProvenanceSelectionBundle', String(activeGroundingSelection.index + 1))
            : activeGroundingSelection?.kind === 'source' && activeSource
              ? formatMessage('groundingProvenanceSelectionSource', formatSourceHost(activeSource.url))
              : t('groundingProvenanceSelectionNone');

    return {
        effectiveResultText,
        effectiveThoughts,
        effectiveStructuredData,
        effectiveStructuredOutputMode,
        formattedStructuredOutput,
        effectiveGrounding,
        effectiveMetadata,
        effectiveSessionHints,
        actualOutputDimensions,
        actualOutputSizeLabel,
        requestedImageSize,
        groundingResolutionStatusSummary,
        groundingResolutionStatusTone,
        sessionUpdatedLabel,
        sessionContinuitySignals,
        insightRows,
        selectedSources,
        selectedSupportBundles,
        activeSupportBundle,
        activeSource,
        activeSourceIndexSet,
        activeSourceTitleSet,
        activeBundleIndexSet,
        sourceCitationCountByIndex,
        relatedSourcesForSelectedBundle,
        otherSourcesForSelectedBundle,
        relatedBundlesForSelectedSource,
        displayedSources,
        displayedSupportBundles,
        activeGroundingAppendPreview,
        activeGroundingReplacePreview,
        activeGroundingHasExistingPrompt,
        activeGroundingCurrentPromptText,
        activeGroundingAppendCueText,
        groundingQueries,
        searchEntryPointRenderedContent,
        attributionOverviewRows,
        uncitedSources,
        citedSourceIndexSet,
        citedSourceTitleSet,
        sourceAttributionStatusMessage,
        entryPointStatusMessage,
        sessionHintEntries,
        formatSessionHintKey,
        formatSessionHintValue,
        formatSourceHost,
        activeGroundingReuseSnippet,
        activeGroundingReuseLabel,
        handleAppendGroundingSelectionToPrompt,
        handleReplacePromptWithGroundingSelection,
        thoughtStateMessage,
        groundingStateMessage,
        groundingSupportMessage,
        provenanceContinuityMessage,
        provenanceModeLabel,
        sessionSourceTurn,
        provenanceSourceTurn,
        provenanceSummaryRows,
        provenanceSelectionMessage,
        currentStageSourceHistoryId,
    };
}
