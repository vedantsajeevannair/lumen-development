export interface AiPromptFormValues {
  readonly prompt: string;
}

export interface AiInsightQueryValues {
  readonly context: string;
}
export const aitypesModule = {
  name: "aitypes",
} as const;
