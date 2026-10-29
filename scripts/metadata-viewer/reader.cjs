/**
 * reader.cjs
 * Pure Node.js PNG & JPEG Metadata Reader for Nano Banana Ultra images.
 * Automatically checks for sidecar JSON files (<stem>.json).
 *
 * Usage:
 *   node ./scripts/metadata-viewer/reader.cjs <image1.png|image1.jpg> [image2.png ...]
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Extract text metadata chunks (iTXt / tEXt) from a PNG Buffer.
 * @param {Buffer} buf
 * @returns {Record<string, string>}
 */
function readPngMetadata(buf) {
    if (!buf || buf.length < 8) {
        throw new Error('檔案太小，不是合法的 PNG 檔案。');
    }

    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 8; i++) {
        if (buf[i] !== pngSignature[i]) {
            throw new Error('此檔案不是合法的 PNG 圖片格式（缺少 PNG 標頭簽名）。');
        }
    }

    const metadata = {};
    let pos = 8;
    const len = buf.length;

    while (pos + 8 <= len) {
        const chunkLen = buf.readUInt32BE(pos);
        const chunkType = buf.toString('ascii', pos + 4, pos + 8);
        const dataStart = pos + 8;
        const dataEnd = dataStart + chunkLen;

        if (dataEnd + 4 > len) {
            break;
        }

        if (chunkType === 'tEXt') {
            const chunkData = buf.subarray(dataStart, dataEnd);
            const nullIdx = chunkData.indexOf(0x00);
            if (nullIdx > 0) {
                const keyword = chunkData.subarray(0, nullIdx).toString('ascii');
                const text = chunkData.subarray(nullIdx + 1).toString('utf8');
                metadata[keyword] = text;
            }
        } else if (chunkType === 'iTXt') {
            const chunkData = buf.subarray(dataStart, dataEnd);
            let idx = 0;
            const null1 = chunkData.indexOf(0x00, idx);
            if (null1 > 0) {
                const keyword = chunkData.subarray(0, null1).toString('utf8');
                idx = null1 + 1;
                if (idx + 2 <= chunkData.length) {
                    const compFlag = chunkData[idx];
                    idx += 2;

                    const null2 = chunkData.indexOf(0x00, idx);
                    if (null2 !== -1) {
                        idx = null2 + 1;
                        const null3 = chunkData.indexOf(0x00, idx);
                        if (null3 !== -1) {
                            idx = null3 + 1;
                            const textBytes = chunkData.subarray(idx);
                            let text = '';
                            if (compFlag === 1) {
                                try {
                                    text = zlib.inflateSync(textBytes).toString('utf8');
                                } catch {
                                    text = textBytes.toString('utf8');
                                }
                            } else {
                                text = textBytes.toString('utf8');
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
 * Extract text metadata from JPEG COM segments.
 * @param {Buffer} buf
 * @returns {Record<string, string>}
 */
function readJpegMetadata(buf) {
    if (!buf || buf.length < 4) {
        throw new Error('檔案太小，不是合法的 JPEG 檔案。');
    }

    if (buf[0] !== 0xff || buf[1] !== 0xd8) {
        throw new Error('此檔案不是合法的 JPEG 圖片格式（缺少 SOI 簽名 0xFFD8）。');
    }

    const metadata = {};
    let pos = 2;
    const len = buf.length;

    while (pos + 4 <= len) {
        if (buf[pos] !== 0xff) {
            pos++;
            continue;
        }

        while (pos < len && buf[pos] === 0xff) {
            pos++;
        }
        if (pos >= len) break;

        const marker = buf[pos++];

        if (marker === 0xd9 || marker === 0xda) {
            break;
        }
        if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x00) {
            continue;
        }

        if (pos + 2 > len) break;
        const segLen = buf.readUInt16BE(pos);
        if (segLen < 2 || pos + segLen > len) {
            break;
        }

        const payloadStart = pos + 2;
        const payloadEnd = pos + segLen;

        if (marker === 0xfe) {
            const payload = buf.subarray(payloadStart, payloadEnd).toString('utf8');
            const newlineIdx = payload.indexOf('\n');
            if (newlineIdx !== -1) {
                const prefix = payload.substring(0, newlineIdx).trim();
                const content = payload.substring(newlineIdx + 1);
                if (prefix === 'nano_banana_meta' || prefix === 'parameters') {
                    metadata[prefix] = content;
                } else {
                    metadata[prefix || 'comment'] = content;
                }
            } else {
                metadata['comment'] = payload;
            }
        }

        pos += segLen;
    }

    return metadata;
}

/**
 * Universal metadata reader that automatically identifies image format (PNG or JPEG).
 * @param {Buffer} buf
 * @returns {Record<string, string>}
 */
function readImageMetadata(buf) {
    if (!buf || buf.length < 4) {
        throw new Error('檔案太小，無法辨識圖片格式。');
    }

    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return readPngMetadata(buf);
    }

    if (buf[0] === 0xff && buf[1] === 0xd8) {
        return readJpegMetadata(buf);
    }

    throw new Error('不支援或未知的圖片格式（僅支援 PNG 與 JPEG / JPG 圖片）。');
}

/**
 * Locate and read optional sidecar JSON file (<stem>.json).
 * Checks same folder and ./output relative folder.
 * @param {string} imagePath
 * @returns {Record<string, unknown> | null}
 */
function findSidecarJson(imagePath) {
    const dir = path.dirname(imagePath);
    const ext = path.extname(imagePath);
    const stem = path.basename(imagePath, ext);

    const candidates = [
        path.join(dir, `${stem}.json`),
        path.join(dir, 'output', `${stem}.json`),
        path.join(process.cwd(), 'output', `${stem}.json`),
    ];

    let sidecar = null;
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            try {
                const content = fs.readFileSync(candidate, 'utf8');
                sidecar = JSON.parse(content);
                break;
            } catch {
                // Ignore parse errors
            }
        }
    }

    if (sidecar) {
        const partMatch = stem.match(/^(.+)-part-\d+$/);
        if (partMatch) {
            const parentCandidates = [
                path.join(dir, `${partMatch[1]}.json`),
                path.join(dir, 'output', `${partMatch[1]}.json`),
                path.join(process.cwd(), 'output', `${partMatch[1]}.json`),
            ];
            for (const pc of parentCandidates) {
                if (fs.existsSync(pc)) {
                    try {
                        const parentContent = fs.readFileSync(pc, 'utf8');
                        const parentObj = JSON.parse(parentContent);
                        if (parentObj && typeof parentObj === 'object') {
                            sidecar = {
                                ...parentObj,
                                ...sidecar,
                                actualOutput: sidecar.actualOutput || parentObj.actualOutput,
                                kind: sidecar.kind || parentObj.kind,
                                sequence: sidecar.sequence !== undefined ? sidecar.sequence : parentObj.sequence,
                                slotIndex: sidecar.slotIndex !== undefined ? sidecar.slotIndex : parentObj.slotIndex,
                                filename: sidecar.filename || path.basename(imagePath),
                            };
                            break;
                        }
                    } catch {}
                }
            }
        }
    }

    return sidecar;
}

/**
 * Display formatted metadata of an image file or sidecar JSON file.
 * @param {string} imagePath
 */
function inspectImageFile(imagePath) {
    const fullPath = path.resolve(imagePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`\n[ERROR] [錯誤] 找不到檔案: "${imagePath}"\n`);
        return;
    }

    const filename = path.basename(fullPath);
    console.log('\n================================================================');
    console.log(`  Nano Banana Ultra - 圖片中繼資料檢視器 (Metadata Reader)`);
    console.log('================================================================');
    console.log(`檔案: ${filename}`);

    const ext = path.extname(fullPath).toLowerCase();
    let metaMap = {};
    let sidecar = null;

    if (ext === '.json') {
        try {
            const jsonText = fs.readFileSync(fullPath, 'utf8');
            sidecar = JSON.parse(jsonText);
            console.log(`  (直接解析 Sidecar JSON 檔案)`);

            const stem = path.basename(fullPath, ext);
            const partMatch = stem.match(/^(.+)-part-\d+$/);
            if (partMatch) {
                const dir = path.dirname(fullPath);
                const parentPath = path.join(dir, `${partMatch[1]}.json`);
                if (fs.existsSync(parentPath)) {
                    try {
                        const parentObj = JSON.parse(fs.readFileSync(parentPath, 'utf8'));
                        sidecar = {
                            ...parentObj,
                            ...sidecar,
                            actualOutput: sidecar.actualOutput || parentObj.actualOutput,
                            kind: sidecar.kind || parentObj.kind,
                        };
                        console.log(`  (已自動結合主檔案資訊: ${partMatch[1]}.json)`);
                    } catch {}
                }
            }
        } catch (err) {
            console.error(`JSON 解析失敗: ${err.message}`);
            return;
        }
    } else {
        let buf;
        try {
            buf = fs.readFileSync(fullPath);
        } catch (err) {
            console.error(`讀取檔案失敗: ${err.message}`);
            return;
        }

        try {
            metaMap = readImageMetadata(buf);
        } catch (err) {
            console.error(`解析失敗: ${err.message}`);
            return;
        }

        sidecar = findSidecarJson(fullPath);
        if (sidecar) {
            console.log(`  (已自動結合側車檔案 sidecar JSON: ${filename.replace(/\.[^.]+$/, '.json')})`);
        }
    }

    let parsedMeta = null;
    if (metaMap['nano_banana_meta']) {
        try {
            parsedMeta = JSON.parse(metaMap['nano_banana_meta']);
        } catch {
            // ignore
        }
    }

    if (!parsedMeta && sidecar) {
        parsedMeta = { ...sidecar };
    } else if (parsedMeta && sidecar) {
        parsedMeta = { ...sidecar, ...parsedMeta };
    }

    if (parsedMeta) {
        parsedMeta.createdAt = parsedMeta.createdAt || parsedMeta.timestamp;
        parsedMeta.mode = parsedMeta.mode || parsedMeta.generationMode;
        parsedMeta.size = parsedMeta.size || parsedMeta.requestedImageSize;
        parsedMeta = { ...sidecar, ...parsedMeta };
    }

    if (parsedMeta) {
        console.log(`\n提示詞 (Prompt):`);
        console.log(`  ${parsedMeta.prompt || '(無)'}`);

        console.log(`\n模型與參數:`);
        if (parsedMeta.model) console.log(`  模型 (Model)            : ${parsedMeta.model}`);
        if (parsedMeta.style) console.log(`  風格 (Style)            : ${parsedMeta.style}`);
        if (parsedMeta.aspectRatio) console.log(`  比例 (Aspect Ratio)     : ${parsedMeta.aspectRatio}`);
        if (parsedMeta.size) console.log(`  尺寸 (Size)             : ${parsedMeta.size}`);
        if (parsedMeta.outputFormat) console.log(`  輸出格式 (Output Format): ${parsedMeta.outputFormat}`);
        if (parsedMeta.actualOutput)
            console.log(`  實際產出格式            : ${JSON.stringify(parsedMeta.actualOutput)}`);
        if (parsedMeta.mode) console.log(`  生成模式 (Mode)         : ${parsedMeta.mode}`);
        if (parsedMeta.executionMode) console.log(`  執行方式 (Execution Mode): ${parsedMeta.executionMode}`);
        if (parsedMeta.lineageAction) console.log(`  血統操作 (Lineage Action): ${parsedMeta.lineageAction}`);
        if (parsedMeta.groundingMode) console.log(`  搜尋增強 (Grounding Mode): ${parsedMeta.groundingMode}`);
        if (parsedMeta.temperature !== undefined) console.log(`  溫度 (Temperature)      : ${parsedMeta.temperature}`);
        if (parsedMeta.thinkingLevel) console.log(`  思考層級 (Thinking Level): ${parsedMeta.thinkingLevel}`);
        if (parsedMeta.createdAt) {
            const timeStr = new Date(parsedMeta.createdAt).toLocaleString('zh-TW');
            console.log(`  生成時間                : ${timeStr}`);
        }

        if (parsedMeta.text && typeof parsedMeta.text === 'string' && parsedMeta.text.trim()) {
            console.log(`\n模型文字說明 (Model Text Response):`);
            console.log(`  ${parsedMeta.text.trim()}`);
        }

        if (parsedMeta.thoughts && typeof parsedMeta.thoughts === 'string' && parsedMeta.thoughts.trim()) {
            console.log(`\n思考過程 (Thinking Process):`);
            console.log(`  ${parsedMeta.thoughts.trim()}`);
        }

        if (Array.isArray(parsedMeta.groundingSources) && parsedMeta.groundingSources.length > 0) {
            console.log(`\n搜尋引用來源 (Grounding Sources):`);
            parsedMeta.groundingSources.forEach((src, idx) => {
                console.log(`  [${idx + 1}] ${src.title || ''} (${src.url || ''})`);
            });
        }
    } else if (metaMap['parameters']) {
        console.log(`\n解析到參數內容 (parameters):`);
        console.log(metaMap['parameters']);
    } else {
        const extraKeys = Object.keys(metaMap);
        if (extraKeys.length > 0) {
            console.log(`\n發現其他中繼資料欄位:`);
            extraKeys.forEach((k) => {
                console.log(`  [${k}]: ${metaMap[k]}`);
            });
        } else {
            console.log(`\n提示: 此圖片中未找到 Nano Banana 或相容的 AI 生成中繼資料。`);
        }
    }

    console.log('================================================================\n');
}

// CLI entry point
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        console.log('\nNano Banana Ultra - 圖片中繼資料檢視器 (Metadata Reader)');
        console.log('使用方法:');
        console.log('  node ./scripts/metadata-viewer/reader.cjs <image1.png|image1.jpg> [image2.jpg ...]');
        console.log('  或直接將圖片拖曳至 run_read_metadata.bat 上。\n');
        process.exit(0);
    }

    args.forEach((arg) => {
        inspectImageFile(arg);
    });
}

if (require.main === module) {
    main();
}

module.exports = {
    readPngMetadata,
    readJpegMetadata,
    readImageMetadata,
    findSidecarJson,
    inspectImageFile,
};
