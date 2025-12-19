

import React from 'react';
import { IMAGE_SIZES } from '../constants';
import { ImageSize } from '../types';

interface SizeSelectorProps {
  selectedSize: ImageSize;
  onSelect: (size: ImageSize) => void;
  label?: string;
}

const SizeSelector: React.FC<SizeSelectorProps> = ({ selectedSize, onSelect, label = "Resolution" }) => {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl border border-gray-200 dark:border-gray-800 gap-1">
        {IMAGE_SIZES.map((size) => (
          <button
            key={size}
            onClick={() => onSelect(size)}
            className={`
              flex-1 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 relative overflow-hidden group
              ${selectedSize === size
                ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-md dark:shadow-lg border border-gray-200 dark:border-amber-500/50 shadow-black/5 dark:shadow-amber-500/10'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/50'
              }
            `}
          >
             {size === '4K' && (
               <svg className={`w-3 h-3 transition-colors ${selectedSize === size ? 'text-amber-500' : 'text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                 <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
               </svg>
             )}
             {size === '2K' && (
                <div className={`w-2 h-2 rounded-sm transition-colors ${selectedSize === size ? 'bg-amber-500' : 'bg-gray-400 dark:bg-gray-600 group-hover:bg-gray-500'}`}></div>
             )}
             {size === '1K' && (
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${selectedSize === size ? 'bg-amber-500' : 'bg-gray-400 dark:bg-gray-600 group-hover:bg-gray-500'}`}></div>
             )}
            
            <span>{size}</span>
            
            {/* Pattern for active state */}
            {selectedSize === size && (
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

export default SizeSelector;