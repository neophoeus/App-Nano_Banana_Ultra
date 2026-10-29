/** @vitest-environment jsdom */

// @ts-expect-error react-dom act test environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import OptimizationModeToggle from '../components/OptimizationModeToggle';
import { WorkspaceFloatingLayerContext } from '../components/WorkspaceFloatingLayerContext';
import { getTranslation, Language, preloadAllTranslations } from '../utils/translations';

describe('OptimizationModeToggle', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeAll(async () => {
        await preloadAllTranslations();
    });

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
    });

    it('renders quality (default) and eco mode buttons with sliding thumb and active states', () => {
        const handleChange = vi.fn();
        act(() => {
            root.render(
                <OptimizationModeToggle
                    optimizationMode="quality"
                    onOptimizationModeChange={handleChange}
                    currentLanguage="zh_TW"
                />,
            );
        });

        const control = container.querySelector('[data-testid="optimization-mode-control"]');
        const toggle = container.querySelector('[data-testid="optimization-mode-toggle"]');
        const thumb = container.querySelector('[data-testid="optimization-mode-thumb"]');
        const qualityBtn = container.querySelector('[data-testid="optimization-mode-option-quality"]');
        const ecoBtn = container.querySelector('[data-testid="optimization-mode-option-eco"]');

        expect(control).not.toBeNull();
        expect(toggle).not.toBeNull();
        expect(thumb).not.toBeNull();
        expect(qualityBtn).not.toBeNull();
        expect(ecoBtn).not.toBeNull();

        expect(toggle?.getAttribute('data-active-mode')).toBe('quality');
        expect(toggle?.getAttribute('aria-pressed')).toBe('false');
        expect(toggle?.className).toContain('grid-cols-[1fr_1fr]');
        expect(qualityBtn?.getAttribute('aria-checked')).toBe('true');
        expect(ecoBtn?.getAttribute('aria-checked')).toBe('false');
        expect(qualityBtn?.textContent).toContain('品質');
        expect(ecoBtn?.textContent).toContain('節流');

        // Switch to eco mode
        act(() => {
            root.render(
                <OptimizationModeToggle
                    optimizationMode="eco"
                    onOptimizationModeChange={handleChange}
                    currentLanguage="zh_TW"
                />,
            );
        });

        expect(toggle?.getAttribute('data-active-mode')).toBe('eco');
        expect(toggle?.getAttribute('aria-pressed')).toBe('true');
        expect(qualityBtn?.getAttribute('aria-checked')).toBe('false');
        expect(ecoBtn?.getAttribute('aria-checked')).toBe('true');
    });

    it('triggers onOptimizationModeChange callback when mode buttons are clicked', () => {
        const handleChange = vi.fn();
        act(() => {
            root.render(
                <OptimizationModeToggle
                    optimizationMode="quality"
                    onOptimizationModeChange={handleChange}
                    currentLanguage="en"
                />,
            );
        });

        const ecoBtn = container.querySelector('[data-testid="optimization-mode-option-eco"]') as HTMLButtonElement;
        act(() => {
            ecoBtn.click();
        });
        expect(handleChange).toHaveBeenCalledWith('eco');

        const qualityBtn = container.querySelector(
            '[data-testid="optimization-mode-option-quality"]',
        ) as HTMLButtonElement;
        act(() => {
            qualityBtn.click();
        });
        expect(handleChange).toHaveBeenCalledWith('quality');
    });

    it('also supports legacy mode and onChange props for backward compatibility', () => {
        const handleChange = vi.fn();
        act(() => {
            root.render(<OptimizationModeToggle mode="quality" onChange={handleChange} currentLanguage="en" />);
        });

        const ecoBtn = container.querySelector('[data-testid="optimization-mode-option-eco"]') as HTMLButtonElement;
        act(() => {
            ecoBtn.click();
        });
        expect(handleChange).toHaveBeenCalledWith('eco');
    });

    it('toggles the info dialog card on circular i button click, and closes via close button and escape', () => {
        act(() => {
            root.render(
                <OptimizationModeToggle
                    optimizationMode="quality"
                    onOptimizationModeChange={vi.fn()}
                    currentLanguage="zh_TW"
                />,
            );
        });

        const infoBtn = container.querySelector('[data-testid="optimization-mode-info-trigger"]') as HTMLButtonElement;
        expect(infoBtn.getAttribute('aria-haspopup')).toBe('dialog');
        expect(container.querySelector('[data-testid="optimization-mode-info-card"]')).toBeNull();

        // Open dialog
        act(() => {
            infoBtn.click();
        });
        const dialog = container.querySelector('[data-testid="optimization-mode-info-card"]');
        expect(dialog).not.toBeNull();
        expect(dialog?.textContent).toContain('最佳化模式說明');
        expect(dialog?.textContent).toContain('使用情境：');
        expect(dialog?.textContent).toContain('品質模式（預設）');
        expect(dialog?.textContent).toContain('節流模式');
        expect(dialog?.textContent).toContain(
            '不會強制更動您自選的輸出解析度（1K／2K／4K）；若追求極致省流，建議手動將輸出尺寸改為 1K。',
        );

        // Close via close button
        const closeBtn = container.querySelector(
            '[data-testid="optimization-mode-dialog-close-btn"]',
        ) as HTMLButtonElement;
        expect(closeBtn.getAttribute('aria-label')).toBe('關閉');
        act(() => {
            closeBtn.click();
        });
        expect(container.querySelector('[data-testid="optimization-mode-info-card"]')).toBeNull();

        // Re-open and close via Escape
        act(() => {
            infoBtn.click();
        });
        expect(container.querySelector('[data-testid="optimization-mode-info-card"]')).not.toBeNull();

        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });
        expect(container.querySelector('[data-testid="optimization-mode-info-card"]')).toBeNull();
    });

    it('renders inside WorkspaceFloatingLayerContext Portal when available and handles outside clicks', () => {
        const portalHost = document.createElement('div');
        portalHost.setAttribute('data-testid', 'test-portal-host');
        document.body.appendChild(portalHost);

        act(() => {
            root.render(
                <WorkspaceFloatingLayerContext.Provider value={{ hostElement: portalHost, floatingZIndex: 85 }}>
                    <OptimizationModeToggle
                        optimizationMode="quality"
                        onOptimizationModeChange={vi.fn()}
                        currentLanguage="en"
                    />
                </WorkspaceFloatingLayerContext.Provider>,
            );
        });

        const infoBtn = container.querySelector('[data-testid="optimization-mode-info-trigger"]') as HTMLButtonElement;

        // Open dialog in portal
        act(() => {
            infoBtn.click();
        });

        // The card should be in portalHost, NOT directly inside container
        expect(container.querySelector('[data-testid="optimization-mode-info-card"]')).toBeNull();
        const dialogInPortal = portalHost.querySelector('[data-testid="optimization-mode-info-card"]');
        expect(dialogInPortal).not.toBeNull();

        // Outside click closes dialog
        act(() => {
            document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        });
        expect(portalHost.querySelector('[data-testid="optimization-mode-info-card"]')).toBeNull();

        portalHost.remove();
    });

    it('ensures zero CJK characters in non-CJK languages (en, de, es, fr, ru) to prevent mixed-language regressions', () => {
        const nonCjkLanguages: Language[] = ['en', 'de', 'es', 'fr', 'ru'];

        for (const lang of nonCjkLanguages) {
            act(() => {
                root.render(
                    <OptimizationModeToggle
                        optimizationMode="quality"
                        onOptimizationModeChange={vi.fn()}
                        currentLanguage={lang}
                    />,
                );
            });

            const infoBtn = container.querySelector(
                '[data-testid="optimization-mode-info-trigger"]',
            ) as HTMLButtonElement;
            act(() => {
                infoBtn.click();
            });

            const dialog = container.querySelector('[data-testid="optimization-mode-info-card"]') as HTMLDivElement;
            expect(dialog).not.toBeNull();

            const text = dialog.textContent || '';
            const cjkMatch = text.match(/[\u4e00-\u9fff]/g);
            expect(
                cjkMatch,
                `Language "${lang}" contains unexpected CJK characters: ${JSON.stringify(cjkMatch)} in text: "${text}"`,
            ).toBeNull();

            const useCasesLabel = getTranslation(lang, 'optimizationModeUseCasesLabel');
            expect(text).toContain(useCasesLabel);

            const closeBtn = container.querySelector(
                '[data-testid="optimization-mode-dialog-close-btn"]',
            ) as HTMLButtonElement;
            expect(closeBtn.getAttribute('aria-label')).toBe(getTranslation(lang, 'workspaceViewerClose'));

            // Close dialog
            act(() => {
                closeBtn.click();
            });
        }
    });

    it('contains zero non-banana emojis in toggle and dialog', () => {
        act(() => {
            root.render(
                <OptimizationModeToggle
                    optimizationMode="quality"
                    onOptimizationModeChange={vi.fn()}
                    currentLanguage="zh_TW"
                />,
            );
        });

        const infoBtn = container.querySelector('[data-testid="optimization-mode-info-trigger"]') as HTMLButtonElement;
        act(() => {
            infoBtn.click();
        });

        const textContent = container.innerHTML;
        const matches = textContent.match(/\p{Extended_Pictographic}|\p{Regional_Indicator}/gu) || [];
        expect(matches).toEqual([]);
    });
});
