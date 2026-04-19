import {
    GenerationFailureDisplayContext,
    GenerationFailureCode,
    GenerationFailureExtractionIssue,
    GenerationFailureInfo,
    StageErrorState,
} from '../types';

type TranslationGetter = (key: string) => string;

type StageErrorBuildOptions = {
    includeRetryDetail?: boolean;
};

export type GenerationFailureDisplaySource = {
    failure?: GenerationFailureInfo | null;
    error?: string | null;
    promptBlockReason?: string | null;
    finishReason?: string | null;
    blockedSafetyCategories?: string[] | null;
    extractionIssue?: GenerationFailureExtractionIssue | null;
    returnedTextContent?: boolean;
    returnedThoughtContent?: boolean;
};

type GenerationFailureCarrier = {
    generationFailure?: GenerationFailureInfo;
};

export type GenerationFailureSourceState = {
    explicitError?: string;
    text?: string;
    thoughts?: string;
    promptBlockReason?: string;
    finishReason?: string;
    safetyRatings?: unknown;
    extractionIssue?: GenerationFailureExtractionIssue;
};

const safetyBlockedFinishReasons = new Set([
    'SAFETY',
    'BLOCKED',
    'IMAGE_SAFETY',
    'IMAGE_PROHIBITED_CONTENT',
    'BLOCKLIST',
    'PROHIBITED_CONTENT',
]);

const generationFailureCodes = new Set<GenerationFailureCode>([
    'policy-blocked',
    'safety-blocked',
    'text-only',
    'no-image-data',
    'empty-response',
    'unknown',
]);

const promptBlockReasonTranslationKeys: Record<string, string> = {
    BLOCKLIST: 'generationFailureValuePromptBlockReasonBlocklist',
    PROHIBITED_CONTENT: 'generationFailureValuePromptBlockReasonProhibitedContent',
    SAFETY: 'generationFailureValuePromptBlockReasonSafety',
    BLOCKED_REASON_UNSPECIFIED: 'generationFailureValuePromptBlockReasonUnspecified',
};

const finishReasonTranslationKeys: Record<string, string> = {
    STOP: 'generationFailureValueFinishReasonStop',
    NO_IMAGE: 'generationFailureValueFinishReasonNoImage',
    FINISH_REASON_UNSPECIFIED: 'generationFailureValueFinishReasonUnspecified',
    IMAGE_SAFETY: 'generationFailureValueFinishReasonImageSafety',
    IMAGE_PROHIBITED_CONTENT: 'generationFailureValueFinishReasonImageProhibitedContent',
    BLOCKLIST: 'generationFailureValueFinishReasonBlocklist',
    PROHIBITED_CONTENT: 'generationFailureValueFinishReasonProhibitedContent',
    IMAGE_OTHER: 'generationFailureValueFinishReasonImageOther',
    SAFETY: 'generationFailureValueFinishReasonSafety',
    BLOCKED: 'generationFailureValueFinishReasonBlocked',
};

const safetyCategoryTranslationKeys: Record<string, string> = {
    harassment: 'generationFailureValueSafetyCategoryHarassment',
    'hate speech': 'generationFailureValueSafetyCategoryHateSpeech',
    'sexually explicit': 'generationFailureValueSafetyCategorySexuallyExplicit',
    'dangerous content': 'generationFailureValueSafetyCategoryDangerousContent',
};

const promptBlockReasonPatterns = [
    /block reason[:：]\s*([A-Z0-9_]+)/i,
    /政策攔截原因[:：]\s*([A-Z0-9_]+)/,
    /策略拦截原因[:：]\s*([A-Z0-9_]+)/,
    /ポリシーブロック理由[:：]\s*([A-Z0-9_]+)/,
    /ポリシーブロックの理由[:：]\s*([A-Z0-9_]+)/,
    /정책 차단 사유[:：]\s*([A-Z0-9_]+)/,
    /motivo del bloqueo por politica[:：]\s*([A-Z0-9_]+)/i,
    /raison du blocage(?: par la politique)?\s*[:：]\s*([A-Z0-9_]+)/i,
    /grund fur die richtlinienblockierung[:：]\s*([A-Z0-9_]+)/i,
    /причина блокировки политикой[:：]\s*([A-Z0-9_]+)/i,
];

