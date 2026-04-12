import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { checkApiKey } from '../services/geminiService';
import { ASPECT_RATIOS } from '../constants';
import { AspectRatio, WorkspaceComposerState } from '../types';
import {
    ensureLanguageLoaded,
    isLanguageLoaded,
    Language,
    persistLanguagePreference,
    resolvePreferredLanguage,
} from '../utils/translations';
import { syncThemeFromStoredPreference } from '../utils/theme';

type UseWorkspaceAppLifecycleArgs = {
    historyCount: number;
    generatedImageCount: number;
    objectImages: string[];
    characterImages: string[];
    setApiKeyReady: Dispatch<SetStateAction<boolean>>;
    setCurrentLang: Dispatch<SetStateAction<Language>>;
    setInitialPreferencesReady: Dispatch<SetStateAction<boolean>>;
    setAspectRatio: Dispatch<SetStateAction<AspectRatio>>;
    addLog: (message: string) => void;
    t: (key: string) => string;
};

export function useWorkspaceAppLifecycle({
    historyCount,
    generatedImageCount,
    objectImages,
    characterImages,
    setApiKeyReady,
    setCurrentLang,
    setInitialPreferencesReady,
    setAspectRatio,
    addLog,
    t,
}: UseWorkspaceAppLifecycleArgs) {
    const hasDataRef = useRef(false);
    const firstRefImageRef = useRef<string | null>(null);

    useEffect(() => {
        hasDataRef.current = historyCount > 0 || generatedImageCount > 0;
    }, [generatedImageCount, historyCount]);

    useEffect(() => {
        let cancelled = false;

        checkApiKey().then(setApiKeyReady);
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
                e.preventDefault();
                e.returnValue = '';
                return '';
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
        if (objectImages.length === 0 && characterImages.length === 0) {
            firstRefImageRef.current = null;
            return;
        }

        const firstImage = objectImages.length > 0 ? objectImages[0] : characterImages[0];
        if (firstImage === firstRefImageRef.current) {
            return;
        }

        firstRefImageRef.current = firstImage;

        const img = new Image();
        img.src = firstImage;
        img.onload = () => {
            const targetRatio = img.width / img.height;
            let bestRatio: AspectRatio = '1:1';
            let minDiff = Number.POSITIVE_INFINITY;

            ASPECT_RATIOS.forEach((ratio) => {
                const [rw, rh] = ratio.value.split(':').map(Number);
                const diff = Math.abs(targetRatio - rw / rh);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestRatio = ratio.value;
                }
            });

            setAspectRatio(bestRatio);
            addLog(t('autoRatioSet').replace('{0}', bestRatio));
        };
    }, [addLog, characterImages, objectImages, setAspectRatio, t]);
}
