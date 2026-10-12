import { Dispatch, SetStateAction, useEffect } from 'react';
import { ModelCapability } from '../constants';
import { AspectRatio, ImageSize, OutputFormat, ThinkingLevel } from '../types';

type UseWorkspaceCapabilityConstraintsArgs = {
    capability: ModelCapability;
    imageSize: ImageSize;
    aspectRatio: AspectRatio;
    lockedAspectRatio?: AspectRatio | null;
    outputFormat: OutputFormat;
    thinkingLevel: ThinkingLevel;
    includeThoughts: boolean;
    googleSearch: boolean;
    imageSearch: boolean;
    setImageSize: Dispatch<SetStateAction<ImageSize>>;
    setAspectRatio: Dispatch<SetStateAction<AspectRatio>>;
    setOutputFormat: Dispatch<SetStateAction<OutputFormat>>;
    setThinkingLevel: Dispatch<SetStateAction<ThinkingLevel>>;
    setIncludeThoughts: Dispatch<SetStateAction<boolean>>;
    setGoogleSearch: Dispatch<SetStateAction<boolean>>;
    setImageSearch: Dispatch<SetStateAction<boolean>>;
    setObjectImages: Dispatch<SetStateAction<string[]>>;
    setCharacterImages: Dispatch<SetStateAction<string[]>>;
    setStyleImages?: Dispatch<SetStateAction<string[]>>;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    t: (key: string) => string;
};

export function useWorkspaceCapabilityConstraints({
    capability,
    imageSize,
    aspectRatio,
    lockedAspectRatio = null,
    outputFormat,
    thinkingLevel,
    includeThoughts,
    googleSearch,
    imageSearch,
    setImageSize,
    setAspectRatio,
    setOutputFormat,
    setThinkingLevel,
    setIncludeThoughts,
    setGoogleSearch,
    setImageSearch,
    setObjectImages,
    setCharacterImages,
    setStyleImages,
    showNotification,
    t,
}: UseWorkspaceCapabilityConstraintsArgs) {
    useEffect(() => {
        if (capability.supportedSizes.length > 0 && !capability.supportedSizes.includes(imageSize)) {
            setImageSize(capability.supportedSizes.includes('1K') ? '1K' : capability.supportedSizes[0]);
        }

        if (
            capability.supportedRatios.length > 0 &&
            !capability.supportedRatios.includes(aspectRatio) &&
            (!lockedAspectRatio || aspectRatio !== lockedAspectRatio)
        ) {
            setAspectRatio(capability.supportedRatios.includes('1:1') ? '1:1' : capability.supportedRatios[0]);
        }

        if (!capability.outputFormats.includes(outputFormat)) {
            setOutputFormat(capability.outputFormats[0]);
        }

        if (!capability.thinkingLevels.includes(thinkingLevel)) {
            setThinkingLevel(capability.thinkingLevels.includes('minimal') ? 'minimal' : 'disabled');
        }

        if (capability.supportsIncludeThoughts && !includeThoughts) {
            setIncludeThoughts(true);
        }

        if (!capability.supportsIncludeThoughts && includeThoughts) {
            setIncludeThoughts(false);
        }

        if (!capability.supportsGoogleSearch && googleSearch) {
            setGoogleSearch(false);
        }

        if (!capability.supportsImageSearch && imageSearch) {
            setImageSearch(false);
        }

        setObjectImages((prevImages) => {
            if (prevImages.length > capability.maxObjects) {
                showNotification(
                    t('workspaceConstraintTrimObjects').replace('{0}', String(capability.maxObjects)),
                    'info',
                );
                return prevImages.slice(0, capability.maxObjects);
            }

            return prevImages;
        });

        setCharacterImages((prevImages) => {
            if (prevImages.length > capability.maxCharacters) {
                showNotification(
                    t('workspaceConstraintTrimCharacters').replace('{0}', String(capability.maxCharacters)),
                    'info',
                );
                return prevImages.slice(0, capability.maxCharacters);
            }

            return prevImages;
        });

        if (setStyleImages) {
            setStyleImages((prevImages) => {
                if (prevImages.length > capability.maxStyles) {
                    showNotification(
                        t('workspaceConstraintTrimStyles').replace('{0}', String(capability.maxStyles)),
                        'info',
                    );
                    return prevImages.slice(0, capability.maxStyles);
                }

                return prevImages;
            });
        }
    }, [
        aspectRatio,
        capability,
        googleSearch,
        imageSearch,
        imageSize,
        includeThoughts,
        lockedAspectRatio,
        outputFormat,
        setAspectRatio,
        setCharacterImages,
        setGoogleSearch,
        setImageSearch,
        setImageSize,
        setIncludeThoughts,
        setObjectImages,
        setOutputFormat,
        setStyleImages,
        setThinkingLevel,
        showNotification,
        t,
        thinkingLevel,
    ]);
}
