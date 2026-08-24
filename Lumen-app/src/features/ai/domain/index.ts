export interface AiInsight {
  readonly id: string;
  readonly title: string;
  readonly score: number;
}

export interface AiConversation {
  readonly id: string;
  readonly prompt: string;
}

export interface AiSuggestion {
  readonly id: string;
  readonly message: string;
}
export const aidomainModule = {
  name: "aidomain",
} as const;
