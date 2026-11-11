import React, { useCallback } from 'react';
import { ViewerComposerSettingsSnapshot } from '../types';

type UseViewerPromptAndMetadataApplyActionsArgs = {
    composerPromptTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
    setPrompt: React.Dispatch<React.SetStateAction<string>>;
    applyViewerComposerSettingsSnapshot: (snapshot: ViewerComposerSettingsSnapshot) => boolean;
    setShowMetadataViewerDrawer: React.Dispatch<React.SetStateAction<boolean>>;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    t: (key: string) => string;
};

export interface UseViewerPromptAndMetadataApplyActionsReturn {
    focusComposerPromptTextarea: (options?: { delayFrames?: number; ensureVisible?: boolean }) => void;
    handleApplyPromptFromViewer: (value: string) => void;
    handleApplySettingsFromViewer: (snapshot: ViewerComposerSettingsSnapshot) => void;
    handleApplyBothFromMetadataViewer: (promptText: string, snapshot: ViewerComposerSettingsSnapshot) => void;
}

export function useViewerPromptAndMetadataApplyActions({
    composerPromptTextareaRef,
    setPrompt,
    applyViewerComposerSettingsSnapshot,
    setShowMetadataViewerDrawer,
    showNotification,
    t,
}: UseViewerPromptAndMetadataApplyActionsArgs): UseViewerPromptAndMetadataApplyActionsReturn {
    const focusComposerPromptTextarea = useCallback(
        ({ delayFrames = 1, ensureVisible = false }: { delayFrames?: number; ensureVisible?: boolean } = {}) => {
            if (typeof window === 'undefined') {
                return;
            }

            const normalizedDelayFrames = Math.max(1, delayFrames);
            const focusTextarea = () => {
                const textarea = composerPromptTextareaRef.current;
                if (!textarea) {
                    return;
                }

                if (ensureVisible) {
                    try {
                        textarea.scrollIntoView({ block: 'center', inline: 'nearest' });
                    } catch {
                        textarea.scrollIntoView();
                    }
                }

                try {
                    textarea.focus({ preventScroll: false });
                } catch {
                    textarea.focus();
                }

                const cursorIndex = textarea.value.length;
                textarea.setSelectionRange(cursorIndex, cursorIndex);
            };

            const queueFocus = (remainingFrames: number) => {
                window.requestAnimationFrame(() => {
                    if (remainingFrames > 1) {
                        queueFocus(remainingFrames - 1);
                        return;
                    }

                    focusTextarea();
                });
            };

            queueFocus(normalizedDelayFrames);
        },
        [composerPromptTextareaRef],
    );

    const replaceComposerPromptText = useCallback(
        (value: string, noticeKey: string, focusOptions?: { delayFrames?: number; ensureVisible?: boolean }) => {
            const normalizedValue = value.trim();
            if (!normalizedValue) {
                return;
            }

            setPrompt(normalizedValue);
            showNotification(t(noticeKey), 'info');
            focusComposerPromptTextarea(focusOptions);
        },
        [focusComposerPromptTextarea, setPrompt, showNotification, t],
    );

    const handleApplyPromptFromViewer = useCallback(
        (value: string) => {
            replaceComposerPromptText(value, 'workspaceViewerPromptAppliedNotice', {
                delayFrames: 2,
                ensureVisible: true,
            });
        },
        [replaceComposerPromptText],
    );

    const handleApplySettingsFromViewer = useCallback(
        (snapshot: ViewerComposerSettingsSnapshot) => {
            const applied = applyViewerComposerSettingsSnapshot(snapshot);
            if (!applied) {
                showNotification(t('settingsLockedNotice'), 'info');
                return;
            }
            showNotification(t('workspaceViewerSettingsAppliedNotice'), 'info');
            focusComposerPromptTextarea({
                delayFrames: 2,
                ensureVisible: true,
            });
        },
        [applyViewerComposerSettingsSnapshot, focusComposerPromptTextarea, showNotification, t],
    );

    const handleApplyBothFromMetadataViewer = useCallback(
        (promptText: string, snapshot: ViewerComposerSettingsSnapshot) => {
            const applied = applyViewerComposerSettingsSnapshot(snapshot);
            if (!applied) {
                showNotification(t('settingsLockedNotice'), 'info');
                handleApplyPromptFromViewer(promptText);
                setShowMetadataViewerDrawer(false);
                return;
            }
            setPrompt(promptText.trim());
            focusComposerPromptTextarea({
                delayFrames: 2,
                ensureVisible: true,
            });
            showNotification(t('metadataViewerApplyBothSuccessNotice'), 'info');
            setShowMetadataViewerDrawer(false);
        },
        [
            applyViewerComposerSettingsSnapshot,
            focusComposerPromptTextarea,
            handleApplyPromptFromViewer,
            setPrompt,
            setShowMetadataViewerDrawer,
            showNotification,
            t,
        ],
    );

    return {
        focusComposerPromptTextarea,
        handleApplyPromptFromViewer,
        handleApplySettingsFromViewer,
        handleApplyBothFromMetadataViewer,
    };
}
