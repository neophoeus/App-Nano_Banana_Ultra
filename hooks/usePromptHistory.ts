/**
 * F3: Prompt History — Persists successful prompts in localStorage.
 * F6: Prompt Templates — Built-in templates for common scenarios.
 */
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'nbu_prompt_history';
const MAX_HISTORY = 30;

export interface PromptHistoryItem {
    text: string;
    usedAt: number;
}

// --- F6: Prompt Templates ---
export interface PromptTemplate {
    id: string;
    label: string;      // short display name
    labelKey: string;    // i18n key (fall back to label)
    prompt: string;
    icon: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
    { id: 'portrait', label: 'Portrait', labelKey: 'tplPortrait', icon: '👤', prompt: 'A professional studio portrait with soft lighting, shallow depth of field, and natural skin texture. Eye-level perspective, warm tones.' },
    { id: 'landscape', label: 'Landscape', labelKey: 'tplLandscape', icon: '🏔️', prompt: 'A breathtaking panoramic landscape at golden hour with dramatic clouds, rich natural colors, and a sense of depth and scale.' },
    { id: 'product', label: 'Product', labelKey: 'tplProduct', icon: '📦', prompt: 'A sleek product photography shot on a clean background with studio lighting, precise reflections, and premium feel.' },
    { id: 'animal', label: 'Animal', labelKey: 'tplAnimal', icon: '🐾', prompt: 'A stunning wildlife photograph capturing an animal in its natural habitat, with sharp detail and beautiful bokeh background.' },
    { id: 'food', label: 'Food', labelKey: 'tplFood', icon: '🍽️', prompt: 'Appetizing food photography with warm overhead lighting, careful plating, steam or motion captured, and rustic table setting.' },
    { id: 'interior', label: 'Interior', labelKey: 'tplInterior', icon: '🏠', prompt: 'A modern interior design render with natural lighting streaming through windows, clean lines, curated décor, and warm atmosphere.' },
    { id: 'character', label: 'Character', labelKey: 'tplCharacter', icon: '⚔️', prompt: 'A detailed fantasy character concept art with intricate armor/clothing design, dynamic pose, and rich background environment.' },
    { id: 'scifi', label: 'Sci-Fi', labelKey: 'tplSciFi', icon: '🚀', prompt: 'A futuristic sci-fi scene with advanced technology, neon lighting, volumetric fog, and a cinematic composition suggesting a larger narrative.' },
    { id: 'abstract', label: 'Abstract', labelKey: 'tplAbstract', icon: '🎨', prompt: 'An abstract artwork with bold colors, dynamic shapes, flowing gradients, and a strong sense of movement and emotional depth.' },
    { id: 'architecture', label: 'Architecture', labelKey: 'tplArchitecture', icon: '🏛️', prompt: 'A stunning architectural photograph emphasizing geometric patterns, leading lines, dramatic perspective, and interplay of light and shadow.' },
    { id: 'underwater', label: 'Underwater', labelKey: 'tplUnderwater', icon: '🐠', prompt: 'A mesmerizing underwater scene with vibrant coral reefs, tropical fish, light rays penetrating the water, and crystal blue clarity.' },
    { id: 'poster', label: 'Poster', labelKey: 'tplPoster', icon: '🎬', prompt: 'A cinematic movie poster design with dramatic composition, bold typography area, atmospheric lighting, and a compelling visual narrative.' },
];

// --- F3: LocalStorage & Backend Prompt History ---

function loadHistoryFallback(): PromptHistoryItem[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function persistHistoryFallback(items: PromptHistoryItem[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* storage full or disabled */ }
}

export function usePromptHistory() {
    const [history, setHistory] = useState<PromptHistoryItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial Load: Try Backend first, fallback to localStorage
    useEffect(() => {
        let mounted = true;
        fetch('/api/load-prompts')
            .then(res => {
                if (!res.ok) throw new Error('API load failed');
                return res.json();
            })
            .then(data => {
                if (mounted) {
                    // If backend is empty but localStorage has data (migration scenario)
                    const fallbackData = loadHistoryFallback();
                    if (data.length === 0 && fallbackData.length > 0) {
                        setHistory(fallbackData);
                        // Save the migrated data to backend
                        fetch('/api/save-prompts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(fallbackData),
                        }).catch(() => { });
                    } else {
                        setHistory(Array.isArray(data) ? data : []);
                    }
                    setIsLoaded(true);
                }
            })
            .catch(err => {
                console.warn('Failed to load prompts from backend, using localStorage fallback:', err);
                if (mounted) {
                    setHistory(loadHistoryFallback());
                    setIsLoaded(true);
                }
            });

        return () => { mounted = false; };
    }, []);

    // Sync with backend & localStorage whenever history changes (after initial load)
    useEffect(() => {
        if (!isLoaded) return; // Don't wipe backend on first render before load finishes

        persistHistoryFallback(history);

        fetch('/api/save-prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(history),
        }).catch(err => {
            console.error('Failed to sync prompt history to backend:', err);
        });

    }, [history, isLoaded]);

    const addPrompt = useCallback((text: string) => {
        if (!text || text.trim().length < 5) return; // Ignore very short prompts
        const trimmed = text.trim();
        setHistory(prev => {
            // De-duplicate: remove existing identical prompt
            const filtered = prev.filter(item => item.text !== trimmed);
            // Add to front
            const next = [{ text: trimmed, usedAt: Date.now() }, ...filtered];
            return next.slice(0, MAX_HISTORY);
        });
    }, []);

    const removePrompt = useCallback((text: string) => {
        setHistory(prev => prev.filter(item => item.text !== text));
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    return { promptHistory: history, addPrompt, removePrompt, clearHistory };
}