const finishReasonPatterns = [
    /finish reason[:：]\s*([A-Z0-9_]+)/i,
    /模型結束原因[:：]\s*([A-Z0-9_]+)/,
    /模型结束原因[:：]\s*([A-Z0-9_]+)/,
    /モデルの終了理由[:：]\s*([A-Z0-9_]+)/,
    /모델 종료 사유[:：]\s*([A-Z0-9_]+)/,
    /motivo de finalizacion del modelo[:：]\s*([A-Z0-9_]+)/i,
    /raison de fin du modele[:：]\s*([A-Z0-9_]+)/i,
    /abschlussgrund des modells[:：]\s*([A-Z0-9_]+)/i,
    /причина завершения модели[:：]\s*([A-Z0-9_]+)/i,
];

const safetyCategoryPatterns = [
    /blocked by safety filters\s*\(([^)]+)\)/i,
    /safety categories[:：]\s*([^。.!]+)/i,
    /安全分類[:：]\s*([^。.!]+)/,
    /安全分类[:：]\s*([^。.!]+)/,
    /安全カテゴリ[:：]\s*([^。.!]+)/,
    /안전 카테고리[:：]\s*([^。.!]+)/,
    /categorias de seguridad[:：]\s*([^。.!]+)/i,
    /categories de securite[:：]\s*([^。.!]+)/i,
    /sicherheitskategorien[:：]\s*([^。.!]+)/i,
    /категории безопасности[:：]\s*([^。.!]+)/i,
];

const policyFailureSnippets = [
    'prompt was rejected by policy',
    'the prompt was blocked before image generation started',
    '提示詞在生成圖片前就被政策規則攔下',
    '提示词在生成图片前就被策略规则拦下',
    '画像生成が始まる前に、プロンプトがポリシーでブロックされました',
    '이미지 생성이 시작되기 전에 프롬프트가 정책에 의해 차단되었습니다',
    'el prompt fue bloqueado por la politica antes de iniciar la generacion',
    'le prompt a ete bloque par la politique avant le debut de la generation',
    'der prompt wurde vor dem start der bildgenerierung durch richtlinien blockiert',
    'промпт был заблокирован политикой до начала генерации изображения',
];

const safetyFailureSnippets = [
    'model output was blocked by safety filters',
    'the image output was blocked by safety filters',
    '模型有完成回應，但圖片輸出被安全過濾器攔下',
    '模型已完成响应，但图片输出被安全过滤器拦下',
    '画像出力は安全フィルタでブロックされました',
    '이미지 출력이 안전 필터에 의해 차단되었습니다',
    'la salida de imagen fue bloqueada por los filtros de seguridad',
    'la sortie image a ete bloquee par les filtres de securite',
    'die bildausgabe wurde durch sicherheitsfilter blockiert',
    'вывод изображения был заблокирован фильтрами безопасности',
];

const textOnlyFailureSnippets = [
    'model returned text-only content instead of image data',
    'the model responded with text only and no image',
    '模型只回傳了文字，沒有輸出圖片',
    '模型只返回了文字，没有输出图片',
    'モデルはテキストだけを返し、画像は返しませんでした',
    '모델이 텍스트만 반환했고 이미지는 반환하지 않았습니다',
    'el modelo respondio solo con texto y sin imagen',
    'le modele a repondu avec uniquement du texte et sans image',
    'das modell hat nur text und kein bild zuruckgegeben',
    'модель вернула только текст и не вернула изображение',
];

const thoughtsOnlyFailureSnippets = [
    'only thought summaries were returned',
    '回應中只回傳了模型思考摘要',
    '响应中只返回了模型思考摘要',
    'モデルの思考要約だけが返され',
    '모델 사고 요약만 반환되었고',
    'solo se devolvieron los resumenes internos del modelo',
    'seuls des resumes de pensee du modele ont ete renvoyes',
    'es wurden nur gedankenzusammenfassungen des modells zuruckgegeben',
    'были возвращены только краткие мысли модели',
];

