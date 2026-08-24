export interface UseAiInsightsResult {
  readonly loading: boolean;
  readonly refreshedAt: string | null;
}

export function useAiInsights(): UseAiInsightsResult {
  return {
    loading: false,
    refreshedAt: null,
  } as const;
}

export interface UseAiAssistantResult {
  readonly composing: boolean;
}

export function useAiAssistant(): UseAiAssistantResult {
  return {
    composing: false,
  } as const;
}
export const aihooksModule = {
  name: "aihooks",
} as const;
