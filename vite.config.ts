import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { imageSavePlugin } from './plugins/imageSavePlugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const devPort = Number.parseInt(env.APP_DEV_PORT || '22287', 10);
    const isTest = mode === 'test';
    const outputDir = isTest ? path.resolve(__dirname, 'output-test') : path.resolve(__dirname, 'output');
    const resolvedApiKey = process.env.API_KEY || env.API_KEY || process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';
    // Dual-key routing: free-eligible models use the Free Tier key, paid-only features use the Paid Tier key.
    const resolvedPaidApiKey = process.env.GEMINI_PAID_API_KEY || env.GEMINI_PAID_API_KEY || '';
    const resolvedFreeApiKey = process.env.GEMINI_FREE_API_KEY || env.GEMINI_FREE_API_KEY || '';
    const resolvedFreeTierModels = process.env.GEMINI_FREE_TIER_MODELS || env.GEMINI_FREE_TIER_MODELS || '';
    const resolvedHost = process.env.NBU_DEV_HOST || env.NBU_DEV_HOST || '127.0.0.1';
    const resolvedPort = Number.isNaN(devPort) ? 22287 : devPort;

    return {
        server: {
            port: resolvedPort,
            host: resolvedHost,
        },
        preview: {
            port: resolvedPort,
            host: resolvedHost,
        },
        plugins: [
            react(),
            imageSavePlugin({
                geminiApiKey: resolvedApiKey,
                geminiPaidApiKey: resolvedPaidApiKey,
                geminiFreeApiKey: resolvedFreeApiKey,
                freeTierModels: resolvedFreeTierModels,
                outputDir,
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('/utils/translations/')) {
                            const match = id.match(/\/utils\/translations\/([^/]+)\.ts$/);

                            if (match) {
                                return `workspace-i18n-${match[1]}`;
                            }

                            return 'workspace-i18n';
                        }

                        if (id.includes('/utils/translations.ts')) {
                            return 'workspace-i18n';
                        }

                        if (id.includes('/hooks/')) {
                            return 'workspace-hooks';
                        }

                        if (id.includes('/constants/')) {
                            return 'workspace-constants';
                        }

                        if (id.includes('/utils/')) {
                            return 'workspace-utils';
                        }

                        if (id.includes('node_modules')) {
                            if (id.includes('react') || id.includes('scheduler')) {
                                return 'react-vendor';
                            }

                            return 'vendor';
                        }

                        return undefined;
                    },
                },
            },
        },
    };
});
