import React from 'react';
import { AspectRatio, ImageSize, ImageStyle, ImageModel } from '../types';
import { Language } from '../utils/translations';
import { MODEL_CAPABILITIES } from '../constants';
import { PROMPT_TEMPLATES, MAX_DISPLAY_HISTORY } from '../hooks/usePromptHistory';
import Button from './Button';
import RatioSelector from './RatioSelector';
import SizeSelector from './SizeSelector';
import { getStyleIcon } from './StyleSelector';
import BatchSelector from './BatchSelector';
import ModelSelector from './ModelSelector';
import ImageUploader from './ImageUploader';

interface SidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (val: boolean) => void;
    prompt: string;
    setPrompt: (val: string) => void;
    enterToSubmit: boolean;
    toggleEnterToSubmit: () => void;
    handleGenerate: () => void;
    handleCancelGeneration: () => void;
    isGenerating: boolean;
    showPromptDropdown: 'history' | 'templates' | null;
    setShowPromptDropdown: React.Dispatch<React.SetStateAction<'history' | 'templates' | null>>;
    promptHistory: { text: string }[];
    removePrompt: (text: string) => void;
    clearPromptHistory: () => void;
    handleSmartRewrite: () => void;
    handleSurpriseMe: () => void;
    isEnhancingPrompt: boolean;
    objectImages: string[];
    setObjectImages: (val: string[] | ((prev: string[]) => string[])) => void;
    characterImages: string[];
    setCharacterImages: (val: string[] | ((prev: string[]) => string[])) => void;
    imageModel: ImageModel;
    setImageModel: (val: ImageModel) => void;
    imageSize: ImageSize;
    setImageSize: (val: ImageSize) => void;
    imageStyle: ImageStyle;
    setImageStyle: (val: ImageStyle) => void;
    aspectRatio: AspectRatio;
    setAspectRatio: (val: AspectRatio) => void;
    batchSize: number;
    setBatchSize: (val: number) => void;
    lockedParams: { ratio: boolean; size: boolean; style: boolean; model: boolean };
    toggleLock: (key: 'ratio' | 'size' | 'style' | 'model') => void;
    isStyleModalOpen: boolean;
    setIsStyleModalOpen: (val: boolean) => void;
    currentLang: Language;
    t: (key: string) => string;
    getStyleLabel: (style: string) => string;
    showNotification: (msg: string, type: 'info' | 'error') => void;
    handleOpenSketchPad: () => void;
    handleRemoveObjectReference: (idx: number) => void;
    handleRemoveCharacterReference: (idx: number) => void;
    apiKeyReady: boolean;
    handleApiKeyConnect: () => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const {
        isSidebarOpen,
        setIsSidebarOpen,
        prompt, setPrompt,
        enterToSubmit, toggleEnterToSubmit,
        handleGenerate, handleCancelGeneration, isGenerating,
        showPromptDropdown, setShowPromptDropdown,
        promptHistory, removePrompt, clearPromptHistory,
        handleSmartRewrite, handleSurpriseMe, isEnhancingPrompt,
        objectImages, setObjectImages,
        characterImages, setCharacterImages,
        imageModel, setImageModel,
        imageSize, setImageSize,
        imageStyle, setImageStyle,
        aspectRatio, setAspectRatio,
        batchSize, setBatchSize,
        lockedParams, toggleLock,
        isStyleModalOpen, setIsStyleModalOpen,
        currentLang, t, getStyleLabel,
        showNotification, handleOpenSketchPad,
        handleRemoveObjectReference, handleRemoveCharacterReference
    } = props;

    return (
        <aside
            className={`
               bg-white dark:bg-[#0a0c10] border-r border-gray-200 dark:border-gray-800 overflow-y-auto scrollbar-thin
               transition-all duration-300 ease-in-out z-[100]
               fixed lg:relative top-0
               ${isSidebarOpen ? 'w-full lg:w-[380px] translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 opacity-0'}
            `}
            style={{ height: '100%' }}
        >
            <div className="px-4 py-3 space-y-4 pb-24 lg:pb-8 min-w-[360px] relative">

                {/* Mobile Close — absolute, compact */}
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 z-10 bg-white/50 dark:bg-black/50 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* 1. Model Selector — top */}
                <div className="pt-2 lg:pt-0 pr-8 lg:pr-0">
                    <ModelSelector
                        selectedModel={imageModel}
                        onSelect={setImageModel}
                        label={t('modelSelect')}
                        disabled={isGenerating || lockedParams.model}
                        isLocked={lockedParams.model}
                        onLockToggle={() => toggleLock('model')}
                        langDict={{
                            modelGemini3Pro: t('modelGemini3Pro'),
                            modelGemini31Flash: t('modelGemini31Flash'),
                            modelGemini25Flash: t('modelGemini25Flash')
                        }}
                        currentLanguage={currentLang}
                    />
                </div>

                {/* 2. Prompt area */}
                <div className="space-y-2">
                    {/* Textarea */}
                    <div className="relative group">
                        <textarea
                            className="w-full h-32 lg:h-40 bg-gray-50 dark:bg-[#050505] border border-gray-200 dark:border-gray-700 rounded-xl px-3 pt-3 pb-8 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-amber-500/50 resize-none scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent transition-colors"
                            placeholder={t('placeholder')}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (enterToSubmit && e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                        />
                        {prompt && (
                            <button
                                onClick={() => setPrompt('')}
                                className="absolute top-2 right-2 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title={t('clear')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 01-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Enter toggle */}
                    <div className="flex items-center justify-between px-1">
                        <button
                            onClick={toggleEnterToSubmit}
                            className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${enterToSubmit ? 'text-amber-500' : 'text-gray-400 dark:text-gray-600'}`}
                        >
                            <div className={`w-7 h-3.5 rounded-full transition-colors relative ${enterToSubmit ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${enterToSubmit ? 'left-[15px]' : 'left-0.5'}`} />
                            </div>
                            <span>⏎ {t('enterToSend') || 'Enter = Send'}</span>
                        </button>
                        {enterToSubmit && (
                            <span className="text-[9px] text-gray-400 dark:text-gray-600">{t('shiftEnter')}</span>
                        )}
                    </div>

                    {/* 3. Four tool buttons — unified SVG icons, full names */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {/* Templates */}
                        <button
                            onClick={() => setShowPromptDropdown(prev => prev === 'templates' ? null : 'templates')}
                            title={t('templates')}
                            className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all border ${showPromptDropdown === 'templates'
                                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/50 text-amber-600 dark:text-amber-400'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-[9px] font-medium mt-0.5 leading-tight">{t('templates')}</span>
                        </button>

                        {/* History */}
                        <button
                            onClick={() => setShowPromptDropdown(prev => prev === 'history' ? null : 'history')}
                            title={t('promptHistory')}
                            disabled={promptHistory.length === 0}
                            className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all border ${showPromptDropdown === 'history'
                                ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-500/50 text-purple-600 dark:text-purple-400'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-purple-300 dark:hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                                } disabled:opacity-50`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[9px] font-medium mt-0.5 leading-tight">{t('promptHistory')}</span>
                        </button>

                        {/* AI Enhance */}
                        <button
                            onClick={handleSmartRewrite}
                            disabled={isEnhancingPrompt}
                            title={t('rewrite')}
                            className="flex flex-col items-center justify-center py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-300 dark:hover:border-blue-500/50 rounded-lg text-blue-600 dark:text-blue-400 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isEnhancingPrompt ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span className="text-[9px] font-medium mt-0.5 leading-tight">{t('rewrite')}</span>
                        </button>

                        {/* Surprise Me */}
                        <button
                            onClick={handleSurpriseMe}
                            disabled={isEnhancingPrompt}
                            title={t('random')}
                            className="flex flex-col items-center justify-center py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-pink-50 dark:hover:bg-pink-900/10 hover:border-pink-300 dark:hover:border-pink-500/50 rounded-lg text-pink-500 dark:text-pink-400 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="text-[9px] font-medium mt-0.5 leading-tight">{t('random')}</span>
                        </button>
                    </div>

                    {/* Dropdown Panel */}
                    {showPromptDropdown && (
                        <div className="max-h-40 overflow-y-auto scrollbar-thin border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0a0c10]">
                            {showPromptDropdown === 'templates' && PROMPT_TEMPLATES.map(tpl => (
                                <button
                                    key={tpl.id}
                                    onClick={() => { setPrompt(tpl.promptKey ? (t(tpl.promptKey) || tpl.prompt) : tpl.prompt); setShowPromptDropdown(null); }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors flex items-center gap-2"
                                >
                                    <span className="text-base shrink-0">{tpl.icon}</span>
                                    <span className="truncate">{t(tpl.labelKey) || tpl.label}</span>
                                </button>
                            ))}
                            {showPromptDropdown === 'history' && (
                                <>
                                    {promptHistory.slice(0, MAX_DISPLAY_HISTORY).map((item, i) => (
                                        <div key={i} className="flex items-center border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                                            <button
                                                onClick={() => { setPrompt(item.text); setShowPromptDropdown(null); }}
                                                className="flex-1 text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors truncate"
                                            >
                                                {item.text.slice(0, 80)}{item.text.length > 80 ? '…' : ''}
                                            </button>
                                            <button
                                                onClick={() => removePrompt(item.text)}
                                                className="p-1.5 mr-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                            >
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {promptHistory.length > 2 && (
                                        <button
                                            onClick={() => { clearPromptHistory(); setShowPromptDropdown(null); }}
                                            className="w-full text-center px-3 py-1.5 text-[10px] text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                        >
                                            {t('clearAll') || 'Clear All'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Generate / Cancel */}
                    <div className="pt-2">
                        {isGenerating ? (
                            <button
                                onClick={handleCancelGeneration}
                                className="w-full py-3 text-sm shadow-xl rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                                </svg>
                                {t('statusGenerating')} — {t('cancel') || 'Cancel'}
                            </button>
                        ) : (
                            <Button
                                onClick={handleGenerate}
                                isLoading={false}
                                className="w-full py-3 text-sm shadow-xl btn-shimmer"
                                title={t('generate')}
                                icon={
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white drop-shadow-md">
                                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                    </svg>
                                }
                            >
                                {t('generate')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Reference Images */}
                <div className="animate-[fadeIn_0.3s_ease-out]">
                    <div className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
                    {/* Single section header */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('references') || 'References'}</label>
                            <button
                                onClick={handleOpenSketchPad}
                                disabled={isGenerating}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[9px] font-bold border border-amber-200 dark:border-amber-500/30 transition-all"
                                title={t('sketchTitle')}
                            >
                                <span className="text-[10px]">✏️</span> {t('btnSketch')}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                            <span className={objectImages.length >= MODEL_CAPABILITIES[imageModel].maxObjects ? 'text-red-500' : ''}>
                                {t('objLabel') || 'Obj'} {objectImages.length}/{MODEL_CAPABILITIES[imageModel].maxObjects}
                            </span>
                            {MODEL_CAPABILITIES[imageModel].maxCharacters > 0 && (
                                <span className={characterImages.length >= MODEL_CAPABILITIES[imageModel].maxCharacters ? 'text-red-500' : ''}>
                                    {t('charLabel') || 'Char'} {characterImages.length}/{MODEL_CAPABILITIES[imageModel].maxCharacters}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <ImageUploader
                            images={objectImages}
                            onImagesChange={setObjectImages}
                            disabled={isGenerating}
                            label={t('objectRefs')}
                            currentLanguage={currentLang}
                            onWarning={(msg) => showNotification(msg, 'error')}
                            maxImages={MODEL_CAPABILITIES[imageModel].maxObjects}
                            prefixTag="Obj"
                            safeLimit={Math.floor(MODEL_CAPABILITIES[imageModel].maxObjects / 2)}
                            limitWarningMsg={t('errorMaxRefs')}
                            onRemove={handleRemoveObjectReference}
                            hideHeader
                        />
                        {(MODEL_CAPABILITIES[imageModel].maxCharacters > 0) && (
                            <ImageUploader
                                images={characterImages}
                                onImagesChange={setCharacterImages}
                                disabled={isGenerating}
                                label={t('characterRefs')}
                                currentLanguage={currentLang}
                                onWarning={(msg) => showNotification(msg, 'error')}
                                maxImages={MODEL_CAPABILITIES[imageModel].maxCharacters}
                                prefixTag="Char"
                                safeLimit={Math.floor(MODEL_CAPABILITIES[imageModel].maxCharacters / 2) || 1}
                                limitWarningMsg={t('errorMaxRefs')}
                                onRemove={handleRemoveCharacterReference}
                                hideHeader
                            />
                        )}
                    </div>
                </div>

                {/* Style Selector */}
                <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            {t('style')}
                            <button onClick={() => toggleLock('style')} className={`text-[11px] transition-colors ${lockedParams.style ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title={lockedParams.style ? t('styleLocked') : t('lockStyle')}>
                                {lockedParams.style ? '🔒' : '🔓'}
                            </button>
                        </span>
                        {imageStyle !== 'None' && !lockedParams.style && (
                            <button
                                onClick={() => setImageStyle('None')}
                                className="text-[10px] text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-bold uppercase transition-colors"
                            >
                                {t('clear')}
                            </button>
                        )}
                    </label>
                    <button
                        onClick={() => !lockedParams.style && setIsStyleModalOpen(true)}
                        disabled={lockedParams.style}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all duration-300 group
                            ${lockedParams.style ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                            ${imageStyle !== 'None'
                                ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-500/50 shadow-md shadow-amber-500/10'
                                : 'bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800'
                            }
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg transition-colors ${imageStyle !== 'None' ? 'bg-amber-100 text-amber-500' : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                                {getStyleIcon(imageStyle, imageStyle !== 'None')}
                            </div>
                            <span className={`text-sm font-bold ${imageStyle !== 'None' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                {imageStyle === 'None' ? t('styleNone') : getStyleLabel(imageStyle)}
                            </span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Resolution, Quantity, Aspect Ratio */}
                <div className="space-y-4 pt-2">
                    <div className="flex gap-3 items-stretch">
                        <div className="flex-[3]">
                            <SizeSelector
                                selectedSize={imageSize}
                                onSelect={setImageSize}
                                label={t('resolution')}
                                disabled={lockedParams.size || MODEL_CAPABILITIES[imageModel].supportedSizes.length === 0}
                                isLocked={lockedParams.size}
                                onLockToggle={() => toggleLock('size')}
                                supportedSizes={MODEL_CAPABILITIES[imageModel].supportedSizes}
                                currentLanguage={currentLang}
                            />
                        </div>
                        <div className="flex-[2]">
                            <BatchSelector
                                batchSize={batchSize}
                                onSelect={setBatchSize}
                                disabled={isGenerating}
                                label={t('batchSize')}
                                currentLanguage={currentLang}
                            />
                        </div>
                    </div>
                    <RatioSelector
                        selectedRatio={aspectRatio}
                        onSelect={setAspectRatio}
                        label={t('aspectRatio')}
                        disabled={lockedParams.ratio || MODEL_CAPABILITIES[imageModel].supportedRatios.length === 0}
                        isLocked={lockedParams.ratio}
                        onLockToggle={() => toggleLock('ratio')}
                        supportedRatios={MODEL_CAPABILITIES[imageModel].supportedRatios}
                        currentLanguage={currentLang}
                    />
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
