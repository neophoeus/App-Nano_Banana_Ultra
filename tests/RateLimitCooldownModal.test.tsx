/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import RateLimitCooldownModal from '../components/RateLimitCooldownModal';
import { preloadAllTranslations } from '../utils/translations';
import {
    setRateLimitNotice,
    clearRateLimitNotice,
    dismissRateLimitNotice,
    RateLimitNoticeSession,
} from '../utils/rateLimitNotice';

describe('RateLimitCooldownModal', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeAll(async () => {
        await preloadAllTranslations();
    });

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        clearRateLimitNotice();
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        clearRateLimitNotice();
    });

    it('renders nothing when notice is null or inactive', async () => {
        await act(async () => {
            root.render(<RateLimitCooldownModal notice={null} currentLanguage="zh_TW" onCancelGeneration={vi.fn()} />);
        });

        expect(container.querySelector('[data-testid="rate-limit-cooldown-modal"]')).toBeNull();
    });

    it('renders nothing when notice is dismissed', async () => {
        const notice: RateLimitNoticeSession = {
            active: true,
            model: 'gemini-3.1-flash-image',
            totalWaitMs: 15000,
            remainingMs: 12000,
            retryCount: 1,
            maxRetries: 5,
            isDismissed: true,
        };

        await act(async () => {
            root.render(
                <RateLimitCooldownModal notice={notice} currentLanguage="zh_TW" onCancelGeneration={vi.fn()} />,
            );
        });

        expect(container.querySelector('[data-testid="rate-limit-cooldown-modal"]')).toBeNull();
    });

    it('renders modal with dynamic countdown seconds and retry badge in zh_TW', async () => {
        const notice: RateLimitNoticeSession = {
            active: true,
            model: 'gemini-3-pro-image',
            totalWaitMs: 25000,
            remainingMs: 18400,
            retryCount: 2,
            maxRetries: 6,
            isDismissed: false,
        };

        await act(async () => {
            root.render(
                <RateLimitCooldownModal notice={notice} currentLanguage="zh_TW" onCancelGeneration={vi.fn()} />,
            );
        });

        const modal = container.querySelector('[data-testid="rate-limit-cooldown-modal"]');
        expect(modal).toBeTruthy();
        expect(modal?.textContent).toContain('API 調用頻率已達上限');
        expect(modal?.textContent).toContain('gemini-3-pro-image');

        const secondsElem = container.querySelector('[data-testid="rate-limit-seconds"]');
        expect(secondsElem?.textContent?.trim()).toBe('19'); // Math.ceil(18400 / 1000)

        const retryBadge = container.querySelector('[data-testid="rate-limit-retry-badge"]');
        expect(retryBadge?.textContent).toContain('第 2 / 6 次自動重試');
    });

    it('renders English text properly when currentLanguage is en', async () => {
        const notice: RateLimitNoticeSession = {
            active: true,
            model: 'gemini-3.1-flash-image',
            totalWaitMs: 10000,
            remainingMs: 8000,
            retryCount: 1,
            maxRetries: 5,
            isDismissed: false,
        };

        await act(async () => {
            root.render(<RateLimitCooldownModal notice={notice} currentLanguage="en" onCancelGeneration={vi.fn()} />);
        });

        const modal = container.querySelector('[data-testid="rate-limit-cooldown-modal"]');
        expect(modal?.textContent).toContain('API Rate Limit Reached');
        expect(modal?.textContent).toContain('Auto-retry 1 of 5');
        expect(modal?.textContent).toContain('Continue Waiting');
        expect(modal?.textContent).toContain('Cancel Generation');
    });

    it('invokes onCancelGeneration when clicking cancel button', async () => {
        const handleCancel = vi.fn();
        const notice: RateLimitNoticeSession = {
            active: true,
            model: 'gemini-3-pro-image',
            totalWaitMs: 20000,
            remainingMs: 15000,
            retryCount: 1,
            maxRetries: 5,
            isDismissed: false,
        };

        await act(async () => {
            root.render(
                <RateLimitCooldownModal notice={notice} currentLanguage="zh_TW" onCancelGeneration={handleCancel} />,
            );
        });

        const cancelBtn = container.querySelector('[data-testid="rate-limit-btn-cancel"]') as HTMLButtonElement;
        expect(cancelBtn).toBeTruthy();

        await act(async () => {
            cancelBtn.click();
        });

        expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('invokes onContinueWaiting or dismisses when clicking wait button', async () => {
        const handleWait = vi.fn();
        const notice: RateLimitNoticeSession = {
            active: true,
            model: 'gemini-3-pro-image',
            totalWaitMs: 20000,
            remainingMs: 15000,
            retryCount: 1,
            maxRetries: 5,
            isDismissed: false,
        };

        await act(async () => {
            root.render(
                <RateLimitCooldownModal
                    notice={notice}
                    currentLanguage="zh_TW"
                    onCancelGeneration={vi.fn()}
                    onContinueWaiting={handleWait}
                />,
            );
        });

        const waitBtn = container.querySelector('[data-testid="rate-limit-btn-wait"]') as HTMLButtonElement;
        expect(waitBtn).toBeTruthy();

        await act(async () => {
            waitBtn.click();
        });

        expect(handleWait).toHaveBeenCalledTimes(1);
    });

    it('renders deep error category, strategy, and quota metric badges when present', async () => {
        const notice: RateLimitNoticeSession = {
            active: true,
            model: 'gemini-3-pro-image',
            totalWaitMs: 30000,
            remainingMs: 22000,
            retryCount: 1,
            maxRetries: 4,
            category: 'pool_congestion',
            strategy: 'congestion_desync_backoff',
            quotaMetric: 'generate_content_requests_per_minute',
            isDismissed: false,
        };

        await act(async () => {
            root.render(<RateLimitCooldownModal notice={notice} currentLanguage="zh_TW" onCancelGeneration={vi.fn()} />);
        });

        const categoryBadge = container.querySelector('[data-testid="rate-limit-category-badge"]');
        expect(categoryBadge?.textContent).toContain('共享算力池資源擁塞');

        const strategyBadge = container.querySelector('[data-testid="rate-limit-strategy-badge"]');
        expect(strategyBadge?.textContent).toContain('抗共振離散重試');

        const metricBadge = container.querySelector('[data-testid="rate-limit-metric-badge"]');
        expect(metricBadge?.textContent).toContain('generate_content_requests_per_minute');
    });
});
