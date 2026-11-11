import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MODEL_CAPABILITIES } from '../constants';
import { checkApiKey, uploadReferenceVideo } from '../services/geminiService';
import { ImageModel, VideoReferenceItem } from '../types';

type UseVideoReferenceManagerArgs = {
    imageModel: ImageModel;
    apiKeyReady: boolean;
    setApiKeyReady: React.Dispatch<React.SetStateAction<boolean>>;
    handleApiKeyConnect: () => Promise<boolean>;
    t: (key: string) => string;
};

export interface UseVideoReferenceManagerReturn {
    videoReference: VideoReferenceItem | null;
    setVideoReference: React.Dispatch<React.SetStateAction<VideoReferenceItem | null>>;
    isUploadingVideo: boolean;
    cancelActiveVideoUpload: () => void;
    handleVideoReferenceChange: (next: VideoReferenceItem | null) => void;
    handleUploadVideoFile: (file: File, signal?: AbortSignal) => Promise<VideoReferenceItem>;
}

export function useVideoReferenceManager({
    imageModel,
    apiKeyReady,
    setApiKeyReady,
    handleApiKeyConnect,
    t,
}: UseVideoReferenceManagerArgs): UseVideoReferenceManagerReturn {
    const [videoReference, setVideoReference] = useState<VideoReferenceItem | null>(null);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const videoUploadAbortRef = useRef<AbortController | null>(null);
    const videoUploadRequestIdRef = useRef(0);
    const imageModelRef = useRef(imageModel);
    imageModelRef.current = imageModel;

    const cancelActiveVideoUpload = useCallback(() => {
        videoUploadRequestIdRef.current += 1;
        videoUploadAbortRef.current?.abort();
        videoUploadAbortRef.current = null;
        setIsUploadingVideo(false);
    }, []);

    const handleVideoReferenceChange = useCallback(
        (next: VideoReferenceItem | null) => {
            cancelActiveVideoUpload();
            setVideoReference(next);
        },
        [cancelActiveVideoUpload],
    );

    useEffect(() => {
        return () => {
            videoUploadAbortRef.current?.abort();
        };
    }, []);

    const handleUploadVideoFile = useCallback(
        async (file: File, signal?: AbortSignal): Promise<VideoReferenceItem> => {
            if (!apiKeyReady) {
                const connected = await handleApiKeyConnect();
                if (!connected) {
                    throw new Error(t('apiKeyRequired'));
                }
                const ready = await checkApiKey();
                if (!ready) {
                    throw new Error(t('apiKeyRequired'));
                }
                setApiKeyReady(true);
            }

            cancelActiveVideoUpload();
            const requestId = videoUploadRequestIdRef.current;
            const controller = new AbortController();
            videoUploadAbortRef.current = controller;

            const handleAbort = () => {
                controller.abort();
            };
            if (signal) {
                if (signal.aborted) {
                    controller.abort();
                } else {
                    signal.addEventListener('abort', handleAbort, { once: true });
                }
            }

            setIsUploadingVideo(true);
            try {
                const uploaded = await uploadReferenceVideo(file, { signal: controller.signal });
                if (
                    requestId !== videoUploadRequestIdRef.current ||
                    controller.signal.aborted ||
                    !MODEL_CAPABILITIES[imageModelRef.current]?.supportsVideo
                ) {
                    throw new Error('ABORTED');
                }

                const nextVideoReference: VideoReferenceItem = {
                    sourceType: 'upload',
                    uri: uploaded.fileUri,
                    mimeType: uploaded.mimeType,
                    displayName: uploaded.displayName,
                    fileSizeBytes: uploaded.sizeBytes ?? file.size,
                    geminiFileName: uploaded.name,
                    expiresAt: uploaded.expiresAt,
                    createdAt: Date.now(),
                };
                setVideoReference(nextVideoReference);
                return nextVideoReference;
            } finally {
                if (signal) {
                    signal.removeEventListener('abort', handleAbort);
                }
                if (videoUploadRequestIdRef.current === requestId) {
                    setIsUploadingVideo(false);
                    videoUploadAbortRef.current = null;
                }
            }
        },
        [apiKeyReady, cancelActiveVideoUpload, handleApiKeyConnect, setApiKeyReady, t],
    );

    return {
        videoReference,
        setVideoReference,
        isUploadingVideo,
        cancelActiveVideoUpload,
        handleVideoReferenceChange,
        handleUploadVideoFile,
    };
}
