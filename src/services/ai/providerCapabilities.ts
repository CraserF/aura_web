import type { ProviderConfig, ProviderId } from '@/types';

export const OLLAMA_BASELINE_MODEL = 'gemma4:e2b';
export const OLLAMA_BASELINE_LABEL = 'gemma4:e2b (gemma4 · 5.1B · Q4_K_M)';

export interface ProviderCapabilityProfile {
  providerId: ProviderId;
  selectedModel?: string;
  toolSupport: 'full' | 'limited';
  structuredOutput: 'reliable' | 'best-effort';
  secondaryEvaluation: 'full' | 'skip';
  recommendedBaselineModel?: string;
  isRecommendedBaseline: boolean;
  notes: string[];
  warnings: string[];
}

export function getProviderCapabilityProfile(
  providerConfig: Pick<ProviderConfig, 'id' | 'model'>,
): ProviderCapabilityProfile {
  const selectedModel = providerConfig.model?.trim() || undefined;

  if (providerConfig.id !== 'ollama') {
    return {
      providerId: providerConfig.id,
      selectedModel,
      toolSupport: 'full',
      structuredOutput: 'reliable',
      secondaryEvaluation: 'full',
      isRecommendedBaseline: true,
      notes: [],
      warnings: [],
    };
  }

  const isRecommendedBaseline = selectedModel === OLLAMA_BASELINE_MODEL;
  const warnings = !selectedModel || isRecommendedBaseline
    ? []
    : [
        `Aura's first local-model stabilization pass is tuned for ${OLLAMA_BASELINE_MODEL}. Other Ollama models remain best-effort and may be less consistent.`,
      ];

  return {
    providerId: providerConfig.id,
    selectedModel,
    toolSupport: 'limited',
    structuredOutput: 'best-effort',
    secondaryEvaluation: 'skip',
    recommendedBaselineModel: OLLAMA_BASELINE_MODEL,
    isRecommendedBaseline,
    notes: [
      'Aura uses Ollama through chat completions and treats local models as a generation-first path.',
      'Strict structured review and tool-heavy follow-up loops are reduced for local models to avoid noisy failures.',
      'The first local quality pass is focused on documents and presentations; spreadsheets stay correctness-first.',
    ],
    warnings,
  };
}
