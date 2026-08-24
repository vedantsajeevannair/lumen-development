export interface CitizenCacheAdapter {
  getProfile(): Promise<string | null>;
  setProfile(value: string): Promise<void>;
  clear(): Promise<void>;
}

export const citizenCacheAdapter: CitizenCacheAdapter = {
  async getProfile() {
    return null;
  },
  async setProfile() {
    return undefined;
  },
  async clear() {
    return undefined;
  },
};
export const citizeninfrastructureModule = {
  name: "citizeninfrastructure",
} as const;
