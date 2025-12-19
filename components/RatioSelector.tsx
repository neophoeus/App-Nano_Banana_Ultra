

import React from 'react';
import { ASPECT_RATIOS } from '../constants';
import { AspectRatio } from '../types';
import { Language, getTranslation } from '../utils/translations';

interface RatioSelectorProps {
  selectedRatio: AspectRatio;
  onSelect: (ratio: AspectRatio) => void;
  label?: string;
  disabled?: boolean;
  currentLanguage?: Language;
}

const RatioSelector: React.FC<RatioSelectorProps> = ({ 
    selectedRatio, 
    onSelect, 
    label = "Aspect Ratio", 
    disabled,
    currentLanguage = 'en' as Language
}) => {
  
  const t = (key: string) => getTranslation(currentLanguage, key);

  // Calculate exact pixel dimensions for the icon to ensure the shape matches the ratio mathematically.
  // Constrained by a max width/height to fit in the UI container.
  const getIconStyle = (ratio: string) => {
      const [w, h] = ratio.split(':').map(Number);
      const numericRatio = w / h;
      
      const MAX_H = 22; 
      const MAX_W = 42; 

      let finalW, finalH;

      // Fit by height first
      finalH = MAX_H;
      finalW = finalH * numericRatio;

      // If width exceeds max, fit by width
      if (finalW > MAX_W) {
          finalW = MAX_W;
          finalH = finalW / numericRatio;
      }

      return { 
          width: `${finalW}px`, 
          height: `${finalH}px` 
      };
  };

  const getRatioLabel = (originalLabel: string) => {
      // Map original constants label to translation key
      // e.g. "Classic V" -> "ratioClassicV"
      const key = 'ratio' + originalLabel.replace(/\s/g, '');
      return t(key);
  };

  return (
    <div className={`space-y-2 transition-opacity ${disabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex justify-between">
        {label}
      </label>
      <div className="grid grid-cols-5 gap-2">
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio.value}
            onClick={() => onSelect(ratio.value)}
            disabled={disabled}
            className={`
              flex flex-col items-center justify-center p-1 rounded-lg border text-[10px] transition-all relative overflow-hidden group h-[60px]
              ${selectedRatio === ratio.value
                ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-800 dark:hover:text-gray-200'
              }
            `}
            title={getRatioLabel(ratio.label)}
          >
            <div className={`w-full h-8 mb-1 flex items-center justify-center`}>
                <div 
                   className={`border rounded-[1px] transition-all ${ratio.value === selectedRatio ? 'border-amber-400 bg-amber-400/80' : 'border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-500/20 group-hover:border-gray-500 dark:group-hover:border-gray-400'}`}
                   style={getIconStyle(ratio.value)}
                />
            </div>
            <span className="truncate w-full text-center font-bold leading-none tracking-tight scale-90">{ratio.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RatioSelector;