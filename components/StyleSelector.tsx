import React, { useState } from 'react';
import { STYLE_CATEGORIES, STYLES_BY_CATEGORY } from '../constants';
import { ImageStyle, ImageStyleCategory } from '../types';
import {
    getStyleCategoryDefaultLabel,
    getStyleCategoryTranslationKey,
    getStyleDefaultLabel,
    getStyleIconId,
    getStyleTranslationKey,
} from '../utils/styleRegistry';
import { Language, getTranslation } from '../utils/translations';
import { renderStyleIcon } from './styleIcons';

interface StyleSelectorProps {
    selectedStyle: ImageStyle;
    onSelect: (style: ImageStyle) => void;
    label?: string;
    currentLanguage?: Language;
    className?: string;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({
    selectedStyle,
    onSelect,
    label,
    currentLanguage = 'en' as Language,
    className = '',
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const resolveLabel = (translationKey: string, fallback: string) => {
        const translated = t(translationKey);
        return translated === translationKey ? fallback : translated;
    };

    const initialCategory =
        STYLE_CATEGORIES.find(
            (categoryId) => STYLES_BY_CATEGORY[categoryId].includes(selectedStyle) && categoryId !== 'All',
        ) || 'All';

    const [activeCategory, setActiveCategory] = useState<ImageStyleCategory>(initialCategory);
    const stylesToShow = STYLES_BY_CATEGORY[activeCategory];

    return (
        <div className={`space-y-3 ${className}`}>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {label || t('style')}
            </label>

            <div className="flex flex-wrap gap-2 pb-2">
                {STYLE_CATEGORIES.map((categoryId) => (
                    <button
                        key={categoryId}
                        onClick={() => setActiveCategory(categoryId)}
                        className={`
              max-w-full px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-center leading-tight transition-all border
              ${
                  activeCategory === categoryId
                      ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-800 dark:hover:text-white'
              }
            `}
                    >
                        <span className="block max-w-full break-words whitespace-normal">
                            {resolveLabel(
                                getStyleCategoryTranslationKey(categoryId),
                                getStyleCategoryDefaultLabel(categoryId),
                            )}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto nbu-scrollbar-subtle pr-1 pb-2">
                {stylesToShow.map((style) => {
                    const isSelected = selectedStyle === style;

                    return (
                        <button
                            key={style}
                            onClick={() => onSelect(style)}
                            className={`
              group flex items-center justify-start gap-2 px-2 py-2 text-[10px] sm:text-xs font-medium rounded-lg transition-all border min-h-[44px]
              ${
                  isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-800 dark:hover:text-gray-200'
              }
            `}
                        >
                            <div
                                className={`p-1 rounded-md transition-colors shrink-0 ${isSelected ? 'bg-amber-500/20 text-amber-500' : 'bg-gray-100 dark:bg-black/30 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
                            >
                                {renderStyleIcon(getStyleIconId(style), isSelected)}
                            </div>
                            <span className="text-left leading-tight break-words w-full">
                                {resolveLabel(getStyleTranslationKey(style), getStyleDefaultLabel(style))}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default StyleSelector;
