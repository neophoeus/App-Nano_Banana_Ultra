/**
 * imageEmbeddedMetadataReader.ts
 * Pure Web API & Node.js compatible PNG & JPEG metadata extractor.
 * Reads embedded iTXt/tEXt chunks and JPEG COM comments, parses Nano Banana metadata,
 * Civitai/A1111 parameter strings, and sidecar JSON data.
 */

import {
    AspectRatio,
    GeneratedImage,
    ImageModel,
    ImageSize,
    ImageStyle,
    ViewerComposerSettingsSnapshot,
} from '../types';
import { IMAGE_MODELS } from './modelCapabilities';
import { buildViewerComposerSettingsSnapshot } from './viewerComposerSettings';

export type RawImageEmbeddedMetadata = Record<string, string>;

export interface ParsedParametersData {
    prompt: string;
    negativePrompt?: string;
    params: Record<string, string>;
}

export interface NanoBananaMetadataPayload {
    id?: string;
    prompt?: string;
    model?: string;
    style?: string;
    aspectRatio?: string;
    size?: string;
    requestedImageSize?: string;
    outputFormat?: string;
    actualOutput?: unknown;
    mode?: string;
    executionMode?: string;
    lineageAction?: string;
    groundingMode?: string;
    googleSearch?: boolean;
    imageSearch?: boolean;
    temperature?: number;
    thinkingLevel?: string;
    includeThoughts?: boolean;
    createdAt?: string;
    timestamp?: number;
    text?: string | null;
    thoughts?: string | null;
    groundingSources?: Array<{ title?: string; url?: string }>;
    batchSize?: number;
    [key: string]: unknown;
}

/**
 * Parse PNG metadata (tEXt and uncompressed iTXt chunks) using standard ArrayBuffer & DataView.
 */
export function parsePngMetadata(arrayBuffer: ArrayBuffer): RawImageEmbeddedMetadata {
    const uint8 = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const metadata: RawImageEmbeddedMetadata = {};

    // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
        uint8.length < 8 ||
        uint8[0] !== 0x89 ||
        uint8[1] !== 0x50 ||
        uint8[2] !== 0x4e ||
        uint8[3] !== 0x47 ||
        uint8[4] !== 0x0d ||
        uint8[5] !== 0x0a ||
        uint8[6] !== 0x1a ||
        uint8[7] !== 0x0a
    ) {
        return metadata;
    }

    let pos = 8;
    const len = uint8.length;
    const textDecoder = new TextDecoder('utf-8');

    while (pos + 8 <= len) {
        const chunkLen = view.getUint32(pos);
        let chunkType = '';
        for (let i = 0; i < 4; i++) {
            chunkType += String.fromCharCode(uint8[pos + 4 + i]);
        }
        const dataStart = pos + 8;
        const dataEnd = dataStart + chunkLen;

        if (dataEnd + 4 > len) {
            break;
        }

        if (chunkType === 'tEXt') {
            const chunkData = uint8.subarray(dataStart, dataEnd);
            const nullIdx = chunkData.indexOf(0x00);
            if (nullIdx > 0) {
                const keyword = textDecoder.decode(chunkData.subarray(0, nullIdx));
                const text = textDecoder.decode(chunkData.subarray(nullIdx + 1));
                metadata[keyword] = text;
            }
        } else if (chunkType === 'iTXt') {
            const chunkData = uint8.subarray(dataStart, dataEnd);
            const null1 = chunkData.indexOf(0x00, 0);
            if (null1 > 0) {
                const keyword = textDecoder.decode(chunkData.subarray(0, null1));
                let idx = null1 + 1;
                if (idx + 2 <= chunkData.length) {
                    const compFlag = chunkData[idx];
                    idx += 2; // compFlag(1) + compMethod(1)

                    // Skip language tag
                    const null2 = chunkData.indexOf(0x00, idx);
                    if (null2 !== -1) {
                        idx = null2 + 1;
                        // Skip translated keyword
                        const null3 = chunkData.indexOf(0x00, idx);
                        if (null3 !== -1) {
                            idx = null3 + 1;
                            const textBytes = chunkData.subarray(idx);
                            let text = '';
                            if (compFlag === 0) {
                                text = textDecoder.decode(textBytes);
                            } else {
                                // Fallback decode if compressed
                                try {
                                    text = textDecoder.decode(textBytes);
                                } catch {
                                    text = '';
                                }
                            }
                            metadata[keyword] = text;
                        }
                    }
                }
            }
        } else if (chunkType === 'IEND') {
            break;
        }

        pos += 12 + chunkLen;
    }

    return metadata;
}

/**
 * Parse JPEG COM (Comment 0xFF 0xFE) segments using standard ArrayBuffer & DataView.
 */
