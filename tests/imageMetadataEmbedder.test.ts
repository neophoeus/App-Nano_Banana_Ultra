import { describe, expect, it } from 'vitest';
import {
    crc32,
    createITXtChunk,
    formatParametersText,
    embedPngMetadata,
    embedJpegMetadata,
    embedImageMetadata,
    createJpegComSegment,
    serializeMetaForJpegCom,
    readImageMetadata,
    type EmbeddedNanoBananaMeta,
} from '../plugins/utils/imageMetadataEmbedder';

// Minimal valid PNG buffer (1x1 pixel)
const create1x1PngBuffer = (): Buffer => {
    // 8 bytes signature + IHDR chunk (13 bytes data + 12 header/crc) + IDAT chunk (12 bytes) + IEND chunk (12 bytes)
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(1, 0); // width 1
    ihdrData.writeUInt32BE(1, 4); // height 1
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 2; // color type (truecolor)
    const ihdrTypeAndData = Buffer.concat([Buffer.from('IHDR', 'ascii'), ihdrData]);
    const ihdrCrc = crc32(ihdrTypeAndData);
    const ihdrChunk = Buffer.alloc(8 + 13 + 4);
    ihdrChunk.writeUInt32BE(13, 0);
    ihdrTypeAndData.copy(ihdrChunk, 4);
    ihdrChunk.writeUInt32BE(ihdrCrc, 8 + 13);

    // IDAT (minimal empty/dummy)
    const idatData = Buffer.from([0x78, 0x9C, 0x62, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]);
    const idatTypeAndData = Buffer.concat([Buffer.from('IDAT', 'ascii'), idatData]);
    const idatCrc = crc32(idatTypeAndData);
    const idatChunk = Buffer.alloc(8 + idatData.length + 4);
    idatChunk.writeUInt32BE(idatData.length, 0);
    idatTypeAndData.copy(idatChunk, 4);
    idatChunk.writeUInt32BE(idatCrc, 8 + idatData.length);

    // IEND
    const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
};

// Minimal valid JPEG buffer
const createMinimalJpegBuffer = (): Buffer => {
    // SOI (FF D8) + APP0 (FF E0 00 10 4A 46 49 46 ...) + DQT / SOF0 / EOI (FF D9)
    return Buffer.from([
        0xFF, 0xD8, // SOI
        0xFF, 0xE0, 0x00, 0x10, // APP0 len 16
        0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        0xFF, 0xD9, // EOI
    ]);
};

