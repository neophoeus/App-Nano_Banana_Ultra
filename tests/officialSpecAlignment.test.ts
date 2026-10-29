import { describe, expect, it } from 'vitest';
import { MODEL_CAPABILITIES, VALID_IMAGE_SIZES } from '../utils/modelCapabilities';
import {
    buildImageRequestConfig as serverBuildImageRequestConfig,
    validateCapabilityRequest as serverValidateCapabilityRequest,
} from '../plugins/utils/requestConfig';
import { buildGenerateFileParts, buildGenerateParts } from '../plugins/utils/imageReferences';
import { PromptReferenceChips } from '../components/PromptReferenceChips';

describe('Official Gemini Nano Banana Spec Alignment', () => {
    describe('Resolution 512px normalization', () => {
        it('includes 512px and 512 in VALID_IMAGE_SIZES', () => {
            expect(VALID_IMAGE_SIZES.has('512px')).toBe(true);
            expect(VALID_IMAGE_SIZES.has('512')).toBe(true);
            expect(VALID_IMAGE_SIZES.has('1K')).toBe(true);
            expect(VALID_IMAGE_SIZES.has('2K')).toBe(true);
            expect(VALID_IMAGE_SIZES.has('4K')).toBe(true);
        });

        it('normalizes 512 to 512px in server buildImageRequestConfig', () => {
            const config512 = serverBuildImageRequestConfig('gemini-3.1-flash-image', {
                imageSize: '512',
                aspectRatio: '1:1',
            });
            expect((config512.requestConfig as any).imageConfig?.imageSize).toBe('512px');

            const config512px = serverBuildImageRequestConfig('gemini-3.1-flash-image', {
                imageSize: '512px',
                aspectRatio: '1:1',
            });
            expect((config512.requestConfig as any).imageConfig?.imageSize).toBe('512px');

            const config2k = serverBuildImageRequestConfig('gemini-3.1-flash-image', {
                imageSize: '2K',
                aspectRatio: '1:1',
            });
            expect((config2k.requestConfig as any).imageConfig?.imageSize).toBe('2K');
        });

        it('normalizes 512 to 512px in server buildImageRequestConfig', () => {
            const serverConfig = serverBuildImageRequestConfig('gemini-3.1-flash-image', {
                imageSize: '512',
                aspectRatio: '1:1',
                outputFormat: 'images-only',
                includeThoughts: true,
            });
            expect((serverConfig.requestConfig as any).imageConfig?.imageSize).toBe('512px');
        });
    });

    describe('Model Capabilities Matrix: Styles and Video', () => {
        it('configures gemini-3-pro-image with maxStyles 3 and supportsVideo false', () => {
            const caps = MODEL_CAPABILITIES['gemini-3-pro-image'];
            expect(caps.maxStyles).toBe(3);
            expect(caps.supportsVideo).toBe(false);
            expect(caps.maxObjects).toBe(6);
            expect(caps.maxCharacters).toBe(5);
        });

        it('configures Flash models with supportsVideo true and maxStyles 0', () => {
            const flash21 = MODEL_CAPABILITIES['gemini-nano-banana-2.1'];
            expect(flash21.maxStyles).toBe(0);
            expect(flash21.supportsVideo).toBe(true);

            const flash31 = MODEL_CAPABILITIES['gemini-3.1-flash-image'];
            expect(flash31.maxStyles).toBe(0);
            expect(flash31.supportsVideo).toBe(true);

            const flashLite = MODEL_CAPABILITIES['gemini-3.1-flash-lite-image'];
            expect(flashLite.maxStyles).toBe(0);
            expect(flashLite.supportsVideo).toBe(true);
        });

        it('configures gemini-2.5-flash-image with maxStyles 0 and supportsVideo false', () => {
            const flash25 = MODEL_CAPABILITIES['gemini-2.5-flash-image'];
            expect(flash25.maxStyles).toBe(0);
            expect(flash25.supportsVideo).toBe(false);
        });
    });

    describe('Style and Video Reference Capability Validation', () => {
        const dummyImage =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        it('accepts up to 3 style images on gemini-3-pro-image in capability validation', () => {
            const error = serverValidateCapabilityRequest('gemini-3-pro-image', {
                styleImageInputs: [dummyImage, dummyImage],
            });
            expect(error).toBeNull();
        });

        it('rejects style images exceeding 3 on gemini-3-pro-image in capability validation', () => {
            const error = serverValidateCapabilityRequest('gemini-3-pro-image', {
                styleImageInputs: [dummyImage, dummyImage, dummyImage, dummyImage],
            });
            expect(error).toMatch(/supports up to 3 style reference images/i);
        });

        it('rejects style images on models with maxStyles 0 in capability validation', () => {
            const error = serverValidateCapabilityRequest('gemini-3.1-flash-image', {
                styleImageInputs: [dummyImage],
            });
            expect(error).toMatch(/does not support style reference images/i);
        });

        it('accepts videoInput on models with supportsVideo true in capability validation', () => {
            const error = serverValidateCapabilityRequest('gemini-3.1-flash-image', {
                videoInput: 'https://www.youtube.com/watch?v=sample-video',
            });
            expect(error).toBeNull();
        });

        it('rejects videoInput on gemini-3-pro-image in capability validation', () => {
            const error = serverValidateCapabilityRequest('gemini-3-pro-image', {
                videoInput: 'https://www.youtube.com/watch?v=sample-video',
            });
            expect(error).toMatch(/does not support video/i);
        });

        it('validates style and video capability on server validation correctly', () => {
            const serverProValid = serverValidateCapabilityRequest('gemini-3-pro-image', {
                styleImageInputs: [dummyImage, dummyImage, dummyImage],
            });
            expect(serverProValid).toBeNull();

            const serverProOverlimit = serverValidateCapabilityRequest('gemini-3-pro-image', {
                styleImageInputs: [dummyImage, dummyImage, dummyImage, dummyImage],
            });
            expect(serverProOverlimit).toMatch(/supports up to 3 style reference images/i);

            const serverFlashNoStyle = serverValidateCapabilityRequest('gemini-3.1-flash-image', {
                styleImageInputs: [dummyImage],
            });
            expect(serverFlashNoStyle).toMatch(/does not support style reference images/i);

            const serverFlashVideo = serverValidateCapabilityRequest('gemini-3.1-flash-image', {
                videoInput: 'https://www.youtube.com/watch?v=valid-video',
            });
            expect(serverFlashVideo).toBeNull();

            const serverProVideo = serverValidateCapabilityRequest('gemini-3-pro-image', {
                videoInput: 'https://www.youtube.com/watch?v=pro-video',
            });
            expect(serverProVideo).toMatch(/does not support video/i);
        });
    });

    describe('Parts Construction for Style and Video', () => {
        const dummyDataUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        it('buildGenerateParts injects [Style_N] tag and inlineData for styles', () => {
            const parts = buildGenerateParts(
                {
                    prompt: 'A painting of a cat',
                    styleImageInputs: [dummyDataUrl],
                },
                process.cwd(),
            );

            const styleTagPart = parts.find((p) => (p as any).text === '[Style_1]');
            expect(styleTagPart).toBeDefined();

            const inlineParts = parts.filter((p) => (p as any).inlineData);
            expect(inlineParts.length).toBe(1);

            const promptPart = parts.find((p) => (p as any).text === 'A painting of a cat');
            expect(promptPart).toBeDefined();
        });

        it('buildGenerateParts injects videoInput URI parts', () => {
            const parts = buildGenerateParts(
                {
                    prompt: 'Design a movie poster',
                    videoInput: 'https://www.youtube.com/watch?v=sample',
                },
                process.cwd(),
            );

            const videoFilePart = parts.find(
                (p) => (p as any).fileData?.fileUri === 'https://www.youtube.com/watch?v=sample',
            );
            expect(videoFilePart).toBeDefined();
            expect((videoFilePart as any).fileData?.mimeType).toBe('video/mp4');

            const promptPart = parts.find((p) => (p as any).text === 'Design a movie poster');
            expect(promptPart).toBeDefined();
        });

        it('buildGenerateFileParts includes style files and video files', async () => {
            const mockResolveFile = async () => ({
                filePath: '/tmp/dummy.png',
                mimeType: 'image/png',
                cleanup: () => {},
            });

            const parts = await buildGenerateFileParts(
                {
                    prompt: 'A portrait with custom style',
                    styleImageInputs: [dummyDataUrl],
                    videoInput: 'https://youtube.com/watch?v=sample',
                },
                mockResolveFile,
            );

            const styleTagPart = parts.find((p) => (p as any).text === '[Style_1]');
            expect(styleTagPart).toBeDefined();

            const videoPart = parts.find((p) => (p as any).fileData?.fileUri === 'https://youtube.com/watch?v=sample');
            expect(videoPart).toBeDefined();

            const promptPart = parts.find((p) => (p as any).text === 'A portrait with custom style');
            expect(promptPart).toBeDefined();
        });
    });
});