const noImageFailureSnippets = [
    'model returned no image data',
    'the request completed, but the model did not return image data',
    '請求已完成，但模型沒有回傳圖片資料',
    '请求已完成，但模型没有返回图片数据',
    'リクエストは完了しましたが、モデルは画像データを返しませんでした',
    '요청은 완료되었지만 모델이 이미지 데이터를 반환하지 않았습니다',
    'la solicitud termino, pero el modelo no devolvio datos de imagen',
    'la requete est terminee, mais le modele na renvoye aucune donnee image',
    'die anfrage wurde abgeschlossen, aber das modell hat keine bilddaten zuruckgegeben',
    'запрос завершился, но модель не вернула данные изображения',
];

const emptyFailureSummarySnippets = [
    'the model response did not include enough information to identify a trustworthy cause',
    '模型回傳的資訊不足，系統無法可靠判定這次失敗原因',
    '模型返回的信息不足，系统无法可靠判断这次失败原因',
    'モデル応答の情報が不足しており、今回の失敗原因を信頼できる形では特定できません',
    '모델 응답 정보가 부족해 이번 실패 원인을 신뢰할 수 있게 판단할 수 없습니다',
    'la respuesta del modelo no incluyo suficiente informacion para identificar una causa fiable',
    'la reponse du modele ne contenait pas assez dinformations pour identifier une cause fiable',
    'die modellantwort enthielt nicht genug informationen, um eine verlassliche ursache zu bestimmen',
    'ответ модели не содержал достаточно данных, чтобы надежно определить причину сбоя',
];

const missingCandidatesSnippets = [
    'model returned a response without candidates',
    'no response candidates were returned by the model',
    '模型回應中沒有任何輸出候選',
    '模型响应中没有任何输出候选',
    'モデルから候補出力が返されませんでした',
    '모델이 출력 후보를 반환하지 않았습니다',
    'el modelo no devolvio candidatos de salida',
    'le modele na renvoye aucun resultat candidat',
    'das modell hat keine ausgabekandidaten zuruckgegeben',
    'модель не вернула ни одного варианта ответа',
];

const missingPartsSnippets = [
    'model returned a candidate without content parts',
    'a response candidate was returned, but it contained no content parts',
    '模型有回傳候選結果，但其中沒有任何內容區塊',
    '模型返回了候选结果，但其中没有任何内容区块',
    '候補出力は返されましたが、内容ブロックが含まれていませんでした',
    '출력 후보는 반환되었지만 내용 블록이 비어 있었습니다',
    'el modelo devolvio un candidato de salida, pero no contenia bloques de contenido',
    'le modele a renvoye un resultat candidat, mais sans bloc de contenu',
    'das modell hat einen ausgabekandidaten zuruckgegeben, aber ohne inhaltsblocke',
    'модель вернула вариант ответа, но в нем не было блоков содержимого',
];

const normalizeOptionalString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
};

const normalizeExtractionIssue = (value: unknown): GenerationFailureExtractionIssue | null => {
    const extractionIssue = normalizeOptionalString(value);
    return extractionIssue === 'missing-candidates' ||
        extractionIssue === 'missing-parts' ||
        extractionIssue === 'no-image-data'
        ? extractionIssue
        : null;
};

