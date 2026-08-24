export interface AiCacheAdapter {
  getConversations(): Promise<string | null>;
  setConversations(value: string): Promise<void>;
}

export const aiCacheAdapter: AiCacheAdapter = {
  async getConversations() {
    return null;
  },
  async setConversations() {
    return undefined;
  },
};
export const aiinfrastructureModule = {
  name: "aiinfrastructure",
} as const;
