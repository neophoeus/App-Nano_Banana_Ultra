import { useCallback, useMemo } from 'react';
import { getOutputFormatLabelKey, getThinkingLevelLabelKey } from '../constants';
import {
    GeneratedImage as GeneratedImageType,
    GroundingMode,
    ImageModel,
    ImageStyle,
    OutputFormat,
    ThinkingLevel,
    ViewerComposerSettingsSnapshot,
} from '../types';
import { deriveGroundingMode, getGroundingModeTranslationKey } from '../utils/groundingMode';
import {
    getImageSidecarMetadataState,
    isPersistedImageSidecarMetadata,
    normalizeImageSidecarMetadata,
} from '../utils/imageSidecarMetadata';
import { MODEL_CAPABILITIES } from '../utils/modelCapabilities';
import { formatTemperature } from '../utils/temperature';
import { buildViewerComposerSettingsSnapshot } from '../utils/viewerComposerSettings';
import { useGroundingProvenancePanelProps } from './useGroundingProvenancePanelProps';
import { useGroundingProvenanceView } from './useGroundingProvenanceView';

type UseGroundingProvenanceViewArgs = Parameters<typeof useGroundingProvenanceView>[0];
type GroundingProvenancePanelArgs = Parameters<typeof useGroundingProvenancePanelProps>[0];

type ViewerMetadataItem = {
    key: string;
    label: string;
    value: string;
};

type UseWorkspaceViewerProvenanceStateArgs = UseGroundingProvenanceViewArgs & {
    currentLanguage: GroundingProvenancePanelArgs['currentLanguage'];
    renderHistoryTurnActionRow: GroundingProvenancePanelArgs['renderHistoryTurnActionRow'];
    setActiveGroundingSelection: GroundingProvenancePanelArgs['setActiveGroundingSelection'];
    setFocusLinkedGroundingItems: GroundingProvenancePanelArgs['setFocusLinkedGroundingItems'];
    currentViewedCompletedHistoryItem: GeneratedImageType | null;
    currentViewedCompletedHistoryMetadata: Record<string, unknown> | null;
    getStyleLabel: (style: ImageStyle) => string;
    getModelLabel: (model: ImageModel) => string;
};

type UseWorkspaceViewerProvenanceStateResult = ReturnType<typeof useGroundingProvenanceView> & {
    groundingProvenancePanelProps: ReturnType<typeof useGroundingProvenancePanelProps>;
    viewerMetadataItems: ViewerMetadataItem[];
    viewerMetadataStateMessage: string | null;
    viewerSettingsSnapshot: ViewerComposerSettingsSnapshot | null;
};

const isKnownImageModel = (value: unknown): value is ImageModel =>
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(MODEL_CAPABILITIES, value);