describe('imageMetadataEmbedder', () => {
    const sampleMeta: EmbeddedNanoBananaMeta = {
        id: 'turn-12345',
        prompt: 'A golden banana wearing sunglasses on Mars',
        model: 'gemini-3.1-flash-image',
        aspectRatio: '1:1',
        size: '1K',
        style: 'Cyberpunk',
        mode: 'Text to Image',
        executionMode: 'single-turn',
        temperature: 1.0,
        thinkingLevel: 'medium',
        thoughts: 'Brainstorming futuristic reflections on Martian soil.',
        text: 'Generated Martian Banana successfully.',
        exportSourceType: 'product',
        parentHistoryId: 'turn-12345',
        createdAt: '2026-10-28T12:00:00.000Z',
    };

    it('calculates standard CRC-32 checksum correctly', () => {
        const testBuf = Buffer.from('123456789', 'ascii');
        expect(crc32(testBuf)).toBe(0xCBF43926);
    });

    it('creates well-formed PNG iTXt chunk', () => {
        const chunk = createITXtChunk('parameters', 'Hello World');
        expect(chunk.length).toBe(4 + 4 + (10 + 5 + 11) + 4);
        expect(chunk.subarray(4, 8).toString('ascii')).toBe('iTXt');
        expect(chunk.subarray(8, 18).toString('utf8')).toBe('parameters');
        expect(chunk[18]).toBe(0); // null separator
        expect(chunk[19]).toBe(0); // compFlag
        expect(chunk[20]).toBe(0); // compMethod
    });

    it('formats WebUI-compatible parameters text', () => {
        const text = formatParametersText(sampleMeta);
        expect(text).toContain('A golden banana wearing sunglasses on Mars');
        expect(text).toContain('Model: gemini-3.1-flash-image');
        expect(text).toContain('Style: Cyberpunk');
        expect(text).toContain('Aspect Ratio: 1:1');
        expect(text).toContain('[Thoughts]:\nBrainstorming futuristic reflections on Martian soil.');
        expect(text).toContain('[Response]:\nGenerated Martian Banana successfully.');
    });

    it('embeds iTXt chunks into PNG right before IEND and preserves validity', () => {
        const originalPng = create1x1PngBuffer();
        const modifiedPng = embedPngMetadata(originalPng, sampleMeta);

        expect(modifiedPng.length).toBeGreaterThan(originalPng.length);
        // Signature check
        expect(modifiedPng.subarray(0, 8)).toEqual(originalPng.subarray(0, 8));
        // IEND must still be at the very end
        const iend = modifiedPng.subarray(modifiedPng.length - 12);
        expect(iend.subarray(4, 8).toString('ascii')).toBe('IEND');

        // Check that 'parameters' and 'nano_banana_meta' iTXt chunks are present
        const pngStr = modifiedPng.toString('binary');
        expect(pngStr).toContain('parameters');
        expect(pngStr).toContain('nano_banana_meta');
        expect(pngStr).toContain('A golden banana wearing sunglasses on Mars');
    });

    it('embeds COM segments into JPEG after APP0 and preserves SOI/EOI', () => {
        const originalJpeg = createMinimalJpegBuffer();
        const modifiedJpeg = embedJpegMetadata(originalJpeg, sampleMeta);

        expect(modifiedJpeg.length).toBeGreaterThan(originalJpeg.length);
        // SOI check
        expect(modifiedJpeg[0]).toBe(0xFF);
        expect(modifiedJpeg[1]).toBe(0xD8);
        // EOI check
        expect(modifiedJpeg[modifiedJpeg.length - 2]).toBe(0xFF);
        expect(modifiedJpeg[modifiedJpeg.length - 1]).toBe(0xD9);

        // Check COM markers (0xFF 0xFE)
        let foundCom = false;
        for (let i = 0; i < modifiedJpeg.length - 4; i++) {
            if (modifiedJpeg[i] === 0xFF && modifiedJpeg[i + 1] === 0xFE) {
                foundCom = true;
                break;
            }
        }
        expect(foundCom).toBe(true);

        const jpegStr = modifiedJpeg.toString('utf8');
        expect(jpegStr).toContain('parameters\n');
        expect(jpegStr).toContain('nano_banana_meta\n');
        expect(jpegStr).toContain('A golden banana wearing sunglasses on Mars');
    });

    it('safely trims oversized metadata when serializing for JPEG COM', () => {
        const hugeMeta: EmbeddedNanoBananaMeta = {
            ...sampleMeta,
            thoughts: 'X'.repeat(80000), // Larger than JPEG 65535 byte COM limit
            text: 'Y'.repeat(50000),
        };

        const jsonStr = serializeMetaForJpegCom(hugeMeta, 65510);
        const byteLen = Buffer.byteLength(jsonStr, 'utf8');
        expect(byteLen).toBeLessThanOrEqual(65510);

        const parsed = JSON.parse(jsonStr);
        expect(parsed.id).toBe('turn-12345');
        expect(parsed.prompt).toBe('A golden banana wearing sunglasses on Mars');
        expect(parsed._truncated).toBe(true);
    });

    it('embedImageMetadata automatically detects format by Magic Bytes', () => {
        const png = create1x1PngBuffer();
        const jpeg = createMinimalJpegBuffer();
        const dummyText = Buffer.from('Not an image', 'utf8');

        const taggedPng = embedImageMetadata(png, sampleMeta);
        expect(taggedPng.toString('binary')).toContain('iTXt');

        const taggedJpeg = embedImageMetadata(jpeg, sampleMeta);
        expect(taggedJpeg.toString('utf8')).toContain('parameters\n');

        const untouched = embedImageMetadata(dummyText, sampleMeta);
        expect(untouched).toEqual(dummyText);
    });

    it('ensures embedding is idempotent and does not accumulate duplicate chunks on re-export', () => {
        const png = create1x1PngBuffer();
        const firstPass = embedPngMetadata(png, sampleMeta);
        const secondPass = embedPngMetadata(firstPass, {
            ...sampleMeta,
            prompt: 'Updated prompt on re-export',
        });

        // The second pass should replace previous chunks, so length should be approximately equal
        expect(Math.abs(secondPass.length - firstPass.length)).toBeLessThan(50);
        const readMeta = readImageMetadata(secondPass);
        expect(readMeta.parameters).toContain('Updated prompt on re-export');
        expect(readMeta.parameters).not.toContain('A golden banana wearing sunglasses on Mars');

        const jpeg = createMinimalJpegBuffer();
        const firstJpeg = embedJpegMetadata(jpeg, sampleMeta);
        const secondJpeg = embedJpegMetadata(firstJpeg, {
            ...sampleMeta,
            prompt: 'Updated prompt on re-export JPEG',
        });
        const readJpegMeta = readImageMetadata(secondJpeg);
        expect(readJpegMeta.parameters).toContain('Updated prompt on re-export JPEG');
        expect(readJpegMeta.parameters).not.toContain('A golden banana wearing sunglasses on Mars');
    });
});
