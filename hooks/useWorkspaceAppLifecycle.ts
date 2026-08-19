import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { checkApiKey } from '../services/geminiService';
import { ASPECT_RATIOS } from '../constants';
import { AspectRatio, StageAsset } from '../types';
import {
    ensureLanguageLoaded,
    isLanguageLoaded,
    Language,
    persistLanguagePreference,
    resolvePreferredLanguage,
} from '../utils/translations';
import { syncThemeFromStoredPreference } from '../utils/theme';
import { findClosestAspectRatio } from '../utils/canvasWorkspace';
import { calculateBrowserSavedImageDbSize } from '../utils/browserImageStore';

type UseWorkspaceAppLifecycleArgs = {
    historyCount: number;
    generatedImageCount: number;
    orderedReferenceAssets: StageAsset[];
    hasDraftPrompt: boolean;
    aspectRatio: AspectRatio;
    setApiKeyReady: Dispatch<SetStateAction<boolean>>;
    setCurrentLang: Dispatch<SetStateAction<Language>>;
    setInitialPreferencesReady: Dispatch<SetStateAction<boolean>>;
    setAspectRatio: Dispatch<SetStateAction<AspectRatio>>;
    addLog: (message: string) => void;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    t: (key: string) => string;
    settingsLocked?: boolean;
    autoExportTrigger?: 'off' | 'count' | 'size' | 'both';
    onStorageWarning?: (sizeMb: number) => void;
    supportsKeepAliveHeartbeat?: boolean;
    supportsStorageWarning?: boolean;
};

