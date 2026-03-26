import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { imageSavePlugin } from './plugins/imageSavePlugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const devPort = Number.parseInt(env.APP_DEV_PORT || '22287', 10);

    return {
        server: {
            port: Number.isNaN(devPort) ? 22287 : devPort,
            host: '0.0.0.0',
        },
        plugins: [react(), imageSavePlugin({ geminiApiKey: env.GEMINI_API_KEY })],
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
        test: {
            setupFiles: ['./tests/setupTranslations.ts'],
        },
    };
});