export function parseJpegMetadata(arrayBuffer: ArrayBuffer): RawImageEmbeddedMetadata {
    const uint8 = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const metadata: RawImageEmbeddedMetadata = {};

    // Check JPEG SOI: FF D8
    if (uint8.length < 4 || uint8[0] !== 0xff || uint8[1] !== 0xd8) {
        return metadata;
    }

    let pos = 2;
    const len = uint8.length;
    const textDecoder = new TextDecoder('utf-8');

    while (pos + 4 <= len) {
        if (uint8[pos] !== 0xff) {
            pos++;
            continue;
        }

        while (pos < len && uint8[pos] === 0xff) {
            pos++;
        }
        if (pos >= len) break;

        const marker = uint8[pos++];

        if (marker === 0xd9 || marker === 0xda) {
            break; // EOI or SOS
        }
        if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x00) {
            continue;
        }

        if (pos + 2 > len) break;
        const segLen = view.getUint16(pos);
        if (segLen < 2 || pos + segLen > len) {
            break;
        }

        const payloadStart = pos + 2;
        const payloadEnd = pos + segLen;

        if (marker === 0xfe) {
            // COM segment
            const text = textDecoder.decode(uint8.subarray(payloadStart, payloadEnd));
            const newlineIdx = text.indexOf('\n');
            if (newlineIdx !== -1) {
                const prefix = text.substring(0, newlineIdx).trim();
                const content = text.substring(newlineIdx + 1);
                if (prefix === 'nano_banana_meta' || prefix === 'parameters') {
                    metadata[prefix] = content;
                } else {
                    metadata[prefix || 'comment'] = content;
                }
            } else {
                metadata['comment'] = text;
            }
        }

        pos += segLen;
    }

    return metadata;
}

/**
 * Parse image metadata automatically inspecting PNG or JPEG headers.
 */
export function parseImageEmbeddedMetadata(arrayBuffer: ArrayBuffer): RawImageEmbeddedMetadata {
    const uint8 = new Uint8Array(arrayBuffer);
    if (uint8.length < 4) {
        return {};
    }

    // PNG signature: 89 50 4E 47
    if (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e && uint8[3] === 0x47) {
        return parsePngMetadata(arrayBuffer);
    }

    // JPEG signature: FF D8
    if (uint8[0] === 0xff && uint8[1] === 0xd8) {
        return parseJpegMetadata(arrayBuffer);
    }

    return {};
}

/**
 * Parse standard A1111 / Civitai parameter string into structured prompt and parameter dictionary.
 */
export function parseParametersString(rawParameters: string): ParsedParametersData {
    if (!rawParameters || typeof rawParameters !== 'string') {
        return { prompt: '', params: {} };
    }

    const trimmed = rawParameters.trim();
    const negMarker = 'Negative prompt:';
    const negIdx = trimmed.indexOf(negMarker);

    let prompt = '';
    let negativePrompt: string | undefined;
    let trailing = '';

    if (negIdx !== -1) {
        prompt = trimmed.substring(0, negIdx).trim();
        const afterNeg = trimmed.substring(negIdx + negMarker.length);
        const lastNewline = afterNeg.lastIndexOf('\n');
        if (lastNewline !== -1) {
            negativePrompt = afterNeg.substring(0, lastNewline).trim();
            trailing = afterNeg.substring(lastNewline + 1).trim();
        } else {
            negativePrompt = afterNeg.trim();
        }
    } else {
        const lastNewline = trimmed.lastIndexOf('\n');
        if (lastNewline !== -1) {
            const potentialParams = trimmed.substring(lastNewline + 1).trim();
            if (potentialParams.includes(':')) {
                prompt = trimmed.substring(0, lastNewline).trim();
                trailing = potentialParams;
            } else {
                prompt = trimmed;
            }
        } else {
            prompt = trimmed;
        }
    }

    const params: Record<string, string> = {};
    if (trailing) {
        // e.g. "Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 12345, Size: 512x512, Model: sd-v1-5"
        const pairs = trailing.split(/,\s*(?=[A-Za-z0-9 _-]+:)/);
        for (const pair of pairs) {
            const colonIdx = pair.indexOf(':');
            if (colonIdx !== -1) {
                const k = pair.substring(0, colonIdx).trim();
                const v = pair.substring(colonIdx + 1).trim();
                if (k) {
                    params[k] = v;
                }
            }
        }
    }

    return {
        prompt,
        ...(negativePrompt ? { negativePrompt } : {}),
        params,
    };
}

