import { en } from './translations/en';

export type Language = 'en' | 'zh_TW' | 'zh_CN' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru';

export type TranslationDictionary = Record<string, string>;

export const SUPPORTED_LANGUAGES: { value: Language; label: string; flag: string; shortLabel: string }[] = [
    { value: 'en', label: 'English', flag: '🇺🇸', shortLabel: 'En' },
    { value: 'zh_TW', label: '繁體中文', flag: '🇹🇼', shortLabel: '繁' },
    { value: 'zh_CN', label: '简体中文', flag: '🇨🇳', shortLabel: '简' },
    { value: 'ja', label: '日本語', flag: '🇯🇵', shortLabel: '日' },
    { value: 'ko', label: '한국어', flag: '🇰🇷', shortLabel: '한' },
    { value: 'es', label: 'Español', flag: '🇪🇸', shortLabel: 'Es' },
    { value: 'fr', label: 'Français', flag: '🇫🇷', shortLabel: 'Fr' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪', shortLabel: 'De' },
    { value: 'ru', label: 'Русский', flag: '🇷🇺', shortLabel: 'Ru' },
];

type NonEnglishLanguage = Exclude<Language, 'en'>;

const loadedLanguages = new Set<Language>(['en']);
const languageLoadPromises = new Map<NonEnglishLanguage, Promise<TranslationDictionary>>();

const createTranslationRecord = () =>
    SUPPORTED_LANGUAGES.reduce(
        (record, language) => {
            record[language.value] = en;
            return record;
        },
        { en } as Record<Language, TranslationDictionary>,
    );

export const translations: Record<Language, TranslationDictionary> = createTranslationRecord();

const languageLoaders: Record<NonEnglishLanguage, () => Promise<TranslationDictionary>> = {
    zh_TW: async () => (await import('./translations/zh_TW')).zh_TW,
    zh_CN: async () => (await import('./translations/zh_CN')).zh_CN,
    ja: async () => (await import('./translations/ja')).ja,
    ko: async () => (await import('./translations/ko')).ko,
    es: async () => (await import('./translations/es')).es,
    fr: async () => (await import('./translations/fr')).fr,
    de: async () => (await import('./translations/de')).de,
    ru: async () => (await import('./translations/ru')).ru,
};

export const isLanguageLoaded = (language: Language): boolean => loadedLanguages.has(language);

export const ensureLanguageLoaded = async (language: Language): Promise<TranslationDictionary> => {
    if (language === 'en') {
        return en;
    }

    if (loadedLanguages.has(language)) {
        return translations[language];
    }

    const existingPromise = languageLoadPromises.get(language);
    if (existingPromise) {
        return existingPromise;
    }

    const loadPromise = languageLoaders[language]().then((dictionary) => {
        translations[language] = dictionary;
        loadedLanguages.add(language);
        languageLoadPromises.delete(language);
        return dictionary;
    });

    languageLoadPromises.set(language, loadPromise);
    return loadPromise;
};

export const preloadAllTranslations = async (): Promise<void> => {
    await Promise.all(SUPPORTED_LANGUAGES.map(({ value }) => ensureLanguageLoaded(value)));
};

export const getTranslation = (lang: Language, key: string): string => {
    return translations[lang]?.[key] || translations['en'][key] || key;
};
