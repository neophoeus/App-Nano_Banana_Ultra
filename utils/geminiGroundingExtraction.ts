export type GroundingSource = {
    title: string;
    url: string;
    imageUrl?: string;
    sourceType?: 'web' | 'image' | 'context';
};

export type GroundingSupport = {
    chunkIndices: number[];
    sourceIndices?: number[];
    segmentText?: string;
    sourceTitles?: string[];
};

function resolvePrimaryCandidate(response: any): any {
    return response?.candidates?.[0] ?? response?.response?.candidates?.[0];
}

function resolveGroundingMetadata(candidate: any): any {
    return candidate?.groundingMetadata ?? candidate?.grounding_metadata;
}

function resolveGroundingChunks(groundingMetadata: any): any[] {
    if (Array.isArray(groundingMetadata?.groundingChunks)) {
        return groundingMetadata.groundingChunks;
    }
    if (Array.isArray(groundingMetadata?.grounding_chunks)) {
        return groundingMetadata.grounding_chunks;
    }

    return [];
}

function resolveGroundingSupports(groundingMetadata: any): any[] {
    if (Array.isArray(groundingMetadata?.groundingSupports)) {
        return groundingMetadata.groundingSupports;
    }
    if (Array.isArray(groundingMetadata?.grounding_supports)) {
        return groundingMetadata.grounding_supports;
    }

    return [];
}

function resolveGroundingSearchEntryPoint(groundingMetadata: any): any {
    return groundingMetadata?.searchEntryPoint ?? groundingMetadata?.search_entry_point;
}

function resolveGroundingQueryList(groundingMetadata: any, camelCaseKey: string, snakeCaseKey: string): string[] {
    const values = groundingMetadata?.[camelCaseKey] ?? groundingMetadata?.[snakeCaseKey];
    return Array.isArray(values)
        ? values.filter((query: unknown): query is string => typeof query === 'string' && query.trim().length > 0)
        : [];
}

export function extractGroundingSourceData(response: any): {
    sources: GroundingSource[];
    chunkToSourceIndex: Map<number, number>;
} {
    const candidate = resolvePrimaryCandidate(response);
    const groundingMetadata = resolveGroundingMetadata(candidate);
    const chunks = resolveGroundingChunks(groundingMetadata);
    const seen = new Set<string>();
    const sources: GroundingSource[] = [];
    const chunkToSourceIndex = new Map<number, number>();

    for (const [index, chunk] of chunks.entries()) {
        const web = chunk?.web;
        const image = chunk?.image;
        const retrievedContext = chunk?.retrievedContext ?? chunk?.retrieved_context;
        const url =
            image?.sourceUri ||
            image?.source_uri ||
            web?.uri ||
            web?.url ||
            retrievedContext?.uri ||
            retrievedContext?.url;
        const title =
            image?.title || web?.title || web?.domain || retrievedContext?.title || retrievedContext?.domain || url;
        const imageUrl = image?.imageUri || image?.image_uri;
        const sourceType = image ? 'image' : web ? 'web' : retrievedContext ? 'context' : undefined;
        if (!url) {
            continue;
        }

        if (seen.has(url)) {
            const existingIndex = sources.findIndex((source) => source.url === url);
            if (existingIndex >= 0) {
                chunkToSourceIndex.set(index, existingIndex);
            }
            continue;
        }

        seen.add(url);
        sources.push({ title, url, imageUrl, sourceType });
        chunkToSourceIndex.set(index, sources.length - 1);
    }

    return { sources, chunkToSourceIndex };
}

export function extractGroundingDetails(response: any): {
    sources: GroundingSource[];
    webQueries: string[];
    imageQueries: string[];
    searchEntryPointAvailable: boolean;
    searchEntryPointRenderedContent?: string;
    supports: GroundingSupport[];
} {
    const candidate = resolvePrimaryCandidate(response);
    const groundingMetadata = resolveGroundingMetadata(candidate);
    const { sources, chunkToSourceIndex } = extractGroundingSourceData(response);
    const chunks = resolveGroundingChunks(groundingMetadata);
    const supports = resolveGroundingSupports(groundingMetadata).map((support: any) => {
        const rawChunkIndices = support?.groundingChunkIndices ?? support?.grounding_chunk_indices;
        const chunkIndices = Array.isArray(rawChunkIndices)
            ? rawChunkIndices.filter((index: unknown) => typeof index === 'number')
            : [];
        const sourceIndices = Array.from(
            new Set(
                chunkIndices
                    .map((index: number) => chunkToSourceIndex.get(index))
                    .filter((index: number | undefined): index is number => typeof index === 'number'),
            ),
        );
        const sourceTitles = chunkIndices
            .map((index: number) => {
                const chunk = chunks[index];
                const image = chunk?.image;
                const web = chunk?.web;
                const retrievedContext = chunk?.retrievedContext ?? chunk?.retrieved_context;
                return image?.title || web?.title || web?.domain || retrievedContext?.title || retrievedContext?.domain;
            })
            .filter((title: unknown): title is string => typeof title === 'string' && title.trim().length > 0);

        return {
            chunkIndices,
            sourceIndices: sourceIndices.length > 0 ? sourceIndices : undefined,
            segmentText: typeof support?.segment?.text === 'string' ? support.segment.text : undefined,
            sourceTitles: sourceTitles.length > 0 ? Array.from(new Set(sourceTitles)) : undefined,
        };
    });

    const searchEntryPoint = resolveGroundingSearchEntryPoint(groundingMetadata);

    return {
        sources,
        webQueries: resolveGroundingQueryList(groundingMetadata, 'webSearchQueries', 'web_search_queries'),
        imageQueries: resolveGroundingQueryList(groundingMetadata, 'imageSearchQueries', 'image_search_queries'),
        searchEntryPointAvailable: Boolean(searchEntryPoint),
        searchEntryPointRenderedContent:
            typeof searchEntryPoint?.renderedContent === 'string'
                ? searchEntryPoint.renderedContent
                : typeof searchEntryPoint?.rendered_content === 'string'
                  ? searchEntryPoint.rendered_content
                  : undefined,
        supports,
    };
}
