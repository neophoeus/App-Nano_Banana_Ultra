import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { AspectRatio, GroundingMetadata, ImageSize } from '../types';
import { EditorContextSnapshot } from './useWorkspaceEditorActions';
import { GroundingSelection } from './useSelectedResultState';

type UseWorkspaceTransientUiStateArgs = {
    selectedGrounding: GroundingMetadata | null;
    activeResultGrounding: GroundingMetadata | null;
    activeGroundingSelection: GroundingSelection;
    setActiveGroundingSelection: Dispatch<SetStateAction<GroundingSelection>>;
    setFocusLinkedGroundingItems: Dispatch<SetStateAction<boolean>>;
    isEditing: boolean;
    objectImages: string[];
    characterImages: string[];
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    batchSize: number;
};

type UseWorkspaceTransientUiStateReturn = {
    editorContextSnapshot: EditorContextSnapshot | null;
    setEditorContextSnapshot: Dispatch<SetStateAction<EditorContextSnapshot | null>>;
    editorPrompt: string;
    setEditorPrompt: Dispatch<SetStateAction<string>>;
    editorObjectImages: string[];
    setEditorObjectImages: Dispatch<SetStateAction<string[]>>;
    editorCharacterImages: string[];
    setEditorCharacterImages: Dispatch<SetStateAction<string[]>>;
    editorInitialState: EditorContextSnapshot;
};

export function useWorkspaceTransientUiState({
    selectedGrounding,
    activeResultGrounding,
    activeGroundingSelection,
    setActiveGroundingSelection,
    setFocusLinkedGroundingItems,
    isEditing,
    objectImages,
    characterImages,
    aspectRatio,
    imageSize,
    batchSize,
}: UseWorkspaceTransientUiStateArgs): UseWorkspaceTransientUiStateReturn {
    const [editorContextSnapshot, setEditorContextSnapshot] = useState<EditorContextSnapshot | null>(null);
    const [editorPrompt, setEditorPrompt] = useState('');
    const [editorObjectImages, setEditorObjectImages] = useState<string[]>([]);
    const [editorCharacterImages, setEditorCharacterImages] = useState<string[]>([]);

    useEffect(() => {
        setActiveGroundingSelection(null);
    }, [activeResultGrounding, selectedGrounding, setActiveGroundingSelection]);

    useEffect(() => {
        if (!activeGroundingSelection) {
            setFocusLinkedGroundingItems(false);
        }
    }, [activeGroundingSelection, setFocusLinkedGroundingItems]);

    useEffect(() => {
        if (!isEditing) {
            setEditorContextSnapshot(null);
            setEditorPrompt('');
            setEditorObjectImages([]);
            setEditorCharacterImages([]);
        }
    }, [isEditing]);

    useEffect(() => {
        if (!isEditing || !editorContextSnapshot) {
            return;
        }

        setEditorObjectImages([]);
        setEditorCharacterImages([]);
    }, [editorContextSnapshot, isEditing]);

    const editorInitialState = useMemo<EditorContextSnapshot>(
        () => ({
            prompt: editorContextSnapshot?.prompt ?? '',
            objectImages: editorContextSnapshot ? [] : objectImages,
            characterImages: editorContextSnapshot ? [] : characterImages,
            ratio: editorContextSnapshot?.editorInitialRatio || editorContextSnapshot?.ratio || aspectRatio,
            size: editorContextSnapshot?.editorInitialSize || editorContextSnapshot?.size || imageSize,
            batchSize: editorContextSnapshot?.batchSize || batchSize,
            model: editorContextSnapshot?.model || 'gemini-2.5-flash-image',
            style: editorContextSnapshot?.style || 'None',
            outputFormat: editorContextSnapshot?.outputFormat || 'images-only',
            temperature: editorContextSnapshot?.temperature || 1.0,
            thinkingLevel: editorContextSnapshot?.thinkingLevel || 'minimal',
            includeThoughts: editorContextSnapshot?.includeThoughts || false,
            googleSearch: editorContextSnapshot?.googleSearch || false,
            imageSearch: editorContextSnapshot?.imageSearch || false,
            editorInitialRatio: editorContextSnapshot?.editorInitialRatio,
            editorInitialSize: editorContextSnapshot?.editorInitialSize,
            editorPreparedSource: editorContextSnapshot?.editorPreparedSource,
            sourceHistoryId: editorContextSnapshot?.sourceHistoryId,
            sourceLineageAction: editorContextSnapshot?.sourceLineageAction,
        }),
        [aspectRatio, batchSize, characterImages, editorContextSnapshot, imageSize, objectImages],
    );

    return {
        editorContextSnapshot,
        setEditorContextSnapshot,
        editorPrompt,
        setEditorPrompt,
        editorObjectImages,
        setEditorObjectImages,
        editorCharacterImages,
        setEditorCharacterImages,
        editorInitialState,
    };
}