const normalizeReasonToken = (value: unknown): string | null => {
    const normalizedValue = normalizeOptionalString(value);
    if (!normalizedValue) {
        return null;
    }

    const trimmedValue = normalizedValue.replace(/^["'`(\[]+|["'`.)\]。!]+$/g, '').trim();
    return trimmedValue.length > 0 ? trimmedValue.replace(/\s+/g, '_').toUpperCase() : null;
};

const normalizeSafetyCategory = (value: unknown): string | null => {
    const normalizedValue = normalizeOptionalString(value);
    if (!normalizedValue) {
        return null;
    }

    const trimmedValue = normalizedValue.replace(/^["'`(\[]+|["'`.)\]。!]+$/g, '').trim();
    if (!trimmedValue) {
        return null;
    }

    return trimmedValue
        .replace('HARM_CATEGORY_', '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();
};

const dedupeStrings = (values: string[]) => values.filter((value, index) => values.indexOf(value) === index);

const normalizeBlockedSafetyCategories = (value: unknown): string[] =>
    dedupeStrings(
        normalizeOptionalStringArray(value)
            .map((entry) => normalizeSafetyCategory(entry))
            .filter((entry): entry is string => Boolean(entry)),
    );

const extractPatternValue = (
    value: string,
    patterns: RegExp[],
    normalizer: (match: string) => string | null,
): string | null => {
    for (const pattern of patterns) {
        const match = value.match(pattern);
        if (match?.[1]) {
            const normalizedMatch = normalizer(match[1]);
            if (normalizedMatch) {
                return normalizedMatch;
            }
        }
    }

    return null;
};

const extractBlockedSafetyCategoriesFromError = (value: string): string[] => {
    for (const pattern of safetyCategoryPatterns) {
        const match = value.match(pattern);
        if (!match?.[1]) {
            continue;
        }

        const categories = dedupeStrings(
            match[1]
                .split(/[,，、]+/)
                .map((entry) => normalizeSafetyCategory(entry))
                .filter((entry): entry is string => Boolean(entry)),
        );
        if (categories.length > 0) {
            return categories;
        }
    }

    return [];
};

const includesAnySnippet = (value: string, snippets: string[]) => snippets.some((snippet) => value.includes(snippet));

const buildFailureFromStructuredHints = (
    source: Omit<GenerationFailureDisplaySource, 'failure'>,
): GenerationFailureInfo | null => {
    const promptBlockReason = normalizeReasonToken(source.promptBlockReason);
    const finishReason = normalizeReasonToken(source.finishReason);
    const blockedSafetyCategories = normalizeBlockedSafetyCategories(source.blockedSafetyCategories);
    const extractionIssue = normalizeExtractionIssue(source.extractionIssue);
    const returnedTextContent = source.returnedTextContent === true;
    const returnedThoughtContent = source.returnedThoughtContent === true;

    if (promptBlockReason) {
        return {
            code: 'policy-blocked',
            message: `Prompt was rejected by policy (block reason: ${promptBlockReason}).`,
            promptBlockReason,
            finishReason,
            extractionIssue,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (blockedSafetyCategories.length > 0 || isSafetyBlockedFinishReason(finishReason)) {
        return {
            code: 'safety-blocked',
            message:
                blockedSafetyCategories.length > 0
                    ? `Model output was blocked by safety filters (${blockedSafetyCategories.join(', ')}).`
                    : 'Model output was blocked by safety filters.',
            finishReason,
            blockedSafetyCategories,
            extractionIssue,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (returnedTextContent) {
        return {
            code: 'text-only',
            message: 'Model returned text-only content instead of image data.',
            finishReason,
            extractionIssue,
            returnedTextContent: true,
            returnedThoughtContent,
        };
    }

    if (
        (extractionIssue === 'missing-candidates' || extractionIssue === 'missing-parts') &&
        isNeutralOrMissingFinishReason(finishReason)
    ) {
        return {
            code: 'empty-response',
            message:
                extractionIssue === 'missing-candidates'
                    ? 'Model returned a response without candidates.'
                    : 'Model returned a candidate without content parts.',
            finishReason,
            extractionIssue,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (finishReason === 'NO_IMAGE') {
        return {
            code: 'no-image-data',
            message: 'Model returned no image data (finish reason: NO_IMAGE).',
            finishReason,
            extractionIssue,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (extractionIssue === 'no-image-data' || returnedThoughtContent) {
        return {
            code: 'no-image-data',
            message:
                finishReason && !isNeutralOrMissingFinishReason(finishReason)
                    ? `Model returned no image data (finish reason: ${finishReason}).`
                    : 'Model returned no image data.',
            finishReason,
            extractionIssue,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (finishReason && !isNeutralOrMissingFinishReason(finishReason)) {
        return {
            code: 'no-image-data',
            message: `Model returned no image data (finish reason: ${finishReason}).`,
            finishReason,
            extractionIssue,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    return null;
};

const inferGenerationFailureInfoFromErrorText = (value: string): GenerationFailureInfo | null => {
    const normalizedValue = normalizeOptionalString(value);
    if (!normalizedValue) {
        return null;
    }

    const comparisonText = normalizedValue.toLowerCase();
    const promptBlockReason = extractPatternValue(normalizedValue, promptBlockReasonPatterns, normalizeReasonToken);
    const finishReason = extractPatternValue(normalizedValue, finishReasonPatterns, normalizeReasonToken);
    const blockedSafetyCategories = extractBlockedSafetyCategoriesFromError(normalizedValue);
    const returnedTextContent = includesAnySnippet(comparisonText, textOnlyFailureSnippets);
    const returnedThoughtContent = includesAnySnippet(comparisonText, thoughtsOnlyFailureSnippets);
    const extractionIssue = includesAnySnippet(comparisonText, missingCandidatesSnippets)
        ? 'missing-candidates'
        : includesAnySnippet(comparisonText, missingPartsSnippets)
          ? 'missing-parts'
          : null;

    if (promptBlockReason || includesAnySnippet(comparisonText, policyFailureSnippets)) {
        return {
            code: 'policy-blocked',
            message: normalizedValue,
            promptBlockReason,
            finishReason,
            extractionIssue,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (
        blockedSafetyCategories.length > 0 ||
        isSafetyBlockedFinishReason(finishReason) ||
        includesAnySnippet(comparisonText, safetyFailureSnippets)
    ) {
        return {
            code: 'safety-blocked',
            message: normalizedValue,
            finishReason,
            blockedSafetyCategories,
            extractionIssue,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (returnedTextContent) {
        return {
            code: 'text-only',
            message: normalizedValue,
            finishReason,
            extractionIssue,
            returnedTextContent: true,
            returnedThoughtContent,
        };
    }

    if (extractionIssue) {
        return {
            code: 'empty-response',
            message: normalizedValue,
            finishReason,
            extractionIssue,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (returnedThoughtContent || finishReason || includesAnySnippet(comparisonText, noImageFailureSnippets)) {
        return {
            code: 'no-image-data',
            message: normalizedValue,
            finishReason,
            extractionIssue: includesAnySnippet(comparisonText, noImageFailureSnippets) ? 'no-image-data' : null,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (includesAnySnippet(comparisonText, emptyFailureSummarySnippets)) {
        return {
            code: 'empty-response',
            message: normalizedValue,
            finishReason,
            extractionIssue: null,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    return null;
};

const localizePromptBlockReason = (t: TranslationGetter, promptBlockReason?: string | null): string | null => {
    const normalizedReason = normalizeReasonToken(promptBlockReason);
    if (!normalizedReason) {
        return null;
    }

    return t(promptBlockReasonTranslationKeys[normalizedReason] || 'generationFailureValuePromptBlockReasonOther');
};

const humanizeReasonToken = (reason: string): string => reason.toLowerCase().replace(/_/g, ' ');

const localizeFinishReason = (t: TranslationGetter, finishReason?: string | null): string | null => {
    const normalizedReason = normalizeReasonToken(finishReason);
    if (!normalizedReason) {
        return null;
    }

    const translationKey = finishReasonTranslationKeys[normalizedReason];
    return translationKey ? t(translationKey) : humanizeReasonToken(normalizedReason);
};

const localizeSafetyCategories = (t: TranslationGetter, categories?: string[] | null): string | null => {
    const localizedCategories = dedupeStrings(
        normalizeBlockedSafetyCategories(categories).map(
            (category) => t(safetyCategoryTranslationKeys[category] || 'generationFailureValueSafetyCategoryOther'),
        ),
    );

    return localizedCategories.length > 0 ? localizedCategories.join(', ') : null;
};

const getFailureSpecificity = (failure: GenerationFailureInfo | null): number => {
    if (!failure) {
        return -1;
    }

    switch (failure.code) {
        case 'policy-blocked':
        case 'safety-blocked':
            return 5;
        case 'text-only':
            return 4;
        case 'no-image-data':
            return 3;
        case 'empty-response':
            return 2;
        case 'unknown':
        default:
            return 0;
    }
};

const normalizeOptionalStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((entry) => normalizeOptionalString(entry)).filter((entry): entry is string => Boolean(entry));
};

export function isGenerationFailureCode(value: unknown): value is GenerationFailureCode {
    return typeof value === 'string' && generationFailureCodes.has(value as GenerationFailureCode);
}

export function normalizeGenerationFailureInfo(value: unknown): GenerationFailureInfo | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const failure = value as Record<string, unknown>;
    if (!isGenerationFailureCode(failure.code)) {
        return null;
    }

    const message = normalizeOptionalString(failure.message);
    if (!message) {
        return null;
    }

    return {
        code: failure.code,
        message,
        promptBlockReason: normalizeOptionalString(failure.promptBlockReason),
        finishReason: normalizeOptionalString(failure.finishReason),
        blockedSafetyCategories: normalizeOptionalStringArray(failure.blockedSafetyCategories),
        extractionIssue: normalizeExtractionIssue(failure.extractionIssue),
        returnedTextContent: failure.returnedTextContent === true,
        returnedThoughtContent: failure.returnedThoughtContent === true,
    };
}

export function resolveDisplayGenerationFailureInfo(source: GenerationFailureDisplaySource): GenerationFailureInfo | null {
    const normalizedFailure = normalizeGenerationFailureInfo(source.failure);
    if (normalizedFailure) {
        return normalizedFailure;
    }

    const normalizedError = normalizeOptionalString(source.error);
    const inferredFailure = normalizedError ? inferGenerationFailureInfoFromErrorText(normalizedError) : null;
    const structuredFailure = buildFailureFromStructuredHints(source);
    if (structuredFailure && inferredFailure) {
        return getFailureSpecificity(inferredFailure) >= getFailureSpecificity(structuredFailure)
            ? inferredFailure
            : structuredFailure;
    }

    return inferredFailure || structuredFailure;
}

export function attachGenerationFailure<T extends Error>(
    error: T,
    failure: GenerationFailureInfo,
): T & GenerationFailureCarrier {
    const normalizedFailure = normalizeGenerationFailureInfo(failure);
    if (normalizedFailure) {
        (error as T & GenerationFailureCarrier).generationFailure = normalizedFailure;
    }

    return error as T & GenerationFailureCarrier;
}

export function getGenerationFailure(error: unknown): GenerationFailureInfo | null {
    if (!error || typeof error !== 'object') {
        return null;
    }

    return normalizeGenerationFailureInfo((error as GenerationFailureCarrier).generationFailure);
}

export function getBlockedSafetyCategories(safetyRatings: unknown): string[] {
    if (!Array.isArray(safetyRatings)) {
        return [];
    }

    return safetyRatings
        .filter(
            (rating: any) =>
                rating &&
                typeof rating === 'object' &&
                (rating.probability === 'HIGH' || rating.probability === 'MEDIUM' || rating.blocked === true),
        )
        .map((rating: any) =>
            String(rating.category ?? 'UNKNOWN')
                .replace('HARM_CATEGORY_', '')
                .replace(/_/g, ' ')
                .toLowerCase(),
        )
        .filter((category, index, categories) => category.length > 0 && categories.indexOf(category) === index);
}

export function hasReturnedTextContent(source: Pick<GenerationFailureSourceState, 'text' | 'thoughts'>): boolean {
    return typeof source.text === 'string' && source.text.trim().length > 0;
}

export function hasReturnedThoughtContent(source: Pick<GenerationFailureSourceState, 'thoughts'>): boolean {
    return typeof source.thoughts === 'string' && source.thoughts.trim().length > 0;
}

export function isSafetyBlockedFinishReason(finishReason: unknown): boolean {
    return typeof finishReason === 'string' && safetyBlockedFinishReasons.has(finishReason);
}

function isNeutralOrMissingFinishReason(finishReason: string | null): boolean {
    return !finishReason || finishReason === 'STOP' || finishReason === 'FINISH_REASON_UNSPECIFIED';
}

export function resolveGenerationFailureInfo(source: GenerationFailureSourceState): GenerationFailureInfo {
    const explicitError = normalizeOptionalString(source.explicitError);
    const promptBlockReason = normalizeOptionalString(source.promptBlockReason);
    const finishReason = normalizeOptionalString(source.finishReason);
    const blockedSafetyCategories = getBlockedSafetyCategories(source.safetyRatings);
    const returnedTextContent = hasReturnedTextContent(source);
    const returnedThoughtContent = hasReturnedThoughtContent(source);

    if (explicitError) {
        return {
            code: 'unknown',
            message: explicitError,
            finishReason,
            extractionIssue: source.extractionIssue ?? null,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (promptBlockReason) {
        return {
            code: 'policy-blocked',
            message: `Prompt was rejected by policy (block reason: ${promptBlockReason}).`,
            promptBlockReason,
            finishReason,
            extractionIssue: source.extractionIssue ?? null,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (blockedSafetyCategories.length > 0 || isSafetyBlockedFinishReason(finishReason)) {
        return {
            code: 'safety-blocked',
            message:
                blockedSafetyCategories.length > 0
                    ? `Model output was blocked by safety filters (${blockedSafetyCategories.join(', ')}).`
                    : 'Model output was blocked by safety filters.',
            finishReason,
            blockedSafetyCategories,
            extractionIssue: source.extractionIssue ?? null,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (returnedTextContent) {
        return {
            code: 'text-only',
            message: 'Model returned text-only content instead of image data.',
            finishReason,
            extractionIssue: source.extractionIssue ?? null,
            returnedTextContent: true,
            returnedThoughtContent,
        };
    }

    if (finishReason === 'NO_IMAGE') {
        return {
            code: 'no-image-data',
            message: 'Model returned no image data (finish reason: NO_IMAGE).',
            finishReason,
            extractionIssue: source.extractionIssue ?? null,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (
        (source.extractionIssue === 'missing-candidates' || source.extractionIssue === 'missing-parts') &&
        isNeutralOrMissingFinishReason(finishReason)
    ) {
        return {
            code: 'empty-response',
            message:
                source.extractionIssue === 'missing-candidates'
                    ? 'Model returned a response without candidates.'
                    : 'Model returned a candidate without content parts.',
            finishReason,
            extractionIssue: source.extractionIssue,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    if (finishReason && finishReason !== 'STOP' && finishReason !== 'FINISH_REASON_UNSPECIFIED') {
        return {
            code: 'no-image-data',
            message: `Model returned no image data (finish reason: ${finishReason}).`,
            finishReason,
            extractionIssue: source.extractionIssue ?? null,
            returnedTextContent,
            returnedThoughtContent,
        };
    }

    return {
        code: 'no-image-data',
        message: 'Model returned no image data.',
        finishReason,
        extractionIssue: source.extractionIssue ?? null,
        returnedTextContent,
        returnedThoughtContent,
    };
}

export function getGenerationFailureHttpStatus(failure: GenerationFailureInfo): number {
    return failure.code === 'policy-blocked' || failure.code === 'safety-blocked' ? 400 : 502;
}

const joinDisplayDetails = (details: Array<string | null | undefined>): string | null => {
    const normalizedDetails = details
        .map((detail) => normalizeOptionalString(detail))
        .filter((detail): detail is string => Boolean(detail));

    return normalizedDetails.length > 0 ? normalizedDetails.join(' ') : null;
};

export function buildStageErrorState(
    t: TranslationGetter,
    failure?: GenerationFailureInfo | null,
    fallbackError?: string | null,
    displayContext?: GenerationFailureDisplayContext | null,
    options?: StageErrorBuildOptions,
): StageErrorState {
    const resolvedFailure = resolveDisplayGenerationFailureInfo({
        failure,
        error: fallbackError,
    });
    const retryDetail = options?.includeRetryDetail === false ? null : t('generationFailureDetailRetry');

    if (!resolvedFailure) {
        return {
            summary: t('generationFailureSummaryUnknown'),
            detail: joinDisplayDetails([fallbackError, retryDetail]),
            failure: null,
            rawError: fallbackError || null,
            displayContext: displayContext ?? null,
        };
    }

    switch (resolvedFailure.code) {
        case 'policy-blocked':
            return {
                summary: t('generationFailureSummaryPolicy'),
                detail: joinDisplayDetails([
                    resolvedFailure.promptBlockReason
                        ? t('generationFailureDetailPromptBlockReason').replace(
                              '{0}',
                              localizePromptBlockReason(t, resolvedFailure.promptBlockReason) ||
                                  resolvedFailure.promptBlockReason,
                          )
                        : null,
                    retryDetail,
                ]),
                failure: resolvedFailure,
                rawError: fallbackError || null,
                displayContext: displayContext ?? null,
            };
        case 'safety-blocked':
            return {
                summary: t('generationFailureSummarySafety'),
                detail: joinDisplayDetails([
                    resolvedFailure.blockedSafetyCategories && resolvedFailure.blockedSafetyCategories.length > 0
                        ? t('generationFailureDetailSafetyCategories').replace(
                              '{0}',
                              localizeSafetyCategories(t, resolvedFailure.blockedSafetyCategories) ||
                                  resolvedFailure.blockedSafetyCategories.join(', '),
                          )
                        : null,
                    !resolvedFailure.blockedSafetyCategories?.length && resolvedFailure.finishReason
                        ? t('generationFailureDetailFinishReason').replace(
                              '{0}',
                              localizeFinishReason(t, resolvedFailure.finishReason) || resolvedFailure.finishReason,
                          )
                        : null,
                    retryDetail,
                ]),
                failure: resolvedFailure,
                rawError: fallbackError || null,
                displayContext: displayContext ?? null,
            };
        case 'text-only':
            return {
                summary: t('generationFailureSummaryTextOnly'),
                detail: joinDisplayDetails([t('generationFailureDetailTextOnly'), retryDetail]),
                failure: resolvedFailure,
                rawError: fallbackError || null,
                displayContext: displayContext ?? null,
            };
        case 'empty-response':
            return {
                summary: t('generationFailureSummaryEmpty'),
                detail: joinDisplayDetails([
                    resolvedFailure.extractionIssue === 'missing-candidates'
                        ? t('generationFailureDetailMissingCandidates')
                        : resolvedFailure.extractionIssue === 'missing-parts'
                          ? t('generationFailureDetailMissingParts')
                          : null,
                    displayContext?.hasSiblingSafetyBlockedFailure
                        ? t('generationFailureDetailPossibleBatchSafetySuppression')
                        : null,
                    retryDetail,
                ]),
                failure: resolvedFailure,
                rawError: fallbackError || null,
                displayContext: displayContext ?? null,
            };
        case 'no-image-data':
            return {
                summary: t('generationFailureSummaryNoImage'),
                detail: joinDisplayDetails([
                    resolvedFailure.returnedThoughtContent && !resolvedFailure.returnedTextContent
                        ? t('generationFailureDetailThoughtsOnly')
                        : null,
                    resolvedFailure.finishReason
                        ? t('generationFailureDetailFinishReason').replace(
                              '{0}',
                              localizeFinishReason(t, resolvedFailure.finishReason) || resolvedFailure.finishReason,
                          )
                        : null,
                    retryDetail,
                ]),
                failure: resolvedFailure,
                rawError: fallbackError || null,
                displayContext: displayContext ?? null,
            };
        case 'unknown':
        default:
            return {
                summary: t('generationFailureSummaryUnknown'),
                detail: joinDisplayDetails([fallbackError || resolvedFailure.message, retryDetail]),
                failure: resolvedFailure,
                rawError: fallbackError || null,
                displayContext: displayContext ?? null,
            };
    }
}

export function formatGenerationFailureDisplayMessage(
    t: TranslationGetter,
    source: GenerationFailureDisplaySource,
    options?: StageErrorBuildOptions,
): string | null {
    const stageError = buildStageErrorState(t, resolveDisplayGenerationFailureInfo(source), source.error, null, options);
    return joinDisplayDetails([stageError.summary, stageError.detail]);
}
