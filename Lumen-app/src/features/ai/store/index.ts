export interface AiStoreState {
  readonly hydrated: boolean;
  readonly assistantOpen: boolean;
  readonly insightCount: number;
}

export const aiStore: AiStoreState = {
  hydrated: false,
  assistantOpen: false,
  insightCount: 0,
};
export const aistoreModule = {
  name: "aistore",
} as const;
