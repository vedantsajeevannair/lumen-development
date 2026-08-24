import type {
  GenerateAiInsightsCommand,
  LoadAiSuggestionsQuery,
  SubmitAiPromptCommand,
} from "../application";
import type { AiInsight, AiSuggestion } from "../domain";

export interface AiApiService {
  generateInsights(command: GenerateAiInsightsCommand): Promise<AiInsight[]>;
  submitPrompt(command: SubmitAiPromptCommand): Promise<{ conversationId: string }>;
  loadSuggestions(query: LoadAiSuggestionsQuery): Promise<AiSuggestion[]>;
}

export const aiApiService: AiApiService = {
  async generateInsights() {
    return [];
  },
  async submitPrompt() {
    return { conversationId: "" };
  },
  async loadSuggestions() {
    return [];
  },
};
export const aiservicesModule = {
  name: "aiservices",
} as const;
