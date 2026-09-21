import { useCallback } from 'react';
import type {
    AspectRatio,
    ExecutionMode,
    GeneratedImage as GeneratedImageType,
    ImageModel,
    ImageSidecarMetadata,
    ImageSize,
    ImageStyle,
    OutputFormat,
    ThinkingLevel,
} from '../types';
import type { WorkspaceProgressThoughtImageDownloadRequest } from '../components/WorkspaceProgressDetailPanel';
import { buildSavedImageLoadUrl } from '../utils/imageSaveUtils';
import {
    buildImageSidecarMetadata,
    normalizeImageSidecarMetadata,
} from '../utils/imageSidecarMetadata';
import { buildResultPartFilenameStem, buildSavedImageFilenameStem } from '../utils/savedImageFilename';
import { downloadImageSource, downloadJsonDocument, stripFilenameExtension } from '../utils/browserDownload';

export interface StageViewerDownloadSettings {
    model: ImageModel;
    imageStyle: ImageStyle;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
}

export interface UseStageImageDownloadActionsOptions {
    history: GeneratedImageType[];
    currentViewedCompletedHistoryItem: GeneratedImageType | null;
    selectedMetadata: unknown;
    viewPrompt: string;
    stageViewerSettings: StageViewerDownloadSettings;
    outputFormat: OutputFormat;
    temperature: number;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    generationMode: string;
    executionMode: ExecutionMode;
    selectedImageIndex: number;
    getHistoryTurnById: (entryId?: string | null) => GeneratedImageType | null;
    showNotification: (message: string, type: 'info' | 'error') => void;
    t: (key: string) => string;
}

export function useStageImageDownloadActions(options: UseStageImageDownloadActionsOptions) {
    const {
        history,
        currentViewedCompletedHistoryItem,
        selectedMetadata,
        viewPrompt,
        stageViewerSettings,
        outputFormat,
        temperature,
        thinkingLevel,
        includeThoughts,
        googleSearch,
        imageSearch,
        generationMode,
        executionMode,
        selectedImageIndex,
        getHistoryTurnById,
        showNotification,
        t,
    } = options;

    const handleDownloadStageImage = useCallback(
        async (imageUrl: string) => {
            try {
                const matchedHistoryItem =
                    history.find(
                        (item) =>
                            item.status === 'success' &&
                            (item.savedFilename ? buildSavedImageLoadUrl(item.savedFilename) : item.url) === imageUrl,
                    ) || null;
                const preferredMetadata =
                    matchedHistoryItem?.id === currentViewedCompletedHistoryItem?.id
                        ? normalizeImageSidecarMetadata(selectedMetadata)
                        : null;
                const persistedHistoryMetadata = normalizeImageSidecarMetadata(matchedHistoryItem?.metadata);
                const fallbackMetadata = buildImageSidecarMetadata({
                    prompt: matchedHistoryItem?.prompt || viewPrompt,
                    model: matchedHistoryItem?.model || stageViewerSettings.model,
                    style: matchedHistoryItem?.style || stageViewerSettings.imageStyle,
                    aspectRatio: matchedHistoryItem?.aspectRatio || stageViewerSettings.aspectRatio,
                    requestedImageSize: matchedHistoryItem?.size || stageViewerSettings.imageSize,
                    outputFormat,
                    temperature,
                    thinkingLevel,
                    includeThoughts,
                    googleSearch,
                    imageSearch,
                    generationMode: matchedHistoryItem?.mode || generationMode,
                    executionMode: matchedHistoryItem?.executionMode || executionMode,
                    batchSize: stageViewerSettings.batchSize,
                });
                const baseMetadata = preferredMetadata || persistedHistoryMetadata || fallbackMetadata;
                const imageFilename = await downloadImageSource(imageUrl, {
                    filename: matchedHistoryItem?.savedFilename,
                    filenameStem: buildSavedImageFilenameStem({
                        model: matchedHistoryItem?.model || stageViewerSettings.model,
                        mode: matchedHistoryItem?.mode || generationMode,
                        slotIndex: selectedImageIndex,
                        createdAt: matchedHistoryItem ? new Date(matchedHistoryItem.createdAt) : new Date(),
                        requestId: matchedHistoryItem?.id || crypto.randomUUID(),
                    }),
                });
                const metadataFilename = `${stripFilenameExtension(imageFilename)}.json`;
                downloadJsonDocument(
                    {
                        ...baseMetadata,
                        filename: baseMetadata.filename || imageFilename,
                        timestamp:
                            typeof baseMetadata.timestamp === 'string' && baseMetadata.timestamp.trim()
                                ? baseMetadata.timestamp
                                : new Date(matchedHistoryItem?.createdAt || Date.now()).toISOString(),
                    },
                    metadataFilename,
                );
                showNotification(t('stageDownloadCompleteNotice'), 'info');
            } catch (error) {
                console.error('Failed to download stage image', error);
                showNotification(t('stageDownloadFailedNotice'), 'error');
            }
        },
        [
            currentViewedCompletedHistoryItem?.id,
            executionMode,
            generationMode,
            googleSearch,
            history,
            imageSearch,
            includeThoughts,
            outputFormat,
            selectedImageIndex,
            selectedMetadata,
            showNotification,
            stageViewerSettings.aspectRatio,
            stageViewerSettings.batchSize,
            stageViewerSettings.imageSize,
            stageViewerSettings.imageStyle,
            stageViewerSettings.model,
            t,
            temperature,
            thinkingLevel,
            viewPrompt,
        ],
    );

    const handleDownloadThoughtImage = useCallback(
        async ({
            imageUrl,
            mimeType,
            savedFilename,
            entryId,
            slotIndex,
            sequence,
        }: WorkspaceProgressThoughtImageDownloadRequest) => {
            try {
                const historyItem = getHistoryTurnById(entryId);
                await downloadImageSource(imageUrl, {
                    filename: savedFilename,
                    filenameStem: buildResultPartFilenameStem({
                        model: historyItem?.model || stageViewerSettings.model,
                        mode: historyItem?.mode || generationMode,
                        slotIndex: typeof slotIndex === 'number' ? slotIndex : selectedImageIndex,
                        createdAt: historyItem ? new Date(historyItem.createdAt) : new Date(),
                        requestId: historyItem?.id || entryId || crypto.randomUUID(),
                        sequence,
                        sourceSavedFilename: historyItem?.savedFilename,
                    }),
                    mimeType,
                });
                showNotification(t('thoughtImageDownloadCompleteNotice'), 'info');
            } catch (error) {
                console.error('Failed to download thought image', error);
                showNotification(t('thoughtImageDownloadFailedNotice'), 'error');
            }
        },
        [generationMode, getHistoryTurnById, selectedImageIndex, showNotification, stageViewerSettings.model, t],
    );

    return {
        handleDownloadStageImage,
        handleDownloadThoughtImage,
    };
}
