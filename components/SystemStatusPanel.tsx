import React, { useCallback, useEffect, useMemo, useState } from 'react';

type HealthPayload = {
  ok: boolean;
  hasApiKey: boolean;
  timestamp: string;
  outputDir?: string;
};

type SystemStatusPanelProps = {
  refreshToken?: number;
  t: (key: string) => string;
  locale?: string;
};

const REFRESH_INTERVAL_MS = 30000;

const normalizeLocaleTag = (locale: string | undefined) => {
  if (!locale) {
    return undefined;
  }

  return locale.replace('_', '-');
};

const formatTimestamp = (timestamp: string | null, locale: string | undefined, t: (key: string) => string) => {
  if (!timestamp) {
    return t('statusPanelNever');
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return t('statusPanelUnknown');
  }

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

const StatusDot: React.FC<{ tone: 'green' | 'amber' | 'red' | 'gray' }> = ({ tone }) => {
  const toneClass = {
    green: 'bg-emerald-400 shadow-emerald-400/60',
    amber: 'bg-amber-400 shadow-amber-400/60',
    red: 'bg-rose-400 shadow-rose-400/60',
    gray: 'bg-slate-400 shadow-slate-400/40',
  }[tone];

  return <span className={`inline-flex h-2.5 w-2.5 rounded-full shadow-[0_0_10px] ${toneClass}`} />;
};

const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({ refreshToken = 0, t, locale }) => {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadHealth = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setIsRefreshing(true);

    try {
      const response = await fetch('/api/health');
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || t('statusPanelHealthFailed'));
      }

      setHealth(payload as HealthPayload);
      setError(null);
    } catch (fetchError: any) {
      setError(fetchError?.message || t('statusPanelHealthFailed'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadHealth();

    const intervalId = window.setInterval(() => {
      loadHealth(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadHealth, refreshToken]);

  const serverStatus = useMemo(() => {
    if (isLoading && !health && !error) {
      return { label: t('statusPanelChecking'), detail: t('statusPanelPingingRoute'), tone: 'amber' as const };
    }

    if (error || !health?.ok) {
      return { label: t('statusPanelOffline'), detail: t('statusPanelRouteUnavailable'), tone: 'red' as const };
    }

    return { label: t('statusPanelLive'), detail: t('statusPanelApiResponding'), tone: 'green' as const };
  }, [error, health, isLoading, t]);

  const apiKeyStatus = useMemo(() => {
    if (isLoading && !health && !error) {
      return { label: t('statusPanelChecking'), detail: t('statusPanelReadingConfig'), tone: 'amber' as const };
    }

    if (health?.hasApiKey) {
      return { label: t('statusPanelReady'), detail: t('statusPanelKeyDetected'), tone: 'green' as const };
    }

    return { label: t('statusPanelMissing'), detail: t('statusPanelSetKey'), tone: 'red' as const };
  }, [error, health, isLoading, t]);

  const panelWidthClass = isExpanded ? 'w-[240px]' : 'w-[168px]';

  const statusRows = [
    { title: t('statusPanelLocalApi'), status: serverStatus },
    { title: t('statusPanelGeminiKey'), status: apiKeyStatus },
  ];

  return (
    <div className={`fixed top-20 right-4 z-[120] pointer-events-auto max-w-[calc(100vw-2rem)] transition-all duration-300 ${panelWidthClass}`}>
      <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-[#0b0f14]/75 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.16)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-colors">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.18),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.16),_transparent_38%)]" />

        <div className="relative px-3 py-3">
          <div className="grid gap-2">
            {statusRows.map((row) => (
              <div key={row.title} className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/75 dark:bg-white/5 px-3 py-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{row.title}</p>
                    {isExpanded && (
                      <p className="truncate text-xs text-slate-600 dark:text-slate-300">{row.status.detail}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusDot tone={row.status.tone} />
                    <span className="max-w-[76px] truncate text-xs font-bold text-slate-800 dark:text-slate-100">{row.status.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className="inline-flex h-8 items-center gap-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 text-[11px] font-bold text-slate-600 dark:text-slate-200 transition-all hover:border-amber-300 hover:text-amber-500 dark:hover:border-amber-400/40 dark:hover:text-amber-300"
              title={isExpanded ? t('statusPanelCollapse') : t('statusPanelExpand')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>{isExpanded ? t('statusPanelCollapse') : t('statusPanelExpand')}</span>
            </button>

            <button
              onClick={() => loadHealth(true)}
              className="group inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-500 dark:text-slate-300 transition-all hover:border-amber-300 hover:text-amber-500 dark:hover:border-amber-400/40 dark:hover:text-amber-300"
              title={t('statusPanelRefresh')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {isExpanded && (
            <>
              <div className="mt-2.5 flex items-center justify-between gap-3 px-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {t('statusPanelLastCheck')}
                </span>
                <span className="max-w-[118px] truncate rounded-full border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  {formatTimestamp(health?.timestamp ?? null, locale, t)}
                </span>
              </div>

              {error && (
                <div className="mt-2 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  <p className="truncate">{error}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPanel;