import React, { useState } from 'react';
import { STYLE_CATEGORIES, STYLES_BY_CATEGORY } from '../constants';
import { ImageStyle, ImageStyleCategory } from '../types';
import { Language, getTranslation } from '../utils/translations';

interface StyleSelectorProps {
    selectedStyle: ImageStyle;
    onSelect: (style: ImageStyle) => void;
    label?: string;
    currentLanguage?: Language;
    className?: string; // Allow custom styling container
}

export const getStyleIcon = (style: ImageStyle, isSelected: boolean) => {
    // Common classes
    const selectedClass = 'w-6 h-6 filter drop-shadow-sm transition-all duration-300';
    const unselectedClass =
        'w-5 h-5 text-gray-400 dark:text-gray-400 opacity-80 group-hover:text-gray-600 dark:group-hover:text-gray-200 group-hover:opacity-100 transition-all duration-300';
    const cls = isSelected ? selectedClass : unselectedClass;

    // Simplified SVGs for readability and performance
    switch (style) {
        case 'None':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <path d="M6 6L18 18" strokeWidth="2" />
                </svg>
            );

        // --- PHOTO ---
        case 'Photorealistic':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    <path d="M18 9h.01" strokeWidth="3" />
                </svg>
            );
        case 'Cinematic':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18v12H3z" strokeWidth="2" />
                    <path d="M3 6h2v12H3zM19 6h2v12h-2z" fill="currentColor" fillOpacity={isSelected ? 0.2 : 0} />
                </svg>
            );
        case 'Film Noir':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8h16c0 4.41-3.59 8-8 8z"
                        fill={isSelected ? 'currentColor' : 'none'}
                    />
                </svg>
            );
        case 'Vintage Polaroid':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="4" y="2" width="16" height="20" rx="1" strokeWidth="2" />
                    <rect x="6" y="4" width="12" height="12" strokeWidth="1.5" />
                </svg>
            );
        case 'Macro':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="7" strokeWidth="2" />
                    <path d="M16 16l5 5" strokeWidth="2" />
                    <circle cx="11" cy="11" r="3" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );
        case 'Long Exposure':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M2 8h20M2 12h20M2 16h20" strokeWidth="2" strokeDasharray="4 2" />
                    <path d="M12 4v16" strokeWidth="2" />
                </svg>
            );
        case 'Double Exposure':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="9" cy="12" r="6" strokeWidth="2" opacity="0.7" />
                    <circle cx="15" cy="12" r="6" strokeWidth="2" opacity="0.7" />
                </svg>
            );
        case 'Tilt-Shift':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="2" y="4" width="20" height="16" rx="2" strokeWidth="2" />
                    <path d="M2 10h20M2 14h20" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
            );
        case 'Knolling':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="4" y="4" width="6" height="6" />
                    <rect x="14" y="4" width="6" height="6" />
                    <rect x="4" y="14" width="6" height="6" />
                    <rect x="14" y="14" width="6" height="6" strokeWidth="2" />
                </svg>
            );

        // --- CLASSIC ---
        case 'Oil Painting':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                        d="M12 2C7.5 2 4 6.5 4 10.5c0 3 2.5 5.5 5 5.5h6c2.5 0 5-2.5 5-5.5C20 6.5 16.5 2 12 2z"
                        strokeWidth="2"
                    />
                    <circle cx="9" cy="10" r="1.5" />
                    <circle cx="15" cy="10" r="1.5" />
                    <path d="M12 22v-4" strokeWidth="2" />
                </svg>
            );
        case 'Watercolor':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                        d="M12 22C17.52 22 22 17.52 22 12c0-5.52-8-10-10-10S2 6.48 2 12c0 5.52 4.48 10 10 10z"
                        strokeWidth="2"
                    />
                    <path d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );
        case 'Pencil Sketch':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14 2l6 6-12 12H4v-4L14 2z" strokeWidth="2" />
                    <path d="M14 6l2 2" strokeWidth="1" />
                </svg>
            );
        case 'Ukiyo-e':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                        d="M2 18c2.5-3.5 6-4 9-1 3 3 6.5 2.5 9-1V8c-2.5 3.5-6 4-9 1-3-3-6.5-2.5-9 1v9z"
                        strokeWidth="2"
                    />
                    <circle cx="18" cy="5" r="2" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );
        case 'Ink Wash':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 16c-2 2-5 3-9 1-4-2-6 0-9 3" strokeWidth="2" />
                    <path
                        d="M12 6c-1.5 0-3 1-3 2.5S10 12 12 12s3-1 3-2.5S13.5 6 12 6z"
                        fill={isSelected ? 'currentColor' : 'none'}
                    />
                </svg>
            );
        case 'Impressionism':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="6" cy="6" r="2" />
                    <circle cx="18" cy="6" r="2" />
                    <circle cx="6" cy="18" r="2" />
                    <circle cx="18" cy="18" r="2" />
                    <circle cx="12" cy="12" r="4" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );
        case 'Mosaic':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="8" height="8" rx="1" />
                    <rect x="13" y="3" width="8" height="8" rx="1" />
                    <rect x="3" y="13" width="8" height="8" rx="1" />
                    <rect x="13" y="13" width="8" height="8" rx="1" />
                </svg>
            );
        case 'Pastel':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="8" strokeWidth="2" />
                    <path d="M8 8l8 8" strokeWidth="1" />
                </svg>
            );
        case 'Art Nouveau':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2c5 0 5 5 10 5v10c-5 0-5 5-10 5s-5-5-10-5V7c5 0 5-5 10-5z" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );
        case 'Baroque':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" strokeWidth="2" />
                    <path d="M7 8c1-2 3-2 5 0s4 2 5 0" strokeWidth="1.5" />
                    <path d="M7 14c1-2 3-2 5 0s4 2 5 0" strokeWidth="1.5" />
                    <circle cx="12" cy="11" r="2" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );
        case 'Art Deco':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2l10 5v10l-10 5-10-5V7z" strokeWidth="2" />
                    <path d="M12 7l5 2.5v5L12 17l-5-2.5v-5z" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="1.5" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );

        // --- DIGITAL ---
        case '3D Render':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 3l8 4.5v9l-8 4.5-8-4.5v-9L12 3z" strokeWidth="2" />
                    <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" strokeWidth="1" />
                </svg>
            );
        case 'Anime':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2L2 22h20L12 2z" strokeWidth="2" />
                    <path d="M8 12h8" strokeWidth="2" />
                    <circle cx="12" cy="8" r="1.5" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );
        case 'Cyberpunk':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M2 12h20M2 12l6-6M2 12l6 6" strokeWidth="2" />
                    <rect x="12" y="4" width="8" height="16" rx="2" strokeWidth="2" />
                </svg>
            );
        case 'Pixel Art':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="4" y="4" width="4" height="4" />
                    <rect x="10" y="4" width="4" height="4" />
                    <rect x="16" y="4" width="4" height="4" />
                    <rect x="4" y="10" width="4" height="4" />
                    <rect x="10" y="10" width="4" height="4" />
                    <rect x="16" y="10" width="4" height="4" />
                    <rect x="4" y="16" width="4" height="4" />
                    <rect x="10" y="16" width="4" height="4" />
                    <rect x="16" y="16" width="4" height="4" />
                </svg>
            );
        case 'Low Poly':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2L2 22h20L12 2z" strokeWidth="2" />
                    <path d="M12 2v20" strokeWidth="1" />
                </svg>
            );
        case 'Vaporwave':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M2 18h20M2 22h20M4 14h16" strokeWidth="2" />
                </svg>
            );
        case 'Isometric':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 3L2 8v8l10 5 10-5V8z" strokeWidth="2" />
                    <path d="M2 8l10 5 10-5M12 13v8" strokeWidth="1" />
                </svg>
            );
        case 'Vector Art':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="6" cy="6" r="3" />
                    <circle cx="18" cy="18" r="3" />
                    <path d="M6 6l12 12" strokeWidth="2" />
                </svg>
            );
        case 'Glitch Art':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M2 4h20M2 8h16M6 12h16M2 16h18M4 20h14" strokeWidth="2" strokeDasharray="2 2" />
                </svg>
            );
        case 'Manga':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                    <path d="M12 3v18M3 12h18" strokeWidth="1.5" />
                    <circle cx="7" cy="7" r="2" fill={isSelected ? 'currentColor' : 'none'} />
                    <path d="M15 15l3 3M18 15l-3 3" strokeWidth="1.5" />
                </svg>
            );
        case 'Chibi':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="8" r="7" strokeWidth="2" />
                    <circle cx="9" cy="7" r="1.5" fill="currentColor" />
                    <circle cx="15" cy="7" r="1.5" fill="currentColor" />
                    <path d="M9 11c1.5 1 4.5 1 6 0" strokeWidth="1.5" />
                    <path d="M10 15v5M14 15v5" strokeWidth="2" />
                    <path d="M8 20h3M13 20h3" strokeWidth="2" />
                </svg>
            );

        // --- STYLIZED ---
        case 'Surrealism':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <path d="M8 14s2 2 4 2 4-2 4-2" strokeWidth="2" />
                    <circle cx="9" cy="9" r="1.5" />
                    <circle cx="15" cy="9" r="1.5" />
                </svg>
            );
        case 'Pop Art':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="2" y="2" width="9" height="9" />
                    <rect x="13" y="2" width="9" height="9" />
                    <rect x="2" y="13" width="9" height="9" />
                    <rect x="13" y="13" width="9" height="9" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );
        case 'Psychedelic':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                        strokeWidth="2"
                    />
                    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" strokeWidth="1" />
                </svg>
            );
        case 'Gothic':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2L4 22h16L12 2z" strokeWidth="2" />
                    <path d="M12 2v20" strokeWidth="1" />
                    <path d="M8 12h8" strokeWidth="1" />
                </svg>
            );
        case 'Steampunk':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeWidth="2" />
                </svg>
            );
        case 'Comic Book':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2" />
                    <circle cx="10" cy="10" r="1" fill="currentColor" />
                    <circle cx="14" cy="10" r="1" fill="currentColor" />
                </svg>
            );
        case 'Fantasy Art':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z" strokeWidth="2" />
                </svg>
            );
        case 'Stained Glass':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2L2 22h20L12 2z" strokeWidth="2" />
                    <path d="M12 2v20M7 12h10" strokeWidth="1" />
                </svg>
            );
        case 'Graffiti':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M4 16l4-8 4 8m-6-3h4" strokeWidth="2" />
                    <path d="M15 16l-1-4 2-2 2 2-1 4" strokeWidth="2" />
                    <path d="M2 20h20" strokeWidth="2" />
                </svg>
            );

        // --- CRAFT ---
        case 'Claymation':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <circle cx="9" cy="10" r="1.5" />
                    <circle cx="15" cy="10" r="1.5" />
                    <path d="M9 16c2 1 4 1 6 0" strokeWidth="2" />
                </svg>
            );
        case 'Origami':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2L2 12l10 10 10-10L12 2z" strokeWidth="2" />
                    <path d="M12 2v20M2 12h20" strokeWidth="1" />
                </svg>
            );
        case 'Knitted':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M2 12c2-2 2-6 6-6s4 4 6 6 2-6 6-6 4 4 6 6" strokeWidth="2" />
                    <path d="M2 16c2-2 2-6 6-6s4 4 6 6 2-6 6-6 4 4 6 6" strokeWidth="2" />
                </svg>
            );
        case 'Paper Cutout':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
                    <rect x="8" y="8" width="8" height="8" rx="1" strokeWidth="2" />
                </svg>
            );
        case 'Wood Carving':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="5" y="4" width="14" height="16" rx="2" strokeWidth="2" />
                    <path d="M5 8h14M5 12h14M5 16h14" strokeWidth="1" />
                </svg>
            );
        case 'Porcelain':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M6 2h12v4c0 6-3 14-6 14s-6-8-6-14V2z" strokeWidth="2" />
                    <path d="M6 6h12" strokeWidth="1" />
                </svg>
            );
        case 'Embroidery':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M4 12h16" strokeWidth="2" strokeDasharray="3 3" />
                    <path d="M12 4v16" strokeWidth="2" strokeDasharray="3 3" />
                    <circle cx="12" cy="12" r="8" strokeWidth="2" />
                </svg>
            );
        case 'Crystal':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2l8 6-4 14H8L4 8l8-6z" strokeWidth="2" />
                    <path d="M12 2v10l8 6M4 8l8 4 8-4" strokeWidth="1" />
                </svg>
            );

        // --- DESIGN ---
        case 'Blueprint':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" strokeWidth="2" />
                    <path d="M3 12h18M12 3v18" strokeWidth="1" strokeDasharray="2 2" />
                    <circle cx="12" cy="12" r="4" strokeWidth="1" />
                </svg>
            );
        case 'Sticker':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2l3 6 6 1-5 4 2 7-6-4-6 4 2-7-5-4 6-1 3-6z" strokeWidth="2" strokeLinejoin="round" />
                    <path
                        d="M12 2l3 6 6 1-5 4 2 7-6-4-6 4 2-7-5-4 6-1 3-6z"
                        strokeWidth="4"
                        stroke="currentColor"
                        strokeOpacity="0.3"
                        fill="none"
                    />
                </svg>
            );
        case 'Doodle':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 12c2-2 4 4 6 0s4-4 6 0 4 4 6 0" strokeWidth="2" />
                    <path d="M4 6c3 0 3 3 6 0s3-3 6 0" strokeWidth="2" />
                    <path d="M2 18c4-1 6 2 10-1s6-2 10 1" strokeWidth="2" />
                </svg>
            );
        case 'Neon':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        case 'Flat Design':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="2" />
                    <circle cx="9" cy="9" r="3" fill={isSelected ? 'currentColor' : 'none'} />
                    <rect x="14" y="14" width="5" height="5" rx="1" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );
        case 'Miniature':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M2 16l5-4 4 3 5-6 6 4" strokeWidth="2" />
                    <rect x="8" y="10" width="4" height="6" strokeWidth="1.5" />
                    <path d="M10 8l2-3 2 3" strokeWidth="1.5" />
                    <circle cx="18" cy="5" r="2" fill={isSelected ? 'currentColor' : 'none'} />
                </svg>
            );

        default:
            return null;
    }
};

const StyleSelector: React.FC<StyleSelectorProps> = ({
    selectedStyle,
    onSelect,
    label,
    currentLanguage = 'en' as Language,
    className = '',
}) => {
    const t = (key: string) => getTranslation(currentLanguage, key);

    // Initialize selected category based on the currently selected style
    const initialCategory =
        STYLE_CATEGORIES.find((cat) => STYLES_BY_CATEGORY[cat.id].includes(selectedStyle) && cat.id !== 'All')?.id ||
        'All';

    const [activeCategory, setActiveCategory] = useState<ImageStyleCategory>(initialCategory);

    const stylesToShow = STYLES_BY_CATEGORY[activeCategory];

    // Helper to generate key: Remove all non-alphanumeric chars to match translations.ts keys
    const getStyleKey = (s: string) => 'style' + s.replace(/[^a-zA-Z0-9]/g, '');

    return (
        <div className={`space-y-3 ${className}`}>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {label || t('style')}
            </label>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 nbu-scrollbar-subtle">
                {STYLE_CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`
              px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border flex-shrink-0
              ${
                  activeCategory === cat.id
                      ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-800 dark:hover:text-white'
              }
            `}
                    >
                        {t(`cat${cat.id}`)}
                    </button>
                ))}
            </div>

            {/* Style Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto nbu-scrollbar-subtle pr-1 pb-2">
                {stylesToShow.map((style) => (
                    <button
                        key={style}
                        onClick={() => onSelect(style)}
                        className={`
              group flex items-center justify-start gap-2 px-2 py-2 text-[10px] sm:text-xs font-medium rounded-lg transition-all border min-h-[44px]
              ${
                  selectedStyle === style
                      ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-800 dark:hover:text-gray-200'
              }
            `}
                    >
                        <div
                            className={`p-1 rounded-md transition-colors shrink-0 ${selectedStyle === style ? 'bg-amber-500/20 text-amber-500' : 'bg-gray-100 dark:bg-black/30 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
                        >
                            {getStyleIcon(style, selectedStyle === style)}
                        </div>
                        {/* Allow text wrapping */}
                        <span className="text-left leading-tight break-words w-full">{t(getStyleKey(style))}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StyleSelector;
