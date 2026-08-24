export interface GenerateAiInsightsCommand {
  readonly context: string;
}

export interface SubmitAiPromptCommand {
  readonly prompt: string;
}

export interface LoadAiSuggestionsQuery {
  readonly subject: string;
}
export const aiapplicationModule = {
  name: "aiapplication",
} as const;
