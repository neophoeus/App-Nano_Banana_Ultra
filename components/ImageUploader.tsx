
import React, { useRef, useState } from 'react';
import { Language, getTranslation } from '../utils/translations';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  disabled?: boolean;
  label?: string;
  currentLanguage?: Language;
  onWarning?: (message: string) => void;
  maxImages?: number;
  limitWarningMsg?: string; // New prop for custom limit message
  safeLimit?: number; // Visual indicator for "safe" amount of images
  onLaunchSketch?: () => void; // Renamed prop to trigger sketch pad
  onRemove?: (index: number) => void; // Add this prop
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  images, 
  onImagesChange, 
  disabled, 
  label = "Reference Images",
  currentLanguage = 'en' as Language,
  onWarning,
  maxImages = 5,
  limitWarningMsg,
  safeLimit,
  onLaunchSketch,
  onRemove
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const t = (key: string) => getTranslation(currentLanguage, key);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    // Enforce max images limit
    const remainingSlots = maxImages - images.length;
    
    // Check if we are already full
    if (remainingSlots <= 0) {
        onWarning?.(limitWarningMsg || t('errorMaxRefs'));
        return;
    }
    
    // Check if new files exceed remaining slots
    if (validFiles.length > remainingSlots) {
        onWarning?.(limitWarningMsg || t('errorMaxRefs'));
    }

    const filesToProcess = validFiles.slice(0, remainingSlots);

    let processedCount = 0;
    const newImages: string[] = [];

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        newImages.push(result);
        processedCount++;
        
        if (processedCount === filesToProcess.length) {
          onImagesChange([...images, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (indexToRemove: number) => {
    if (onRemove) {
        onRemove(indexToRemove);
    } else {
        onImagesChange(images.filter((_, index) => index !== indexToRemove));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between items-end">
         <div className="flex items-center gap-2">
             <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</label>
             {onLaunchSketch && (
                 <button 
                    onClick={onLaunchSketch}
                    disabled={disabled}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[9px] font-bold border border-amber-200 dark:border-amber-500/30 transition-all"
                    title={t('sketchTitle')}
                 >
                    <span className="text-[10px]">✏️</span> {t('btnSketch')}
                 </button>
             )}
         </div>
         <div className="flex items-center gap-2">
            {safeLimit && (
              <span className="text-[9px] text-emerald-600 dark:text-emerald-500/80 font-mono hidden sm:inline-block">
                {t('safeLimitTip').replace('{0}', safeLimit.toString())}
              </span>
            )}
            <span className={`text-[10px] ${images.length >= maxImages ? 'text-red-500 dark:text-red-400' : 'text-gray-500'}`}>{images.length} / {maxImages}</span>
         </div>
      </div>

      {/* Grid Display */}
      <div 
        className={`grid grid-cols-3 gap-2 ${images.length > 0 ? 'mb-2' : ''}`}
      >
        {images.map((img, index) => {
          const isSafe = safeLimit !== undefined && index < safeLimit;
          return (
            <div 
              key={index} 
              className={`relative group aspect-square rounded-lg overflow-hidden border transition-all duration-300
                ${isSafe 
                    ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                }
              `}
            >
              <img src={img} alt={`Ref ${index + 1}`} className="w-full h-full object-cover" />
              
              {/* Index Label */}
              <div className={`absolute top-1 left-1 backdrop-blur-[4px] px-1.5 py-0.5 rounded text-[9px] font-mono border 
                ${isSafe 
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-100 border-emerald-500/30' 
                    : 'bg-white/70 dark:bg-black/70 text-gray-800 dark:text-white border-white/10'
                }`}
              >
                {t('uploadRefIndex')} {index + 1}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeImage(index)}
                disabled={disabled}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 drop-shadow-lg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* Add Button (Small) - Show if we have images but less than max */}
        {images.length > 0 && images.length < maxImages && (
           <button
             onClick={() => !disabled && fileInputRef.current?.click()}
             disabled={disabled}
             className="aspect-square rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
             </svg>
             <span className="text-[9px] mt-1 font-medium">{t('uploadAdd')}</span>
           </button>
        )}
      </div>

      {/* Main Drop Area - Only show if no images */}
      {images.length === 0 && (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center gap-2 min-h-[100px]
            ${disabled ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-800' : 'cursor-pointer'}
            ${isDragging 
              ? 'border-yellow-500 bg-yellow-500/10' 
              : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600'
            }
          `}
        >
          <div className={`p-2 rounded-full ${isDragging ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">{label}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">{t('dragDrop')}</p>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};

export default ImageUploader;
