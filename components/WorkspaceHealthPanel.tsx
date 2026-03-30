import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { Language, getTranslation } from '../utils/translations';

interface WorkspaceHealthPanelProps {
    currentLanguage?: Language;
    refreshToken?: number;
    isSuppressed?: boolean;
}

type HealthPayload = {
    ok: boolean;
    hasApiKey: boolean;
    timestamp: string;
};

const REFRESH_INTERVAL_MS = 30000;
const PANEL_MARGIN_PX = 12;

const normalizeLocaleTag = (locale: string | undefined) => {
    if (!locale) return undefined;
    return locale.replace('_', '-');
};

const formatTimestamp = (timestamp: string | null, locale: string | undefined, t: (key: string) => string) => {
    if (!timestamp) return t('statusPanelNever');

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return t('statusPanelUnknown');

    try {
        const normalizedLocale = normalizeLocaleTag(locale);
        return date.toLocaleTimeString(normalizedLocale ? [normalizedLocale] : undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    } catch {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    }
};

const WorkspaceHealthPanel: React.FC<WorkspaceHealthPanelProps> = ({
    currentLanguage = 'en',
    refreshToken = 0,
    isSuppressed = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [health, setHealth] = useState<HealthPayload | null>(null);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
    const [panelPosition, setPanelPosition] = useState<{ top: number; right: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const t = (key: string) => getTranslation(currentLanguage as Language, key);

    useEffect(() => {
        if (isSuppressed) {
            setIsExpanded(false);
        }
    }, [isSuppressed]);

    useEffect(() => {
        let isDisposed = false;

        const loadHealth = async (silent: boolean = false) => {
            if (!silent) {
                setIsRefreshingHealth(true);
            }

            try {
                const response = await fetch('/api/health');
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.error || t('statusPanelHealthFailed'));
                }

                if (!isDisposed) {
                    setHealth(payload as HealthPayload);
                    setHealthError(null);
                }
            } catch (error: any) {
                if (!isDisposed) {
                    setHealthError(error?.message || t('statusPanelHealthFailed'));
                }
            } finally {
                if (!isDisposed) {
                    setIsRefreshingHealth(false);
                }
            }
        };

        loadHealth();
        const intervalId = window.setInterval(() => {
            loadHealth(true);
        }, REFRESH_INTERVAL_MS);

        return () => {
            isDisposed = true;
            window.clearInterval(intervalId);
        };
    }, [currentLanguage, refreshToken]);

    useEffect(() => {
        if (!isExpanded) {
            setPanelPosition(null);
            return;
        }

        const updatePanelPosition = () => {
            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const estimatedPanelHeight = Math.min(368, Math.max(240, viewportHeight - 96));
            const preferredTop = rect.bottom + PANEL_MARGIN_PX;
            const maxTop = Math.max(PANEL_MARGIN_PX, viewportHeight - estimatedPanelHeight - PANEL_MARGIN_PX);

            setPanelPosition({
                top: Math.max(PANEL_MARGIN_PX, Math.min(preferredTop, maxTop)),
                right: Math.max(PANEL_MARGIN_PX, viewportWidth - rect.right),
            });
        };

        updatePanelPosition();
        window.addEventListener('resize', updatePanelPosition);
        window.addEventListener('scroll', updatePanelPosition, true);

        return () => {
            window.removeEventListener('resize', updatePanelPosition);
            window.removeEventListener('scroll', updatePanelPosition, true);
        };
    }, [isExpanded]);

    const localApiTone =
        healthError || health?.ok === false ? 'bg-red-500' : health ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500';
    const keyTone = health ? (health.hasApiKey ? 'bg-emerald-500' : 'bg-red-500') : 'bg-gray-400 dark:bg-gray-500';
    const summaryTone =
        healthError || health?.ok === false
            ? 'text-red-600 dark:text-red-300'
            : health
              ? 'text-emerald-600 dark:text-emerald-300'
              : 'text-gray-500 dark:text-gray-400';
    const statusColor =
        healthError || health?.ok === false
            ? 'bg-red-500'
            : isRefreshingHealth
              ? 'bg-amber-500 animate-pulse'
              : health
                ? 'bg-emerald-500'
                : 'bg-gray-400 dark:bg-gray-500';
    const checkingLabel = t('statusPanelChecking');
    const localApiLabel =
        healthError || health?.ok === false ? t('statusPanelOffline') : health ? t('statusPanelLive') : checkingLabel;
    const keyLabel = health ? (health.hasApiKey ? t('statusPanelReady') : t('statusPanelMissing')) : checkingLabel;
    const summaryLabel =
        healthError || health?.ok === false ? t('statusPanelOffline') : health ? t('statusPanelLive') : checkingLabel;
    const headerStatusItems = [
        {
            key: 'local-api',
            testId: 'global-health-local-api',
            label: t('statusPanelLocalApi'),
            tone: localApiTone,
            value: localApiLabel,
        },
        {
            key: 'gemini-key',
            testId: 'global-health-gemini-key',
            label: t('statusPanelGeminiKey'),
            tone: keyTone,
            value: keyLabel,
        },
    ];

    const expandedConsole =
        isExpanded && panelPosition && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      data-testid="global-health-panel"
                      className="nbu-floating-panel fixed mt-3 flex w-[85vw] max-w-[360px] flex-col overflow-hidden animate-[fadeIn_0.1s_ease-out] rounded-xl"
                      style={{
                          top: panelPosition.top,
                          right: panelPosition.right,
                          zIndex: WORKSPACE_OVERLAY_Z_INDEX.supportConsole,
                      }}
                  >
                      {/* Header */}
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-100/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
                          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] tracking-wider">
                              {t('healthPanelTitle')}
                          </span>
                          <div className="flex gap-2">
                              <button
                                  onClick={() => {
                                      setIsRefreshingHealth(true);
                                      fetch('/api/health')
                                          .then(async (response) => {
                                              const payload = await response.json().catch(() => null);
                                              if (!response.ok)
                                                  throw new Error(payload?.error || t('statusPanelHealthFailed'));
                                              setHealth(payload as HealthPayload);
                                              setHealthError(null);
                                          })
                                          .catch((error: any) =>
                                              setHealthError(error?.message || t('statusPanelHealthFailed')),
                                          )
                                          .finally(() => setIsRefreshingHealth(false));
                                  }}
                                  className="text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:hover:text-amber-300 transition-colors"
                                  title={t('statusPanelRefresh')}
                              >
                                  <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className={`h-4 w-4 ${isRefreshingHealth ? 'animate-spin' : ''}`}
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                  >
                                      <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                      />
                                  </svg>
                              </button>
                              <button
                                  onClick={() => setIsExpanded(false)}
                                  className="text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
                              >
                                  <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                  >
                                      <path
                                          fillRule="evenodd"
                                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                          clipRule="evenodd"
                                      />
                                  </svg>
                              </button>
                          </div>
                      </div>

                      <div className="space-y-2 px-3 py-3">
                          <div className="grid grid-cols-2 gap-2">
                              {headerStatusItems.map((item) => (
                                  <div
                                      key={item.key}
                                      data-testid={item.testId}
                                      className="nbu-inline-panel min-w-0 rounded-xl px-2.5 py-2"
                                  >
                                      <div className="flex items-center justify-between gap-2">
                                          <span className="truncate text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                              {item.label}
                                          </span>
                                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.tone}`}></span>
                                      </div>
                                      <p className="mt-1 truncate text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                                          {item.value}
                                      </p>
                                  </div>
                              ))}
                          </div>
                          <div data-testid="global-health-summary" className="nbu-inline-panel rounded-xl px-3 py-3">
                              <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                          {t('healthPanelTitle')}
                                      </div>
                                      <p className={`mt-1 text-sm font-semibold ${summaryTone}`}>{summaryLabel}</p>
                                  </div>
                                  <span className={`h-3 w-3 shrink-0 rounded-full ${statusColor}`}></span>
                              </div>
                          </div>
                          <div
                              data-testid="global-health-last-check"
                              className="nbu-inline-panel flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-[10px] text-gray-500 dark:text-gray-400"
                          >
                              <span className="truncate uppercase tracking-wider">{t('statusPanelLastCheck')}</span>
                              <span className="truncate font-semibold">
                                  {formatTimestamp(health?.timestamp ?? null, currentLanguage, t)}
                              </span>
                          </div>
                          {healthError && (
                              <div className="mt-2 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-900/10 px-2 py-1.5 text-[10px] text-red-600 dark:text-red-300 truncate">
                                  {healthError}
                              </div>
                          )}
                      </div>
                  </div>,
                  document.body,
              )
            : null;

    return (
        <div
            ref={containerRef}
            className="relative flex flex-col items-end gap-2 font-mono text-[11px] transition-all duration-300"
        >
            {/* Expanded Console (Absolute positioned relative to this container) */}
            {expandedConsole}

            {/* Minimized Pill / Toggle Button */}
            <button
                data-testid="global-health-toggle"
                type="button"
                aria-expanded={isExpanded}
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
            group flex max-w-full flex-wrap items-center justify-end gap-2 pl-2.5 pr-2.5 py-2 lg:pl-3 lg:pr-3 rounded-full border text-left transition-all duration-300
            ${
                isExpanded
                    ? 'nbu-overlay-shell border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 shadow-lg'
                    : 'nbu-overlay-shell hover:border-gray-300 text-gray-600 dark:hover:border-gray-500 dark:text-gray-300'
            }
        `}
            >
                <div className="flex items-center gap-2 rounded-full bg-gray-100/80 px-2.5 py-1.5 dark:bg-gray-900/80">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusColor}`}></span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        {t('healthPanelTitle')}
                    </span>
                </div>

                {!isExpanded && (
                    <div
                        data-testid="global-health-summary"
                        className="flex max-w-full flex-wrap items-center justify-end gap-2"
                    >
                        {headerStatusItems.map((item) => (
                            <div
                                key={item.key}
                                className="flex min-w-0 items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-2.5 py-1.5 dark:border-gray-700/80 dark:bg-[#141922]/75"
                            >
                                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.tone}`}></span>
                                <span className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                                    {item.label}
                                </span>
                                <span className="truncate text-[10px] font-semibold text-gray-700 dark:text-gray-200">
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {isExpanded && <span className="text-xs font-bold px-1">{t('healthPanelHide')}</span>}

                {/* Chevron */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
        </div>
    );
};

export default WorkspaceHealthPanel;
