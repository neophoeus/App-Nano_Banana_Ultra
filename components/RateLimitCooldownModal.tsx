import React from 'react';
import WorkspaceModalFrame from './WorkspaceModalFrame';
import { WORKSPACE_OVERLAY_Z_INDEX } from '../constants/workspaceOverlays';
import { dismissRateLimitNotice, RateLimitNoticeSession } from '../utils/rateLimitNotice';
import { getTranslation, Language } from '../utils/translations';

interface RateLimitCooldownModalProps {
    notice: RateLimitNoticeSession | null;
    currentLanguage: Language;
    onCancelGeneration: () => void;
    onContinueWaiting?: () => void;
}

const getCategoryLabel = (category: string | undefined, t: (k: any) => string): string => {
    switch (category) {
        case 'daily_quota_exhausted':
            return t('geminiErrorCategoryDailyQuota');
        case 'pool_congestion':
            return t('geminiErrorCategoryPoolCongestion');
        case 'transient_auth':
            return t('geminiErrorCategoryTransientAuth');
        case 'transient_rate_limit':
        default:
            return t('geminiErrorCategoryRateLimit');
    }
};

const getStrategyLabel = (strategy: string | undefined, t: (k: any) => string): string => {
    switch (strategy) {
        case 'server_directed_cooldown':
            return t('geminiStrategyServerCooldown');
        case 'congestion_desync_backoff':
            return t('geminiStrategyCongestionDesync');
        case 'abort_no_retry':
            return t('geminiStrategyAbort');
        case 'adaptive_leaky_bucket_backoff':
        default:
            return t('geminiStrategyAdaptiveBackoff');
    }
};

export default function RateLimitCooldownModal({
    notice,
    currentLanguage,
    onCancelGeneration,
    onContinueWaiting,
}: RateLimitCooldownModalProps) {
    if (!notice || !notice.active || notice.isDismissed) {
        return null;
    }

    const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(currentLanguage, key);

    const remainingSeconds = Math.max(0, Math.ceil(notice.remainingMs / 1000));
    const totalSeconds = Math.max(1, Math.ceil(notice.totalWaitMs / 1000));
    const progressPercent = Math.min(
        100,
        Math.max(0, Math.round(((notice.totalWaitMs - notice.remainingMs) / Math.max(1, notice.totalWaitMs)) * 100)),
    );

    const handleWaitClick = () => {
        if (onContinueWaiting) {
            onContinueWaiting();
        } else {
            dismissRateLimitNotice();
        }
    };

    const handleCancelClick = () => {
        dismissRateLimitNotice();
        onCancelGeneration();
    };

    const retryBadgeText = (t('rateLimitRetryBadge') || '第 {current} / {max} 次自動重試')
        .replace('{current}', String(notice.retryCount))
        .replace('{max}', String(notice.maxRetries));

    return (
        <WorkspaceModalFrame
            dataTestId="rate-limit-cooldown-modal"
            zIndex={WORKSPACE_OVERLAY_Z_INDEX.rateLimitNotice}
            maxWidthClass="max-w-md"
            onClose={handleWaitClick}
            closeLabel={t('rateLimitActionWait') || '繼續等待'}
            title={t('rateLimitModalTitle') || 'API 調用頻率已達上限'}
            description={
                t('rateLimitModalDesc') ||
                '目前每分鐘請求頻率（IPM / RPM 429）已達 Google AI 配額上限。系統已自動開啟保護性暫緩，將在冷卻結束後自動重試。'
            }
            backdropClassName="bg-black/75 backdrop-blur-md"
            panelClassName="nbu-overlay-panel-warm p-5 border border-amber-500/30 shadow-2xl"
            headerClassName="border-b border-amber-500/20 px-0 pb-4"
            headerExtra={
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30 dark:bg-amber-500/20">
                    <span className="text-xl">⏳</span>
                </div>
            }
        >
            <div className="space-y-4 pt-3">
                {/* Countdown display card */}
                <div
                    data-testid="rate-limit-countdown-card"
                    className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-transparent p-4 text-center"
                >
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {t('rateLimitCountdownLabel') || '剩餘冷卻等待時間'}
                    </div>
                    <div className="my-2 flex items-baseline justify-center gap-1.5">
                        <span
                            data-testid="rate-limit-seconds"
                            className="font-mono text-5xl font-black tracking-tight text-amber-600 dark:text-amber-400"
                        >
                            {remainingSeconds}
                        </span>
                        <span className="text-base font-bold text-amber-700/80 dark:text-amber-300/80">
                            {t('rateLimitSecondsUnit') || '秒'}
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-200/50 dark:bg-amber-950/50">
                        <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Metadata badges */}
                <div className="space-y-2 rounded-xl bg-slate-100/80 p-3 text-[12px] dark:bg-slate-800/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 dark:text-slate-500">模型:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{notice.model}</span>
                        </div>
                        <span
                            data-testid="rate-limit-retry-badge"
                            className="rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                        >
                            {retryBadgeText}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 pt-1.5 dark:border-white/5">
                        <span
                            data-testid="rate-limit-category-badge"
                            className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                        >
                            {getCategoryLabel(notice.category, t)}
                        </span>
                        {notice.strategy && (
                            <span
                                data-testid="rate-limit-strategy-badge"
                                className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
                            >
                                {getStrategyLabel(notice.strategy, t)}
                            </span>
                        )}
                        {notice.quotaMetric && (
                            <span
                                data-testid="rate-limit-metric-badge"
                                className="rounded-md bg-slate-200/60 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
                            >
                                {notice.quotaMetric}
                            </span>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2.5 pt-2">
                    <button
                        type="button"
                        data-testid="rate-limit-btn-cancel"
                        onClick={handleCancelClick}
                        className="flex-1 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-[13px] font-semibold text-red-600 transition-all hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                        {t('rateLimitActionCancel') || '取消生成'}
                    </button>
                    <button
                        type="button"
                        data-testid="rate-limit-btn-wait"
                        onClick={handleWaitClick}
                        className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-600 hover:to-amber-700 active:scale-[0.98]"
                    >
                        {t('rateLimitActionWait') || '繼續等待'}
                    </button>
                </div>
            </div>
        </WorkspaceModalFrame>
    );
}
