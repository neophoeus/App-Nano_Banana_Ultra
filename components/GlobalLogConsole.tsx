
import React, { useState, useEffect, useRef } from 'react';
import { Language, getTranslation } from '../utils/translations';

interface GlobalLogConsoleProps {
  logs: string[];
  isLoading: boolean;
  currentLanguage?: Language;
}

const GlobalLogConsole: React.FC<GlobalLogConsoleProps> = ({ logs, isLoading, currentLanguage = 'en' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = (key: string) => getTranslation(currentLanguage as Language, key);

  // Auto-scroll logic
  useEffect(() => {
    // We use a small timeout to ensure the DOM has updated with the new log item
    // before we calculate the scroll height.
    if (isExpanded && scrollRef.current) {
        const scrollContainer = scrollRef.current;
        setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 0);
    }
  }, [logs, isExpanded]);

  const lastLog = logs.length > 0 ? logs[logs.length - 1].replace(/^\[.*?\]\s*/, '') : t('consoleReady');
  const lowerLastLog = lastLog.toLowerCase();

  // Logic to prevent false negatives on summary logs like "0 Failed"
  const isZeroFailed = lowerLastLog.includes('0 failed') || lowerLastLog.includes('0 error');
  const hasError = (lowerLastLog.includes('fail') || lowerLastLog.includes('error') || lowerLastLog.includes('fatal') || lowerLastLog.includes('block')) && !isZeroFailed;
  const hasSuccess = lowerLastLog.includes('success') || lowerLastLog.includes('completed') || lowerLastLog.includes('ready');
  
  // Parse last log for color in minimized state
  let statusColor = "bg-gray-400 dark:bg-gray-500";
  let statusIcon = "●";
  if (isLoading) {
      statusColor = "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]";
      statusIcon = "⚡";
  } else if (hasError) {
      statusColor = "bg-red-500";
      statusIcon = "✕";
  } else if (hasSuccess) {
      statusColor = "bg-emerald-500";
      statusIcon = "✓";
  }

  // --- Helper for rendering logs inside expanded view ---
  const getLogMeta = (msg: string) => {
    const lowerMsg = msg.toLowerCase();
    // Check for explicit "0 failed" pattern to avoid false positive error flagging in summaries
    const isZeroFailedMsg = lowerMsg.includes('0 failed') || lowerMsg.includes('0 error');

    if ((lowerMsg.includes('error') || lowerMsg.includes('failed') || lowerMsg.includes('fatal') || lowerMsg.includes('block')) && !isZeroFailedMsg) {
        return { color: 'text-red-500 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-900/10', icon: '✕' };
    }
    if (lowerMsg.includes('retry')) return { color: 'text-orange-500 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-900/10', icon: '↻' };
    if (lowerMsg.includes('success') || lowerMsg.includes('completed')) return { color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/10', icon: '✓' };
    if (lowerMsg.includes('requesting') || lowerMsg.includes('sending')) return { color: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/20 bg-cyan-50 dark:bg-cyan-900/10', icon: '➜' };
    return { color: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-800/50', icon: '›' };
  };

  return (
    <div className="relative flex flex-col items-end gap-2 font-mono text-xs transition-all duration-300">
      
      {/* Expanded Console (Absolute positioned relative to this container) */}
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-3 w-[85vw] max-w-[400px] h-64 bg-white/95 dark:bg-[#0a0c10]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.1s_ease-out] z-[10000]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-100/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
                <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] tracking-wider">{t('consoleSystem')}</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsExpanded(false)} 
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {/* Log Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                {logs.length === 0 && <div className="text-gray-400 dark:text-gray-600 text-center mt-10 opacity-50">{t('consoleReady')}</div>}
                {logs.map((log, i) => {
                    const match = log.match(/^\[(.*?)\] (.*)$/);
                    const msgContent = match ? match[2] : log;
                    const meta = getLogMeta(msgContent);
                    return (
                        <div key={i} className={`flex gap-2 p-1.5 rounded border ${meta.border} text-[10px] sm:text-xs break-all`}>
                            <span className={`shrink-0 font-bold ${meta.color}`}>{meta.icon}</span>
                            <span className="text-gray-600 dark:text-gray-300">{msgContent}</span>
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="flex items-center gap-2 p-2 text-green-600 dark:text-green-400/70 animate-pulse">
                         <span className="w-1.5 h-3 bg-green-500"></span>
                         <span>{t('statusProcessing')}</span>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Minimized Pill / Toggle Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
            group flex items-center gap-2 lg:gap-3 pl-2 pr-2 lg:pl-3 lg:pr-4 py-2.5 rounded-full border shadow-2xl transition-all duration-300
            ${isExpanded 
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300' 
                : 'bg-white/90 dark:bg-[#0a0c10]/90 backdrop-blur-md border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-200 hover:scale-105'
            }
        `}
      >
          {/* Status Dot */}
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor} flex items-center justify-center text-[8px] text-white dark:text-black font-bold shrink-0`}>
             {!isLoading && statusIcon !== "●" && statusIcon}
          </div>
          
          {/* Text (Hidden on mobile when minimized to save space, unless expanding) */}
          {!isExpanded && (
              <div className="flex flex-col items-start text-left max-w-[200px] hidden sm:flex">
                 <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-0.5">{t('consoleSystem')}</span>
                 <span className="text-[11px] font-medium truncate w-full opacity-90">{isLoading ? t('statusProcessing') : lastLog}</span>
              </div>
          )}
          
          {/* Mobile-only label (simple) */}
          {!isExpanded && (
             <span className="text-[10px] font-bold text-gray-400 sm:hidden uppercase">{t('consoleLog')}</span>
          )}

          {isExpanded && <span className="text-xs font-bold px-1">{t('consoleHide')}</span>}

          {/* Chevron */}
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
      </button>

    </div>
  );
};

export default GlobalLogConsole;
