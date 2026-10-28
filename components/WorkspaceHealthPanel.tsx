import React, { useEffect, useState } from 'react';
import { Language, getTranslation } from '../utils/translations';

interface WorkspaceHealthPanelProps {
    currentLanguage?: Language;
    refreshToken?: number;
}

type HealthPayload = {
    ok: boolean;
    hasApiKey: boolean;
};

const REFRESH_INTERVAL_MS = 30000;

const WorkspaceHealthPanel: React.FC<WorkspaceHealthPanelProps> = ({ currentLanguage = 'en', refreshToken = 0 }) => {
    const [health, setHealth] = useState<HealthPayload | null>(null);
    const [healthError, setHealthError] = useState<string | null>(null);
    const t = (key: string) => getTranslation(currentLanguage as Language, key);

    useEffect(() => {
        let isDisposed = false;

        const loadHealth = async () => {
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
            }
        };

        loadHealth();
        const intervalId = window.setInterval(loadHealth, REFRESH_INTERVAL_MS);

        return () => {
            isDisposed = true;
            window.clearInterval(intervalId);
        };
    }, [currentLanguage, refreshToken]);

    const headerStatusItems = [
        {
            key: 'local-api',
            testId: 'global-health-local-api',
            label: t('statusPanelLocalApi'),
            tone: healthError || health?.ok === false ? 'bg-red-500' : 'bg-emerald-500',
        },
        {
            key: 'gemini-key',
            testId: 'global-health-gemini-key',
            label: t('statusPanelGeminiKey'),
            tone: health && !health.hasApiKey ? 'bg-red-500' : 'bg-emerald-500',
        },
    ];

    return (
        <div data-testid="global-health-summary" className="flex items-center gap-1.5 sm:gap-2">
            {headerStatusItems.map((item) => (
                <div
                    key={item.key}
                    data-testid={item.testId}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200/80 bg-white/78 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-white/10 dark:bg-[#141922]/82 dark:text-slate-200 sm:px-2.5"
                    aria-label={item.label}
                >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${item.tone}`}></span>
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
};

export default WorkspaceHealthPanel;
