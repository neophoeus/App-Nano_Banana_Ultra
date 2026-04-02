import React from 'react';
import { Language, getTranslation } from '../utils/translations';

interface BatchSelectorProps {
    batchSize: number;
    onSelect: (size: number) => void;
    disabled?: boolean;
    label?: string;
    currentLanguage?: Language;
}

const BatchSelector: React.FC<BatchSelectorProps> = ({
    batchSize,
    onSelect,
    disabled,
    label,
    currentLanguage = 'en' as Language,
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);
    return (
        <div
            className={`flex flex-col gap-2 h-full transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex justify-between items-center">
                {label || t('batchSize')}
                <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${batchSize > 1 ? 'border border-amber-500/30 bg-amber-100 text-amber-600 shadow-sm dark:bg-amber-500/20 dark:text-amber-400' : 'nbu-quiet-pill border-0 px-1.5 py-0.5 text-[10px]'}`}
                >
                    {t('qtyX').replace('{0}', String(batchSize))}
                </span>
            </label>
            <div className="nbu-segmented-tray mt-auto flex gap-1 p-1">
                {[1, 2, 3, 4].map((size) => (
                    <button
                        key={size}
                        onClick={() => onSelect(size)}
                        className={`
              flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 relative overflow-hidden
              ${
                  batchSize === size
                      ? 'nbu-control-button text-amber-600 shadow-md shadow-black/5 dark:border-amber-500/50 dark:text-amber-400 dark:shadow-lg dark:shadow-amber-500/10'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/50'
              }
            `}
                    >
                        {size}
                        {batchSize === size && (
                            <div className="absolute top-0 right-0 p-0.5">
                                <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(245,158,11,1)]"></div>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BatchSelector;
