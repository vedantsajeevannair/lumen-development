import type { AiInsightQueryValues, AiPromptFormValues } from "../types";

export function isValidAiPrompt(values: AiPromptFormValues): boolean {
  return values.prompt.length > 0;
}

export function isValidAiInsightQuery(values: AiInsightQueryValues): boolean {
  return values.context.length > 0;
}
export const aivalidationModule = {
  name: "aivalidation",
} as const;
