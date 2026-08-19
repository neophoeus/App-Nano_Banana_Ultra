import type {
    GenerateOptions,
    ImageReceivedResult,
    PromptThinkingLevel,
    ResultPart,
    SafetyThresholds,
} from '../../types';
import type { Language } from '../../utils/translations';
import type { LiveProgressStreamTruthSummary } from '../../utils/liveProgressCapabilities';

export type GenerationLiveProgressEvent =
    | {
          type: 'start';
          sessionId: string;
          slotIndex?: number;
          batchSessionId?: string;
      }
    | {
          type: 'result-part';
          sessionId: string;
          part: ResultPart;
          slotIndex?: number;
          batchSessionId?: string;
      }
    | {
          type: 'summary';
          sessionId: string;
          summary: LiveProgressStreamTruthSummary;
          slotIndex?: number;
          batchSessionId?: string;
      };

export interface ProgressCallbacks {
    onImageReceived?: (
        url: string,
        slotIndex: number,
    ) => Promise<ImageReceivedResult | undefined> | ImageReceivedResult | undefined;
    onLog?: (msg: string) => void;
    abortSignal?: AbortSignal;
    onProgress?: (completed: number, total: number) => void;
    onResult?: (result: any) => void;
    onLiveProgressEvent?: (event: GenerationLiveProgressEvent) => void;
    onSlotStart?: (slotIndex: number) => void;
}

export interface WorkspaceExecutionProvider {
    readonly id: 'local' | 'direct';

    checkApiKey(): Promise<boolean>;
    promptForApiKey(): Promise<void>;

    generateImages(
        options: GenerateOptions,
        batchSize: number,
        callbacks: ProgressCallbacks,
    ): Promise<any[]>;

    enhancePrompt(
        currentPrompt: string,
        lang: Language,
        safetyThresholds?: Partial<SafetyThresholds>,
        thinkingLevel?: PromptThinkingLevel,
    ): Promise<string>;

    generateRandomPrompt(
        lang: Language,
        safetyThresholds?: Partial<SafetyThresholds>,
        thinkingLevel?: PromptThinkingLevel,
    ): Promise<string>;

    generatePromptFromImage(
        imageDataUrl: string,
        lang: Language,
        safetyThresholds?: Partial<SafetyThresholds>,
        thinkingLevel?: PromptThinkingLevel,
    ): Promise<string>;
}
