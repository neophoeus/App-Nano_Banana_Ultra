

import React from 'react';

interface BatchSelectorProps {
  batchSize: number;
  onSelect: (size: number) => void;
  disabled?: boolean;
  label?: string;
}

const BatchSelector: React.FC<BatchSelectorProps> = ({ batchSize, onSelect, disabled, label = "Image Count" }) => {
  return (
    <div className={`space-y-2 transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex justify-between items-center">
         {label}
         <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${batchSize > 1 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
            {batchSize}x
         </span>
      </label>
      <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl border border-gray-200 dark:border-gray-800 gap-1">
        {[1, 2, 4].map((size) => (
          <button
            key={size}
            onClick={() => onSelect(size)}
            className={`
              flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 relative overflow-hidden
              ${batchSize === size
                ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-md dark:shadow-lg border border-gray-200 dark:border-amber-500/50 shadow-black/5 dark:shadow-amber-500/10'
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