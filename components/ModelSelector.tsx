import React, { useState, useRef, useEffect } from 'react';
import { IMAGE_MODELS } from '../constants';
import { ImageModel } from '../types';
import { Language, getTranslation } from '../utils/translations';

interface ModelSelectorProps {
    selectedModel: ImageModel;
    onSelect: (model: ImageModel) => void;
    label?: string;
    disabled?: boolean;
    langDict: Record<string, string>;
    currentLanguage?: Language;
}

const MODEL_SHORT_NAMES: Record<ImageModel, string> = {
    'gemini-3-pro-image': 'Nano Banana Pro',
    'gemini-3.1-flash-image': 'Nano Banana 2',
    'gemini-3.1-flash-lite-image': 'Nano Banana 2 Lite',
    'gemini-2.5-flash-image': 'Nano Banana',
};

const ModelSelector: React.FC<ModelSelectorProps> = ({
    selectedModel,
    onSelect,
    label,
    disabled,
    langDict,
    currentLanguage = 'en' as Language,
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const getModelLabel = (model: ImageModel) => {
        switch (model) {
            case 'gemini-3-pro-image':
                return langDict.modelGemini3Pro || 'Gemini 3 Pro';
            case 'gemini-3.1-flash-image':
                return langDict.modelGemini31Flash || 'Gemini 3.1 Flash';
            case 'gemini-3.1-flash-lite-image':
                return langDict.modelGemini31FlashLite || 'Gemini 3.1 Flash Lite';
            case 'gemini-2.5-flash-image':
                return langDict.modelGemini25Flash || 'Gemini 2.5 Flash';
            default:
                return model;
        }
    };

    const getShortName = (model: ImageModel) => MODEL_SHORT_NAMES[model] || model;

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                {label || t('modelSelect')}
            </label>
            <div
                ref={dropdownRef}
                className={`relative flex-1 transition-opacity ${disabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}
            >
                {/* Trigger — shows short name */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={disabled}
                    className="nbu-input-surface w-full cursor-pointer rounded-xl py-1.5 pl-3 pr-8 text-left text-sm font-bold focus:ring-1 focus:ring-amber-500/50"
                >
                    {getShortName(selectedModel)}
                </button>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg
                        className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {/* Dropdown — shows full name */}
                {isOpen && (
                    <div className="nbu-floating-panel absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl">
                        {IMAGE_MODELS.map((model) => (
                            <button
                                key={model}
                                type="button"
                                onClick={() => {
                                    onSelect(model);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                    model === selectedModel
                                        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                                }`}
                            >
                                {getModelLabel(model)}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelSelector;
