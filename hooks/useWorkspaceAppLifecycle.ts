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

type UseWorkspaceAppLifecycleArgs = {
    historyCount: number;
    generatedImageCount: number;
    orderedReferenceAssets: StageAsset[];
    hasDraftPrompt: boolean;
    aspectRatio: AspectRatio;
    setApiKeyReady: Dispatch<SetStateAction<boolean>>;
    setCurrentLang: Dispatch<SetStateAction<Language>>;
    setInitialPreferencesReady: Dispatch<SetStateAction<boolean>>;
    setAspectRatio: (value: SetStateAction<AspectRatio>, options?: { bypassLock?: boolean }) => void;
    addLog: (message: string) => void;
    showNotification: (message: string, type?: 'info' | 'error') => void;
    t: (key: string) => string;
    settingsLocked?: boolean;
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
}: UseWorkspaceAppLifecycleArgs) {
    const hasDataRef = useRef(false);
    const beforeUnloadMessageRef = useRef('');
    const leadingReferenceKeyRef = useRef<string | null>(null);
    const currentAspectRatioRef = useRef<AspectRatio>(aspectRatio);

    useEffect(() => {
        hasDataRef.current =
            historyCount > 0 || generatedImageCount > 0 || orderedReferenceAssets.length > 0 || hasDraftPrompt;
    }, [generatedImageCount, hasDraftPrompt, historyCount, orderedReferenceAssets.length]);

    useEffect(() => {
        beforeUnloadMessageRef.current = t('windowCloseWarningMsg');
    }, [t]);

    useEffect(() => {
        currentAspectRatioRef.current = aspectRatio;
    }, [aspectRatio]);

    useEffect(() => {
        let cancelled = false;

        const verifyApiKeyWithRetry = async () => {
            const initialReady = await checkApiKey();
            if (cancelled) {
                return;
            }

            if (initialReady) {
                setApiKeyReady(true);
            }
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
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [setApiKeyReady, setCurrentLang, setInitialPreferencesReady]);

    useEffect(() => {
        if (orderedReferenceAssets.length === 0) {
            leadingReferenceKeyRef.current = null;
            return undefined;
        }

        const leadingAsset = orderedReferenceAssets[0];
        const leadingKey = `${leadingAsset.id}:${leadingAsset.url}:${leadingAsset.aspectRatio ?? ''}`;
        if (leadingKey === leadingReferenceKeyRef.current) {
            return undefined;
        }

        leadingReferenceKeyRef.current = leadingKey;
        let cancelled = false;

        const applyAutoRatio = (nextRatio: AspectRatio) => {
            if (cancelled || settingsLocked) {
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
            return () => {
                cancelled = true;
            };
        }

        const img = new Image();
        img.onload = () => {
            if (cancelled) {
                return;
            }
            applyAutoRatio(findClosestAspectRatio(img.width, img.height, ASPECT_RATIOS));
        };
        img.src = leadingAsset.url;

        return () => {
            cancelled = true;
            img.onload = null;
            img.onerror = null;
        };
    }, [addLog, orderedReferenceAssets, setAspectRatio, showNotification, t, settingsLocked]);
}
