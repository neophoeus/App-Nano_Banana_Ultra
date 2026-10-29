/**
 * imageMetadataEmbedder.ts
 * 100% Zero-dependency PNG iTXt and JPEG COM metadata injector.
 * Fully compatible with App-Nano_Banana_Workspace_Extractor and Stable Diffusion WebUI / A1111 / ComfyUI.
 */

// CRC-32 Lookup Table for PNG Chunk calculation
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    CRC_TABLE[i] = c >>> 0;
}

/**
 * Calculate CRC-32 checksum.
 */
export function crc32(buf: Buffer | Uint8Array, offset = 0, length = buf.length): number {
    let c = 0xffffffff;
    const end = offset + length;
    for (let i = offset; i < end; i++) {
        c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

export interface EmbeddedNanoBananaMeta {
    id: string;
    timestamp?: number;
    createdAt?: string;
    prompt: string;
    model: string;
    mode?: string;
    aspectRatio: string;
    size: string;
    style: string;
    outputFormat?: string;
    actualOutput?: string;
    temperature?: number;
    thinkingLevel?: string;
    includeThoughts?: boolean;
    googleSearch?: boolean;
    imageSearch?: boolean;
    groundingMode?: string;
    executionMode?: string;
    lineageAction?: string;
    status?: string;
    text?: string | null;
    thoughts?: string | null;
    sessionHints?: Record<string, unknown> | null;
    groundingSources?: Array<{ title?: string; url?: string }>;
    exportSourceType: 'product' | 'variant' | 'thought';
    parentHistoryId: string;
    variantIndex?: number;
    thoughtIndex?: number;
    _truncated?: boolean;
}

/**
 * Create an uncompressed iTXt chunk for PNG.
 * @param keyword ASCII/UTF-8 keyword (1-79 bytes)
 * @param text UTF-8 text string
 */
export function createITXtChunk(keyword: string, text: string): Buffer {
    const keywordBuf = Buffer.from(keyword, 'utf8');
    const textBuf = Buffer.from(text, 'utf8');

    // iTXt data structure:
    // keyword (null-terminated)
    // compFlag (1 byte, 0 = uncompressed)
    // compMethod (1 byte, 0)
    // langTag (null-terminated -> 1 null byte)
    // transKeyword (null-terminated -> 1 null byte)
    // text (utf8)
    const dataLen = keywordBuf.length + 1 + 1 + 1 + 1 + 1 + textBuf.length;
    const data = Buffer.alloc(dataLen);

    let offset = 0;
    keywordBuf.copy(data, offset);
    offset += keywordBuf.length;
    data[offset++] = 0; // null separator
    data[offset++] = 0; // uncompressed
    data[offset++] = 0; // compression method 0
    data[offset++] = 0; // empty language tag (null)
    data[offset++] = 0; // empty translated keyword (null)
    textBuf.copy(data, offset);

    // Chunk = 4 bytes length + 4 bytes type ('iTXt') + data + 4 bytes CRC
    const chunkType = Buffer.from('iTXt', 'ascii');
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.writeUInt32BE(data.length, 0);
    chunkType.copy(chunkHeader, 4);

    const typeAndData = Buffer.concat([chunkType, data]);
    const crcVal = crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);

    return Buffer.concat([chunkHeader, data, crcBuf]);
}

/**
 * Format generation metadata into standard AI parameters text (A1111 / WebUI compatible).
 */
export function formatParametersText(meta: EmbeddedNanoBananaMeta): string {
    let text = `${meta.prompt || ''}\n`;
    const details: string[] = [];
    if (meta.model) details.push(`Model: ${meta.model}`);
    if (meta.style) details.push(`Style: ${meta.style}`);
    if (meta.aspectRatio) details.push(`Aspect Ratio: ${meta.aspectRatio}`);
    if (meta.size) details.push(`Size: ${meta.size}`);
    if (meta.outputFormat) details.push(`Output Format: ${meta.outputFormat}`);
    if (meta.actualOutput) details.push(`Actual Output: ${meta.actualOutput}`);
    if (meta.mode) details.push(`Mode: ${meta.mode}`);
    if (meta.executionMode) details.push(`Execution Mode: ${meta.executionMode}`);
    if (meta.lineageAction) details.push(`Lineage Action: ${meta.lineageAction}`);
    if (meta.groundingMode) details.push(`Grounding Mode: ${meta.groundingMode}`);
    if (meta.temperature !== undefined) details.push(`Temperature: ${meta.temperature}`);
    if (meta.thinkingLevel) details.push(`Thinking Level: ${meta.thinkingLevel}`);
    if (meta.createdAt) {
        try {
            details.push(`Created At: ${new Date(meta.createdAt).toISOString()}`);
        } catch {
            details.push(`Created At: ${meta.createdAt}`);
        }
    }
    if (details.length > 0) {
        text += details.join(', ') + '\n';
    }
    if (Array.isArray(meta.groundingSources) && meta.groundingSources.length > 0) {
        text += `\n[Grounding Sources]:\n`;
        meta.groundingSources.forEach((src, idx) => {
            text += `[${idx + 1}] ${src.title || ''} (${src.url || ''})\n`;
        });
    }
    if (meta.thoughts && meta.thoughts.trim()) {
        text += `\n[Thoughts]:\n${meta.thoughts.trim()}\n`;
    }
    if (meta.text && meta.text.trim()) {
        text += `\n[Response]:\n${meta.text.trim()}\n`;
    }
    return text.trim();
}

/**
 * Strip existing parameters and nano_banana_meta chunks from PNG buffer for idempotency.
 */
export function stripExistingPngMetadataChunks(pngBuffer: Buffer): Buffer {
    if (!pngBuffer || pngBuffer.length < 8) return pngBuffer;
    if (pngBuffer[0] !== 0x89 || pngBuffer[1] !== 0x50 || pngBuffer[2] !== 0x4e || pngBuffer[3] !== 0x47) {
        return pngBuffer;
    }
    const chunks: Buffer[] = [pngBuffer.subarray(0, 8)];
    let pos = 8;
    while (pos + 12 <= pngBuffer.length) {
        const len = pngBuffer.readUInt32BE(pos);
        const chunkType = pngBuffer.toString('ascii', pos + 4, pos + 8);
        const nextPos = pos + 12 + len;
        if (nextPos > pngBuffer.length) break;

        if (chunkType === 'iTXt' || chunkType === 'tEXt') {
            const dataStart = pos + 8;
            const nullPos = pngBuffer.indexOf(0, dataStart);
            if (nullPos !== -1 && nullPos < dataStart + len) {
                const keyword = pngBuffer.toString('utf8', dataStart, nullPos);
                if (keyword === 'parameters' || keyword === 'nano_banana_meta') {
                    pos = nextPos;
                    continue;
                }
            }
        }

        chunks.push(pngBuffer.subarray(pos, nextPos));
        pos = nextPos;
    }
    if (pos < pngBuffer.length) {
        chunks.push(pngBuffer.subarray(pos));
    }
    return Buffer.concat(chunks);
}

/**
 * Inject iTXt metadata chunks into a PNG buffer.
 * Injects both standard 'parameters' and structured 'nano_banana_meta'.
 */
export function embedPngMetadata(pngBuffer: Buffer, meta: EmbeddedNanoBananaMeta): Buffer {
    if (!pngBuffer || pngBuffer.length < 8) return pngBuffer;
    if (pngBuffer[0] !== 0x89 || pngBuffer[1] !== 0x50 || pngBuffer[2] !== 0x4e || pngBuffer[3] !== 0x47) {
        return pngBuffer; // Not a PNG
    }

    const cleanBuffer = stripExistingPngMetadataChunks(pngBuffer);
    const paramsText = formatParametersText(meta);
    const jsonText = JSON.stringify(meta);

    const chunkParams = createITXtChunk('parameters', paramsText);
    const chunkJson = createITXtChunk('nano_banana_meta', jsonText);
    const combinedChunks = Buffer.concat([chunkParams, chunkJson]);

    // Find IEND chunk
    const iendMarker = Buffer.from('IEND', 'ascii');
    const iendTypePos = cleanBuffer.lastIndexOf(iendMarker);
    if (iendTypePos < 4) {
        return cleanBuffer; // Corrupted PNG, return untouched
    }
    const iendPos = iendTypePos - 4; // Start of IEND chunk (length field)

    return Buffer.concat([cleanBuffer.subarray(0, iendPos), combinedChunks, cleanBuffer.subarray(iendPos)]);
}

/**
 * Safely truncate a UTF-8 Buffer without cutting mid-character.
 */
export function truncateUtf8BufferSafely(buf: Buffer, maxBytes: number): Buffer {
    if (!buf || buf.length <= maxBytes) return buf;
    let end = maxBytes;
    while (end > 0 && (buf[end] & 0xc0) === 0x80) {
        end--;
    }
    if (end > 0) {
        const lead = buf[end - 1];
        let charLen = 1;
        if ((lead & 0xe0) === 0xc0) charLen = 2;
        else if ((lead & 0xf0) === 0xe0) charLen = 3;
        else if ((lead & 0xf8) === 0xf0) charLen = 4;
        if (charLen > 1 && end - 1 + charLen > maxBytes) {
            end = end - 1;
        }
    }
    return buf.subarray(0, end);
}

/**
 * Serialize metadata object to JSON string while ensuring it safely fits
 * within a single JPEG COM segment without cutting the JSON structure.
 */
export function serializeMetaForJpegCom(meta: EmbeddedNanoBananaMeta, maxJsonBytes = 65510): string {
    let jsonStr = JSON.stringify(meta);
    let buf = Buffer.from(jsonStr, 'utf8');
    if (buf.length <= maxJsonBytes) return jsonStr;

    const trimmed: EmbeddedNanoBananaMeta = { ...meta, _truncated: true };

    if (trimmed.thoughts && typeof trimmed.thoughts === 'string') {
        const thoughtBuf = Buffer.from(trimmed.thoughts, 'utf8');
        const targetBytes = Math.max(0, thoughtBuf.length - (buf.length - maxJsonBytes) - 64);
        trimmed.thoughts =
            (targetBytes > 0 ? truncateUtf8BufferSafely(thoughtBuf, targetBytes).toString('utf8') : '') +
            '... [truncated]';
        jsonStr = JSON.stringify(trimmed);
        buf = Buffer.from(jsonStr, 'utf8');
        if (buf.length <= maxJsonBytes) return jsonStr;
    }

    if (trimmed.text && typeof trimmed.text === 'string') {
        const textBuf = Buffer.from(trimmed.text, 'utf8');
        const targetBytes = Math.max(0, textBuf.length - (buf.length - maxJsonBytes) - 64);
        trimmed.text =
            (targetBytes > 0 ? truncateUtf8BufferSafely(textBuf, targetBytes).toString('utf8') : '') +
            '... [truncated]';
        jsonStr = JSON.stringify(trimmed);
        buf = Buffer.from(jsonStr, 'utf8');
        if (buf.length <= maxJsonBytes) return jsonStr;
    }

    delete trimmed.thoughts;
    delete trimmed.text;
    delete trimmed.sessionHints;
    jsonStr = JSON.stringify(trimmed);
    buf = Buffer.from(jsonStr, 'utf8');
    if (buf.length <= maxJsonBytes) return jsonStr;

    const minimal: EmbeddedNanoBananaMeta = {
        id: trimmed.id,
        prompt: (trimmed.prompt || '').slice(0, 500),
        model: trimmed.model,
        aspectRatio: trimmed.aspectRatio,
        size: trimmed.size,
        style: trimmed.style,
        exportSourceType: trimmed.exportSourceType,
        parentHistoryId: trimmed.parentHistoryId,
        _truncated: true,
    };
    return JSON.stringify(minimal);
}

/**
 * Create a standard JPEG COM (Comment, marker 0xFF 0xFE) segment.
 */
export function createJpegComSegment(prefix: string, text: string): Buffer {
    const prefixBuf = Buffer.from(prefix + '\n', 'utf8');
    const maxDataLen = 65533; // 65535 - 2 bytes length field
    const maxPayloadLen = maxDataLen - prefixBuf.length;

    let payloadBuf = Buffer.from(text, 'utf8');
    if (payloadBuf.length > maxPayloadLen) {
        payloadBuf = truncateUtf8BufferSafely(payloadBuf, maxPayloadLen);
    }
    const combinedData = Buffer.concat([prefixBuf, payloadBuf]);
    const segLen = combinedData.length + 2;

    const segBuf = Buffer.alloc(4 + combinedData.length);
    segBuf[0] = 0xff;
    segBuf[1] = 0xfe; // COM marker
    segBuf.writeUInt16BE(segLen, 2);
    combinedData.copy(segBuf, 4);
    return segBuf;
}

/**
 * Strip existing parameters and nano_banana_meta COM segments from JPEG buffer for idempotency.
 */
export function stripExistingJpegMetadataSegments(jpegBuffer: Buffer): Buffer {
    if (!jpegBuffer || jpegBuffer.length < 4 || jpegBuffer[0] !== 0xff || jpegBuffer[1] !== 0xd8) {
        return jpegBuffer;
    }
    const chunks: Buffer[] = [jpegBuffer.subarray(0, 2)];
    let pos = 2;
    while (pos + 4 <= jpegBuffer.length && jpegBuffer[pos] === 0xff) {
        const marker = jpegBuffer[pos + 1];
        if (marker === 0xda || marker === 0xd9) {
            break;
        }
        const segLen = jpegBuffer.readUInt16BE(pos + 2);
        const nextPos = pos + 2 + segLen;
        if (nextPos > jpegBuffer.length) {
            break;
        }
        if (marker === 0xfe) {
            const textStart = pos + 4;
            const textSample = jpegBuffer.subarray(textStart, Math.min(nextPos, textStart + 24)).toString('utf8');
            if (textSample.startsWith('parameters\n') || textSample.startsWith('nano_banana_meta\n')) {
                pos = nextPos;
                continue;
            }
        }
        chunks.push(jpegBuffer.subarray(pos, nextPos));
        pos = nextPos;
    }
    if (pos < jpegBuffer.length) {
        chunks.push(jpegBuffer.subarray(pos));
    }
    return Buffer.concat(chunks);
}

/**
 * Inject JPEG COM segments into a JPEG buffer (lossless, no re-encoding).
 */
export function embedJpegMetadata(jpegBuffer: Buffer, meta: EmbeddedNanoBananaMeta): Buffer {
    if (!jpegBuffer || jpegBuffer.length < 4) return jpegBuffer;
    if (jpegBuffer[0] !== 0xff || jpegBuffer[1] !== 0xd8) return jpegBuffer; // Not a JPEG

    const cleanBuffer = stripExistingJpegMetadataSegments(jpegBuffer);
    const paramsText = formatParametersText(meta);
    const jsonText = serializeMetaForJpegCom(meta, 65510);

    const comParams = createJpegComSegment('parameters', paramsText);
    const comJson = createJpegComSegment('nano_banana_meta', jsonText);
    const combined = Buffer.concat([comParams, comJson]);

    // Insert after APP0 (0xFFE0) or APP1 (0xFFE1) if present at start, otherwise immediately after SOI (0xFF 0xD8)
    let insertPos = 2;
    while (insertPos + 4 <= cleanBuffer.length && cleanBuffer[insertPos] === 0xff) {
        const marker = cleanBuffer[insertPos + 1];
        if (marker === 0xe0 || marker === 0xe1) {
            const appLen = cleanBuffer.readUInt16BE(insertPos + 2);
            if (insertPos + 2 + appLen <= cleanBuffer.length) {
                insertPos += 2 + appLen;
                continue;
            }
        }
        break;
    }

    return Buffer.concat([cleanBuffer.subarray(0, insertPos), combined, cleanBuffer.subarray(insertPos)]);
}

/**
 * Parse metadata text from PNG iTXt / tEXt or JPEG COM segments.
 */
export function readImageMetadata(imageBuffer: Buffer): Record<string, string> {
    const result: Record<string, string> = {};
    if (!imageBuffer || imageBuffer.length < 4) return result;

    // PNG
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4e && imageBuffer[3] === 0x47) {
        let pos = 8;
        while (pos + 12 <= imageBuffer.length) {
            const len = imageBuffer.readUInt32BE(pos);
            const chunkType = imageBuffer.toString('ascii', pos + 4, pos + 8);
            const nextPos = pos + 12 + len;
            if (nextPos > imageBuffer.length) break;

            if (chunkType === 'iTXt') {
                const dataStart = pos + 8;
                const nullPos = imageBuffer.indexOf(0, dataStart);
                if (nullPos !== -1 && nullPos < dataStart + len) {
                    const keyword = imageBuffer.toString('utf8', dataStart, nullPos);
                    let textStart = nullPos + 1 + 2;
                    const langNull = imageBuffer.indexOf(0, textStart);
                    if (langNull !== -1 && langNull < dataStart + len) {
                        textStart = langNull + 1;
                        const transNull = imageBuffer.indexOf(0, textStart);
                        if (transNull !== -1 && transNull < dataStart + len) {
                            textStart = transNull + 1;
                        }
                    }
                    const text = imageBuffer.toString('utf8', textStart, dataStart + len);
                    result[keyword] = text;
                }
            } else if (chunkType === 'tEXt') {
                const dataStart = pos + 8;
                const nullPos = imageBuffer.indexOf(0, dataStart);
                if (nullPos !== -1 && nullPos < dataStart + len) {
                    const keyword = imageBuffer.toString('utf8', dataStart, nullPos);
                    const text = imageBuffer.toString('utf8', nullPos + 1, dataStart + len);
                    result[keyword] = text;
                }
            }
            pos = nextPos;
        }
        return result;
    }

    // JPEG
    if (imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8) {
        let pos = 2;
        while (pos + 4 <= imageBuffer.length && imageBuffer[pos] === 0xff) {
            const marker = imageBuffer[pos + 1];
            if (marker === 0xda || marker === 0xd9) break;
            const segLen = imageBuffer.readUInt16BE(pos + 2);
            const nextPos = pos + 2 + segLen;
            if (nextPos > imageBuffer.length) break;

            if (marker === 0xfe) {
                const text = imageBuffer.toString('utf8', pos + 4, nextPos);
                const nlIndex = text.indexOf('\n');
                if (nlIndex !== -1) {
                    const prefix = text.slice(0, nlIndex);
                    const body = text.slice(nlIndex + 1);
                    result[prefix] = body;
                } else {
                    result['comment'] = text;
                }
            }
            pos = nextPos;
        }
        return result;
    }

    return result;
}

/**
 * Dispatcher to embed metadata into either PNG or JPEG.
 */
export function embedImageMetadata(imageBuffer: Buffer, meta: EmbeddedNanoBananaMeta): Buffer {
    if (!imageBuffer || imageBuffer.length < 4) return imageBuffer;

    // Check PNG signature: 89 50 4E 47
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4e && imageBuffer[3] === 0x47) {
        return embedPngMetadata(imageBuffer, meta);
    }

    // Check JPEG signature: FF D8
    if (imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8) {
        return embedJpegMetadata(imageBuffer, meta);
    }

    return imageBuffer;
}