export function mergeSidecarMetadata(
    primary?: Record<string, any> | null,
    fallbackParent?: Record<string, any> | null,
): Record<string, any> | null {
    if (!primary && !fallbackParent) return null;
    if (!fallbackParent) return primary || null;
    if (!primary) return fallbackParent;
    return {
        ...fallbackParent,
        ...primary,
        actualOutput: primary.actualOutput || fallbackParent.actualOutput,
        kind: primary.kind || fallbackParent.kind,
        sequence: primary.sequence !== undefined ? primary.sequence : fallbackParent.sequence,
        slotIndex: primary.slotIndex !== undefined ? primary.slotIndex : fallbackParent.slotIndex,
        filename: primary.filename || fallbackParent.filename,
    };
}

/**
 * Extract unified Nano Banana metadata from raw ArrayBuffer, with optional sidecar JSON fallback.
 */
export function extractNanoBananaMetadata(
    arrayBuffer?: ArrayBuffer | null,
    sidecarJson?: Record<string, unknown> | null,
): NanoBananaMetadataPayload | null {
    const rawMap = arrayBuffer && arrayBuffer.byteLength >= 4 ? parseImageEmbeddedMetadata(arrayBuffer) : {};

    let embeddedMeta: NanoBananaMetadataPayload | null = null;

    if (rawMap['nano_banana_meta']) {
        try {
            embeddedMeta = JSON.parse(rawMap['nano_banana_meta']) as NanoBananaMetadataPayload;
        } catch {
            // Ignore parse error
        }
    }

    if (!embeddedMeta && rawMap['parameters']) {
        const parsed = parseParametersString(rawMap['parameters']);
        const rawTemp = parsed.params['Temperature'] ? parseFloat(parsed.params['Temperature']) : undefined;
        embeddedMeta = {
            prompt: parsed.prompt,
            model: parsed.params['Model'] || undefined,
            style: parsed.params['Style'] || undefined,
            aspectRatio: parsed.params['Aspect Ratio'] || undefined,
            size: parsed.params['Size'] || undefined,
            temperature: Number.isFinite(rawTemp) ? rawTemp : undefined,
            thinkingLevel: parsed.params['Thinking Level'] || undefined,
            parametersRaw: rawMap['parameters'],
            negativePrompt: parsed.negativePrompt,
        };
    }

    if (sidecarJson && typeof sidecarJson === 'object') {
        const sidecarAny = sidecarJson as Record<string, any>;
        const normalizedSidecar: Partial<NanoBananaMetadataPayload> = {
            ...sidecarAny,
            createdAt: sidecarAny.createdAt || sidecarAny.timestamp,
            mode: sidecarAny.mode || sidecarAny.generationMode,
            size: sidecarAny.size || sidecarAny.requestedImageSize,
            exportSourceType:
                sidecarAny.exportSourceType ||
                (sidecarAny.kind === 'thought-image'
                    ? 'thought'
                    : sidecarAny.kind === 'output-image'
                      ? 'product'
                      : undefined),
        };

        if (!embeddedMeta) {
            embeddedMeta = normalizedSidecar as NanoBananaMetadataPayload;
        } else {
            embeddedMeta = {
                ...(normalizedSidecar as NanoBananaMetadataPayload),
                ...embeddedMeta,
                createdAt: embeddedMeta.createdAt || normalizedSidecar.createdAt,
                mode: embeddedMeta.mode || normalizedSidecar.mode,
                size: embeddedMeta.size || normalizedSidecar.size,
                exportSourceType: embeddedMeta.exportSourceType || normalizedSidecar.exportSourceType,
            };
        }
    }

    return embeddedMeta;
}

/**
 * Convert extracted metadata into a normalized ViewerComposerSettingsSnapshot.
 */
export function convertMetadataToViewerSnapshot(
    meta: Partial<NanoBananaMetadataPayload> | null | undefined,
): ViewerComposerSettingsSnapshot | null {
    if (!meta) {
        return null;
    }

    const fallbackModel: ImageModel = IMAGE_MODELS[0] || 'gemini-3.1-flash-image';
    const isModelValid = typeof meta.model === 'string' && (IMAGE_MODELS as readonly string[]).includes(meta.model);
    const resolvedModel: ImageModel = isModelValid ? (meta.model as ImageModel) : fallbackModel;

    const historyStub: Pick<GeneratedImage, 'aspectRatio' | 'size' | 'style' | 'model'> = {
        model: resolvedModel,
        aspectRatio:
            typeof meta.aspectRatio === 'string' && meta.aspectRatio.trim() ? (meta.aspectRatio as AspectRatio) : '1:1',
        size: typeof meta.size === 'string' && meta.size.trim() ? (meta.size as ImageSize) : '1K',
        style: typeof meta.style === 'string' && meta.style.trim() ? (meta.style as ImageStyle) : 'None',
    };

    return buildViewerComposerSettingsSnapshot(historyStub, {
        ...meta,
        model: resolvedModel,
    });
}

