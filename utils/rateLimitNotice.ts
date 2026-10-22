import { useSyncExternalStore } from 'react';
import type { GeminiErrorCategory, RetryStrategyKind, ComputePoolHealthLevel } from './aiStudioPlan';

export interface RateLimitNoticeSession {
    active: boolean;
    model: string;
    totalWaitMs: number;
    remainingMs: number;
    retryCount: number;
    maxRetries: number;
    isDismissed: boolean;
    category?: GeminiErrorCategory;
    strategy?: RetryStrategyKind;
    quotaMetric?: string | null;
    serverRetryDelayMs?: number | null;
    poolLevel?: ComputePoolHealthLevel;
}

let currentNotice: RateLimitNoticeSession | null = null;
const listeners = new Set<(notice: RateLimitNoticeSession | null) => void>();

export const getRateLimitNotice = (): RateLimitNoticeSession | null => currentNotice;

export const setRateLimitNotice = (notice: RateLimitNoticeSession | null): void => {
    currentNotice = notice;
    listeners.forEach((listener) => {
        try {
            listener(currentNotice);
        } catch (error) {
            console.error('[RateLimitNotice] Listener error:', error);
        }
    });
};

export const updateRateLimitRemainingMs = (remainingMs: number): void => {
    if (!currentNotice) {
        return;
    }
    setRateLimitNotice({
        ...currentNotice,
        remainingMs: Math.max(0, remainingMs),
    });
};

export const dismissRateLimitNotice = (): void => {
    if (!currentNotice) {
        return;
    }
    setRateLimitNotice({
        ...currentNotice,
        isDismissed: true,
    });
};

export const clearRateLimitNotice = (): void => {
    setRateLimitNotice(null);
};

export const subscribeRateLimitNotice = (listener: (notice: RateLimitNoticeSession | null) => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export function useRateLimitNotice(): RateLimitNoticeSession | null {
    return useSyncExternalStore(subscribeRateLimitNotice, getRateLimitNotice, getRateLimitNotice);
}