export function useWorkspaceViewerProvenanceState({
    selectedResultText,
    selectedThoughts,
    selectedResultParts,
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
    currentLanguage,
    renderHistoryTurnActionRow,
    setActiveGroundingSelection,
    setFocusLinkedGroundingItems,
    currentViewedCompletedHistoryItem,
    currentViewedCompletedHistoryMetadata,
    getStyleLabel,
    getModelLabel,
}: UseWorkspaceViewerProvenanceStateArgs): UseWorkspaceViewerProvenanceStateResult {
    const groundingView = useGroundingProvenanceView({
        selectedResultText,
        selectedThoughts,
        selectedResultParts,
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
    });
    const groundingProvenancePanelProps = useGroundingProvenancePanelProps({
        currentLanguage,
        provenanceSummaryRows: groundingView.provenanceSummaryRows,
        attributionOverviewRows: groundingView.attributionOverviewRows,
        provenanceSourceTurn: groundingView.provenanceSourceTurn,
        currentStageSourceHistoryId,
        getShortTurnId,
        renderHistoryTurnActionRow,
        provenanceContinuityMessage: groundingView.provenanceContinuityMessage,
        provenanceSelectionMessage: groundingView.provenanceSelectionMessage,
        activeGroundingSelection,
        setActiveGroundingSelection,
        focusLinkedGroundingItems,
        setFocusLinkedGroundingItems,
        totalSourceCount: groundingView.selectedSources.length,
        totalSupportBundleCount: groundingView.selectedSupportBundles.length,
        displayedSources: groundingView.displayedSources,
        displayedSupportBundles: groundingView.displayedSupportBundles,
        uncitedSources: groundingView.uncitedSources,
        citedSourceIndexSet: groundingView.citedSourceIndexSet,
        citedSourceTitleSet: groundingView.citedSourceTitleSet,
        sourceAttributionStatusMessage: groundingView.sourceAttributionStatusMessage,
        entryPointStatusMessage: groundingView.entryPointStatusMessage,
        activeSource: groundingView.activeSource,
        activeSupportBundle: groundingView.activeSupportBundle,
        activeSourceIndexSet: groundingView.activeSourceIndexSet,
        activeSourceTitleSet: groundingView.activeSourceTitleSet,
        activeBundleIndexSet: groundingView.activeBundleIndexSet,
        sourceCitationCountByIndex: groundingView.sourceCitationCountByIndex,
        relatedSourcesForSelectedBundle: groundingView.relatedSourcesForSelectedBundle,
        otherSourcesForSelectedBundle: groundingView.otherSourcesForSelectedBundle,
        relatedBundlesForSelectedSource: groundingView.relatedBundlesForSelectedSource,
        activeGroundingReuseSnippet: groundingView.activeGroundingReuseSnippet,
        activeGroundingReuseLabel: groundingView.activeGroundingReuseLabel,
        activeGroundingAppendPreview: groundingView.activeGroundingAppendPreview,
        activeGroundingReplacePreview: groundingView.activeGroundingReplacePreview,
        activeGroundingHasExistingPrompt: groundingView.activeGroundingHasExistingPrompt,
        activeGroundingCurrentPromptText: groundingView.activeGroundingCurrentPromptText,
        activeGroundingAppendCueText: groundingView.activeGroundingAppendCueText,
        formatSourceHost: groundingView.formatSourceHost,
        handleAppendGroundingSelectionToPrompt: groundingView.handleAppendGroundingSelectionToPrompt,
        handleReplacePromptWithGroundingSelection: groundingView.handleReplacePromptWithGroundingSelection,
        groundingStateMessage: groundingView.groundingStateMessage,
        groundingSupportMessage: groundingView.groundingSupportMessage,
        groundingQueries: groundingView.groundingQueries,
        searchEntryPointRenderedContent: groundingView.searchEntryPointRenderedContent,
    });

    const getOutputFormatSummaryLabel = useCallback(
        (value: string) => t(getOutputFormatLabelKey(value as OutputFormat)),
        [t],
    );
    const getThinkingLevelSummaryLabel = useCallback(
        (value: string) => t(getThinkingLevelLabelKey(value as ThinkingLevel)),
        [t],
    );
    const getThoughtVisibilitySummaryLabel = useCallback(
        (value: boolean) => t(value ? 'composerVisibilityVisible' : 'composerVisibilityHidden'),
        [t],
    );
    const getMetadataGroundingModeLabel = useCallback((metadata: Record<string, unknown> | null | undefined) => {
        if (typeof metadata?.groundingMode === 'string') {
            switch (metadata.groundingMode) {
                case 'off':
                case 'google-search':
                case 'image-search':
                case 'google-search-plus-image-search':
                    return t(getGroundingModeTranslationKey(metadata.groundingMode as GroundingMode));
                default:
                    return metadata.groundingMode;
            }
        }

        if (typeof metadata?.googleSearch === 'boolean' || typeof metadata?.imageSearch === 'boolean') {
            return t(
                getGroundingModeTranslationKey(
                    deriveGroundingMode(Boolean(metadata?.googleSearch), Boolean(metadata?.imageSearch)),
                ),
            );
        }

        return null;
    }, []);

    const viewerMetadataSidecarState = getImageSidecarMetadataState(selectedMetadata);
    const viewerHasPersistedSidecarMetadata = isPersistedImageSidecarMetadata(selectedMetadata);
    const viewerSettingsMetadata = useMemo(() => {
        if (!currentViewedCompletedHistoryMetadata && !viewerHasPersistedSidecarMetadata) {
            return null;
        }

        return normalizeImageSidecarMetadata({
            ...(currentViewedCompletedHistoryMetadata || {}),
            ...(viewerHasPersistedSidecarMetadata ? (selectedMetadata as Record<string, unknown>) : {}),
        });
    }, [currentViewedCompletedHistoryMetadata, selectedMetadata, viewerHasPersistedSidecarMetadata]);
    const viewerSettingsSnapshot = useMemo(
        () => buildViewerComposerSettingsSnapshot(currentViewedCompletedHistoryItem, viewerSettingsMetadata),
        [currentViewedCompletedHistoryItem, viewerSettingsMetadata],
    );
    const viewerMetadataStatus = useMemo(() => {
        if (!currentViewedCompletedHistoryItem) {
            return 'ready' as const;
        }

        if (viewerMetadataSidecarState) {
            return viewerMetadataSidecarState;
        }

        if (viewerHasPersistedSidecarMetadata) {
            return 'ready' as const;
        }

        return currentViewedCompletedHistoryItem.savedFilename ? ('loading' as const) : ('missing' as const);
    }, [currentViewedCompletedHistoryItem, viewerHasPersistedSidecarMetadata, viewerMetadataSidecarState]);
    const viewerMetadataLoadingLabel = t('workspaceViewerMetadataLoading');
    const viewerMetadataUnavailableLabel = t('workspaceViewerMetadataUnavailable');
    const viewerMetadataStateMessage =
        viewerMetadataStatus === 'loading'
            ? viewerMetadataLoadingLabel
            : viewerMetadataStatus === 'missing'
              ? viewerMetadataUnavailableLabel
              : null;
    const resolveViewerMetadataValue = useCallback(
        (sidecarValue: string | null, fallbackValue: string) => {
            if (viewerMetadataStatus === 'loading') {
                return viewerMetadataLoadingLabel;
            }

            if (viewerMetadataStatus === 'missing') {
                return viewerMetadataUnavailableLabel;
            }

            if (viewerHasPersistedSidecarMetadata) {
                return sidecarValue || viewerMetadataUnavailableLabel;
            }

            return sidecarValue || fallbackValue;
        },
        [
            viewerHasPersistedSidecarMetadata,
            viewerMetadataLoadingLabel,
            viewerMetadataStatus,
            viewerMetadataUnavailableLabel,
        ],
    );

    const viewerMetadataAspectRatio = resolveViewerMetadataValue(
        typeof selectedMetadata?.aspectRatio === 'string' ? selectedMetadata.aspectRatio : null,
        viewSettings.aspectRatio,
    );
    const viewerMetadataModel = isKnownImageModel(viewerSettingsMetadata?.model)
        ? viewerSettingsMetadata.model
        : currentViewedCompletedHistoryItem?.model || viewSettings.model;
    const viewerMetadataModelSupportsSizeControl = MODEL_CAPABILITIES[viewerMetadataModel].supportedSizes.length > 0;
    const viewerMetadataSize = resolveViewerMetadataValue(
        typeof viewerSettingsMetadata?.size === 'string'
            ? viewerSettingsMetadata.size
            : viewerMetadataModelSupportsSizeControl && typeof viewerSettingsMetadata?.requestedImageSize === 'string'
              ? viewerSettingsMetadata.requestedImageSize
              : null,
        viewerMetadataModelSupportsSizeControl ? viewSettings.size : viewerMetadataUnavailableLabel,
    );
    const viewerMetadataStyleLabel = resolveViewerMetadataValue(
        typeof selectedMetadata?.style === 'string' ? getStyleLabel(selectedMetadata.style as ImageStyle) : null,
        getStyleLabel(viewSettings.style),
    );
    const viewerMetadataModelLabel = resolveViewerMetadataValue(
        isKnownImageModel(selectedMetadata?.model)
            ? getModelLabel(selectedMetadata.model)
            : typeof selectedMetadata?.model === 'string'
              ? selectedMetadata.model
              : null,
        getModelLabel(viewSettings.model),
    );
    const viewerMetadataTemperature = resolveViewerMetadataValue(
        typeof selectedMetadata?.temperature === 'number' ? formatTemperature(selectedMetadata.temperature) : null,
        formatTemperature(viewSettings.temperature),
    );
    const viewerMetadataOutputFormat = resolveViewerMetadataValue(
        typeof selectedMetadata?.outputFormat === 'string'
            ? getOutputFormatSummaryLabel(selectedMetadata.outputFormat)
            : null,
        getOutputFormatSummaryLabel(viewSettings.outputFormat),
    );
    const viewerMetadataThinkingLevel = resolveViewerMetadataValue(
        typeof selectedMetadata?.thinkingLevel === 'string'
            ? getThinkingLevelSummaryLabel(selectedMetadata.thinkingLevel)
            : null,
        getThinkingLevelSummaryLabel(viewSettings.thinkingLevel),
    );
    const viewerMetadataGrounding = resolveViewerMetadataValue(
        getMetadataGroundingModeLabel(selectedMetadata),
        t(getGroundingModeTranslationKey(deriveGroundingMode(viewSettings.googleSearch, viewSettings.imageSearch))),
    );
    const viewerMetadataReturnThoughts = resolveViewerMetadataValue(
        typeof selectedMetadata?.includeThoughts === 'boolean'
            ? getThoughtVisibilitySummaryLabel(selectedMetadata.includeThoughts)
            : null,
        getThoughtVisibilitySummaryLabel(viewSettings.includeThoughts),
    );
    const viewerMetadataItems = useMemo(
        () => [
            { key: 'ratio', label: t('workspaceViewerRatio'), value: viewerMetadataAspectRatio },
            { key: 'size', label: t('workspaceViewerSize'), value: viewerMetadataSize },
            { key: 'style', label: t('workspaceViewerStyle'), value: viewerMetadataStyleLabel },
            { key: 'model', label: t('workspaceViewerModel'), value: viewerMetadataModelLabel },
            {
                key: 'temperature',
                label: t('groundingProvenanceInsightTemperature'),
                value: viewerMetadataTemperature,
            },
            {
                key: 'output-format',
                label: t('groundingProvenanceInsightOutputFormat'),
                value: viewerMetadataOutputFormat,
            },
            {
                key: 'thinking-level',
                label: t('groundingProvenanceInsightThinkingLevel'),
                value: viewerMetadataThinkingLevel,
            },
            {
                key: 'grounding',
                label: t('groundingProvenanceInsightGrounding'),
                value: viewerMetadataGrounding,
            },
            {
                key: 'return-thoughts',
                label: t('groundingProvenanceInsightReturnThoughts'),
                value: viewerMetadataReturnThoughts,
            },
        ],
        [
            t,
            viewerMetadataAspectRatio,
            viewerMetadataGrounding,
            viewerMetadataModelLabel,
            viewerMetadataOutputFormat,
            viewerMetadataReturnThoughts,
            viewerMetadataSize,
            viewerMetadataStyleLabel,
            viewerMetadataTemperature,
            viewerMetadataThinkingLevel,
        ],
    );

    return {
        ...groundingView,
        groundingProvenancePanelProps,
        viewerMetadataItems,
        viewerMetadataStateMessage,
        viewerSettingsSnapshot,
    };
}
