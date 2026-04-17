/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePromptTools } from '../hooks/usePromptTools';

const { enhancePromptWithGeminiMock, generatePromptFromImageMock, generateRandomPromptMock } = vi.hoisted(() => ({
    enhancePromptWithGeminiMock: vi.fn(),
    generatePromptFromImageMock: vi.fn(),
    generateRandomPromptMock: vi.fn(),
}));

const { prepareImageAssetFromFileMock } = vi.hoisted(() => ({
    prepareImageAssetFromFileMock: vi.fn(),
}));

vi.mock('../services/geminiService', () => ({
    enhancePromptWithGemini: enhancePromptWithGeminiMock,
    generatePromptFromImage: generatePromptFromImageMock,
    generateRandomPrompt: generateRandomPromptMock,
}));

vi.mock('../utils/imageSaveUtils', () => ({
    prepareImageAssetFromFile: prepareImageAssetFromFileMock,
}));

type HookHandle = ReturnType<typeof usePromptTools>;

describe('usePromptTools', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latestHook: HookHandle | null;
    let prompt = '';
    let logs: string[];
    let notifications: Array<{ message: string; type: 'info' | 'error' }>;

    const renderHook = (currentLanguage: 'en' | 'es' | 'zh_TW' = 'en') => {
        function Harness() {
            latestHook = usePromptTools({
                currentLanguage,
                prompt,
                setPrompt: (value) => {
                    prompt = typeof value === 'function' ? value(prompt) : value;
                },
                addLog: (message) => {
                    logs.push(message);
                },
                showNotification: (message, type) => {
                    notifications.push({ message, type });
                },
                t: (key) => {
                    const translations: Record<string, string> = {
                        errEnterIdea: 'Enter an idea.',
                        errInvalidImage: 'Invalid image.',
                        logRewriteOk: 'Rewrite ok.',
                        logRewriteFailed: 'Rewrite failed.',
                        logImageToPromptOk: 'Image prompt ok.',
                        logImageToPromptFailed: 'Image prompt failed.',
                        logRandomOk: 'Random ok.',
                        logRandomFailed: 'Random failed.',
                    };
                    return translations[key] || key;
                },
                apiKeyReady: true,
                handleApiKeyConnect: vi.fn().mockResolvedValue(true),
            });
            return null;
        }

        act(() => {
            root.render(<Harness />);
        });
    };

    beforeEach(() => {
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        latestHook = null;
        prompt = '';
        logs = [];
        notifications = [];
        enhancePromptWithGeminiMock.mockReset();
        generatePromptFromImageMock.mockReset();
        generateRandomPromptMock.mockReset();
        prepareImageAssetFromFileMock.mockReset();
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    });

    it('rejects empty rewrites and reports the translated error', async () => {
        renderHook();

        await act(async () => {
            await latestHook?.handleSmartRewrite();
        });

        expect(notifications).toEqual([{ message: 'Enter an idea.', type: 'error' }]);
        expect(enhancePromptWithGeminiMock).not.toHaveBeenCalled();
    });

    it('uses the current language code for rewrite and surprise actions and keeps rich direct prompt text intact', async () => {
        prompt = 'hola mundo';
        const rewrittenPrompt =
            'Un viajero solitario con abrigo oscuro empapado y rasgos definidos permanece bajo la lluvia en una calle nocturna iluminada por neon.\nPlano medio cinematografico con reflejos sobre el asfalto mojado, contraluz azul, borde de luz calida, atmosfera melancolica, textura humeda detallada y un acabado realista pulido.';
        const randomPrompt =
            'Una mensajera futurista gira sobre una azotea cyberpunk mientras sostiene un paquete, con visera luminosa, chaqueta tecnica con detalles holograficos y anuncios de neon.\nVapor urbano, concreto mojado, contrapicado dinamico, brillo azul magenta, textura metalica humeda, alto contraste y una atmosfera sci-fi audaz e inmersiva.';
        enhancePromptWithGeminiMock.mockResolvedValue(rewrittenPrompt);
        generateRandomPromptMock.mockResolvedValue(randomPrompt);
        renderHook('es');

        await act(async () => {
            await latestHook?.handleSmartRewrite();
        });
        expect(enhancePromptWithGeminiMock).toHaveBeenCalledWith('hola mundo', 'es');
        expect(prompt).toBe(rewrittenPrompt);

        await act(async () => {
            await latestHook?.handleSurpriseMe();
        });
        expect(generateRandomPromptMock).toHaveBeenCalledWith('es');
        expect(prompt).toBe(randomPrompt);
        expect(logs).toEqual(['Rewrite ok.', 'Random ok.']);
    });

    it('tracks the active quick tool while rewrite is running', async () => {
        let resolveRewrite: ((value: string) => void) | null = null;
        let pendingRewrite: Promise<void> | undefined;

        prompt = '一隻猴子';
        enhancePromptWithGeminiMock.mockImplementation(
            () =>
                new Promise<string>((resolve) => {
                    resolveRewrite = resolve;
                }),
        );
        renderHook('zh_TW');

        expect(latestHook?.activePromptTool).toBeNull();

        act(() => {
            pendingRewrite = latestHook!.handleSmartRewrite();
        });

        expect(latestHook?.activePromptTool).toBe('rewrite');

        await act(async () => {
            resolveRewrite?.('優化後提示詞');
            await pendingRewrite;
        });

        expect(latestHook?.activePromptTool).toBeNull();
        expect(prompt).toBe('優化後提示詞');
    });

    it('rejects non-image files before hitting the image-to-prompt service', async () => {
        renderHook();

        await act(async () => {
            await latestHook?.handleImageToPrompt(new File(['hello'], 'notes.txt', { type: 'text/plain' }));
        });

        expect(notifications).toEqual([{ message: 'Invalid image.', type: 'error' }]);
        expect(prepareImageAssetFromFileMock).not.toHaveBeenCalled();
        expect(generatePromptFromImageMock).not.toHaveBeenCalled();
    });

    it('uses the current language code for image-to-prompt generation and replaces the prompt', async () => {
        const imageFile = new File(['img'], 'reference.png', { type: 'image/png' });
        const imagePrompt =
            'Vista general de la escena\nRetrato cinematografico interior de una mujer joven en un entorno limpio y contenido, con una presencia serena y una puesta en escena enfocada totalmente en la figura principal. El fondo permanece discreto y subordinado a la construccion visual del retrato.\n\nSujetos y composicion\nLa mujer ocupa el plano medio con rasgos definidos, postura estable y una conexion visual directa con la camara, manteniendo una composicion sobria y equilibrada. El encuadre concentra el peso visual en el rostro, el torso y la direccion de la mirada.\n\nDetalles visuales\nAbrigo oscuro elegante, textura limpia de piel y tela, cabello bien definido y fondo suavemente difuminado para mantener el foco total en el sujeto. El tejido del abrigo conserva una caida controlada y un acabado pulido, mientras el rostro muestra transiciones suaves y bordes limpios.\n\nIluminacion y color\nLuz lateral suave, contraste frio-calido y transiciones tonales delicadas que modelan el rostro y separan al sujeto del fondo. La relacion entre las sombras blandas y los reflejos discretos sostiene una lectura refinada y cinematografica.\n\nAmbiente y estilo\nAtmosfera refinada, realismo contemporaneo y acabado de retrato editorial cinematografico. El conjunto sugiere una direccion visual elegante, controlada y moderna.\n\nPrompt final\nRetrato cinematografico interior de una mujer joven con rasgos definidos y mirada directa, encuadre de plano medio sobrio y equilibrado, abrigo oscuro elegante con textura pulida, cabello bien definido, fondo limpio suavemente difuminado, luz lateral suave, contraste frio-calido, transiciones tonales delicadas, realismo contemporaneo y acabado editorial cinematografico refinado.';
        prepareImageAssetFromFileMock.mockResolvedValue({
            dataUrl: 'data:image/png;base64,AAA',
            wasResized: false,
            width: 1,
            height: 1,
            mimeType: 'image/png',
        });
        generatePromptFromImageMock.mockResolvedValue(imagePrompt);
        renderHook('es');

        await act(async () => {
            await latestHook?.handleImageToPrompt(imageFile);
        });

        expect(prepareImageAssetFromFileMock).toHaveBeenCalledWith(imageFile, 2048);
        expect(generatePromptFromImageMock).toHaveBeenCalledWith('data:image/png;base64,AAA', 'es');
        expect(prompt).toBe(imagePrompt);
        expect(logs).toEqual(['Image prompt ok.']);
    });
});