/**
 * Format metadata for text CLI output (matching App-Nano_Banana_Workspace_Extractor reader).
 */
export function formatMetadataForCli(
    filename: string,
    metaMap: RawImageEmbeddedMetadata,
    sidecar?: Record<string, unknown> | null,
): string {
    const lines: string[] = [];
    lines.push('================================================================');
    lines.push('  Nano Banana Ultra - 圖片中繼資料檢視器 (Metadata Reader)');
    lines.push('================================================================');
    lines.push(`檔案: ${filename}`);

    let parsedMeta: NanoBananaMetadataPayload | null = null;
    if (metaMap['nano_banana_meta']) {
        try {
            parsedMeta = JSON.parse(metaMap['nano_banana_meta']);
        } catch {
            // ignore
        }
    }

    if (!parsedMeta && sidecar && typeof sidecar === 'object') {
        parsedMeta = { ...(sidecar as NanoBananaMetadataPayload) };
    } else if (parsedMeta && sidecar && typeof sidecar === 'object') {
        parsedMeta = { ...(sidecar as NanoBananaMetadataPayload), ...parsedMeta };
    }

    if (parsedMeta) {
        lines.push('');
        lines.push('提示詞 (Prompt):');
        lines.push(`  ${parsedMeta.prompt || '(無)'}`);

        lines.push('');
        lines.push('模型與參數:');
        if (parsedMeta.model) lines.push(`  模型 (Model)            : ${parsedMeta.model}`);
        if (parsedMeta.style) lines.push(`  風格 (Style)            : ${parsedMeta.style}`);
        if (parsedMeta.aspectRatio) lines.push(`  比例 (Aspect Ratio)     : ${parsedMeta.aspectRatio}`);
        if (parsedMeta.size) lines.push(`  尺寸 (Size)             : ${parsedMeta.size}`);
        if (parsedMeta.outputFormat) lines.push(`  輸出格式 (Output Format): ${parsedMeta.outputFormat}`);
        if (parsedMeta.actualOutput)
            lines.push(`  實際產出格式            : ${JSON.stringify(parsedMeta.actualOutput)}`);
        if (parsedMeta.mode) lines.push(`  生成模式 (Mode)         : ${parsedMeta.mode}`);
        if (parsedMeta.executionMode) lines.push(`  執行方式 (Execution Mode): ${parsedMeta.executionMode}`);
        if (parsedMeta.lineageAction) lines.push(`  血統操作 (Lineage Action): ${parsedMeta.lineageAction}`);
        if (parsedMeta.groundingMode) lines.push(`  搜尋增強 (Grounding Mode): ${parsedMeta.groundingMode}`);
        if (parsedMeta.temperature !== undefined) lines.push(`  溫度 (Temperature)      : ${parsedMeta.temperature}`);
        if (parsedMeta.thinkingLevel) lines.push(`  思考層級 (Thinking Level): ${parsedMeta.thinkingLevel}`);
        if (parsedMeta.createdAt) {
            const timeStr = new Date(parsedMeta.createdAt).toLocaleString('zh-TW');
            lines.push(`  生成時間                : ${timeStr}`);
        }

        if (parsedMeta.text && typeof parsedMeta.text === 'string' && parsedMeta.text.trim()) {
            lines.push('');
            lines.push('模型文字說明 (Model Text Response):');
            lines.push(`  ${parsedMeta.text.trim()}`);
        }

        if (parsedMeta.thoughts && typeof parsedMeta.thoughts === 'string' && parsedMeta.thoughts.trim()) {
            lines.push('');
            lines.push('思考過程 (Thinking Process):');
            lines.push(`  ${parsedMeta.thoughts.trim()}`);
        }

        if (Array.isArray(parsedMeta.groundingSources) && parsedMeta.groundingSources.length > 0) {
            lines.push('');
            lines.push('搜尋引用來源 (Grounding Sources):');
            parsedMeta.groundingSources.forEach((src, idx) => {
                lines.push(`  [${idx + 1}] ${src.title || ''} (${src.url || ''})`);
            });
        }
    } else if (metaMap['parameters']) {
        lines.push('');
        lines.push('解析到參數內容 (parameters):');
        lines.push(metaMap['parameters']);
    } else {
        const extraKeys = Object.keys(metaMap);
        if (extraKeys.length > 0) {
            lines.push('');
            lines.push('發現其他中繼資料欄位:');
            extraKeys.forEach((k) => {
                lines.push(`  [${k}]: ${metaMap[k]}`);
            });
        } else {
            lines.push('');
            lines.push('提示: 此圖片中未找到 Nano Banana 或相容的 AI 生成中繼資料。');
        }
    }

    lines.push('================================================================');
    lines.push('');
    return lines.join('\n');
}