export function useWorkspaceAppLifecycle({
    historyCount,
    generatedImageCount,
    orderedReferenceAssets,
    hasDraftPrompt,
    aspectRatio,
    setApiKeyReady,
    setCurrentLang,
    setInitialPreferencesReady,
    setAspectRatio,
    addLog,
    showNotification,
    t,
    settingsLocked,
    autoExportTrigger,
    onStorageWarning,
    supportsKeepAliveHeartbeat = false,
    supportsStorageWarning = false,
}: UseWorkspaceAppLifecycleArgs) {
    const hasDataRef = useRef(false);
    const beforeUnloadMessageRef = useRef('');
    const leadingReferenceKeyRef = useRef<string | null>(null);
    const currentAspectRatioRef = useRef<AspectRatio>(aspectRatio);
    const storageWarningShownRef = useRef(false);

    useEffect(() => {
        hasDataRef.current =
            historyCount > 0 ||
            generatedImageCount > 0 ||
            orderedReferenceAssets.length > 0 ||
            hasDraftPrompt;
    }, [generatedImageCount, hasDraftPrompt, historyCount, orderedReferenceAssets.length]);

    useEffect(() => {
        beforeUnloadMessageRef.current = t('windowCloseWarningMsg');
    }, [t]);

    useEffect(() => {
        currentAspectRatioRef.current = aspectRatio;
    }, [aspectRatio]);

    useEffect(() => {
        let cancelled = false;
        let initialInterval: any = null;
        let heartbeatInterval: any = null;

        const verifyApiKeyWithRetry = async () => {
            const initialReady = await checkApiKey();
            if (cancelled) {
                return;
            }

            if (initialReady) {
                setApiKeyReady(true);
            }

            if (!supportsKeepAliveHeartbeat) {
                return;
            }

            // In the AI Studio environment, the injection of window.aistudio may be delayed, so perform polling retry
            let attempts = 0;
            const maxAttempts = 12;

            if (cancelled) {
                return;
            }

            initialInterval = setInterval(async () => {
                attempts++;
                if (cancelled) {
                    clearInterval(initialInterval);
                    return;
                }

                const ready = await checkApiKey();
                if (cancelled) {
                    clearInterval(initialInterval);
                    return;
                }

                if (ready) {
                    setApiKeyReady(true);
                    clearInterval(initialInterval);
                } else if (attempts >= maxAttempts) {
                    clearInterval(initialInterval);
                }
            }, 500);

            if (cancelled) {
                return;
            }

            // Start a periodic background Heartbeat check (every 10 seconds)
            let heartbeatCount = 0;
            heartbeatInterval = setInterval(async () => {
                if (cancelled) {
                    clearInterval(heartbeatInterval);
                    return;
                }
                const ready = await checkApiKey();
                if (cancelled) {
                    clearInterval(heartbeatInterval);
                    return;
                }
                setApiKeyReady((prev) => (prev !== ready ? ready : prev));

                // Perform active HTTP Keep-Alive ping every 30 seconds
                heartbeatCount++;
                if (heartbeatCount % 3 === 0) {
                    fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' }).catch(() => {
                        // ignore network errors if offline
                    });
                }
            }, 10000);
        };

        void verifyApiKeyWithRetry();
        syncThemeFromStoredPreference();

        const restoreLanguagePreference = async () => {
            const preferredLanguage = resolvePreferredLanguage();

            if (!cancelled) {
                persistLanguagePreference(preferredLanguage);
            }

            try {
                await ensureLanguageLoaded(preferredLanguage);
                if (cancelled) {
                    return;
                }

                setCurrentLang((currentLanguage) =>
                    currentLanguage === preferredLanguage && isLanguageLoaded(preferredLanguage)
                        ? currentLanguage
                        : preferredLanguage,
                );
            } catch (error) {
                console.error(`Failed to restore language preference ${preferredLanguage}.`, error);
                if (cancelled) {
                    return;
                }

                setCurrentLang('en');
                persistLanguagePreference('en');
            } finally {
                if (!cancelled) {
                    setInitialPreferencesReady(true);
                }
            }
        };

        void restoreLanguagePreference();

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasDataRef.current) {
                const warningMessage = beforeUnloadMessageRef.current;
                e.preventDefault();
                e.returnValue = warningMessage;
                return warningMessage;
            }

            return undefined;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            cancelled = true;
            if (initialInterval) clearInterval(initialInterval);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [setApiKeyReady, setCurrentLang, setInitialPreferencesReady, supportsKeepAliveHeartbeat]);

    useEffect(() => {
        if (orderedReferenceAssets.length === 0) {
            leadingReferenceKeyRef.current = null;
            return;
        }

        const leadingAsset = orderedReferenceAssets[0];
        const leadingKey = `${leadingAsset.id}:${leadingAsset.url}:${leadingAsset.aspectRatio ?? ''}`;
        if (leadingKey === leadingReferenceKeyRef.current) {
            return;
        }

        leadingReferenceKeyRef.current = leadingKey;

        const applyAutoRatio = (nextRatio: AspectRatio) => {
            if (settingsLocked) {
                return;
            }
            if (nextRatio === currentAspectRatioRef.current) {
                return;
            }

            const message = t('autoRatioSet').replace('{0}', nextRatio);
            setAspectRatio(nextRatio);
            addLog(message);
            showNotification(message, 'info');
        };

        if (leadingAsset.isSketch && leadingAsset.aspectRatio) {
            applyAutoRatio(leadingAsset.aspectRatio);
            return;
        }

        const img = new Image();
        img.src = leadingAsset.url;
        img.onload = () => {
            applyAutoRatio(findClosestAspectRatio(img.width, img.height, ASPECT_RATIOS));
        };
    }, [addLog, orderedReferenceAssets, setAspectRatio, showNotification, t, settingsLocked]);

    useEffect(() => {
        if (!supportsStorageWarning) {
            return;
        }

        let cancelled = false;
        const THRESHOLD_BYTES = 300 * 1024 * 1024; // 300MB

        const checkStorageAndWarn = async () => {
            try {
                const totalBytes = await calculateBrowserSavedImageDbSize();
                if (cancelled) {
                    return;
                }

                if (totalBytes >= THRESHOLD_BYTES) {
                    if (autoExportTrigger !== undefined && autoExportTrigger !== 'off') {
                        return;
                    }
                    if (!storageWarningShownRef.current) {
                        const sizeMb = Math.round(totalBytes / (1024 * 1024));
                        const message = t('workspaceStorageWarningNotice').replace('{0}', String(sizeMb));
                        if (onStorageWarning) {
                            onStorageWarning(sizeMb);
                        }
                        addLog(message);
                        storageWarningShownRef.current = true;
                    }
                } else {
                    storageWarningShownRef.current = false;
                }
            } catch {
                // Ignore storage measurement failures
            }
        };

        void checkStorageAndWarn();
        const intervalId = window.setInterval(checkStorageAndWarn, 30000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [addLog, autoExportTrigger, onStorageWarning, supportsStorageWarning, t]);
}
