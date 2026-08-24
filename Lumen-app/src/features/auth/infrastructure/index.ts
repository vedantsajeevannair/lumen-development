export interface AuthStorageAdapter {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setSession(accessToken: string, refreshToken: string): Promise<void>;
  clear(): Promise<void>;
}

export const authStorageAdapter: AuthStorageAdapter = {
  async getAccessToken() {
    return null;
  },
  async getRefreshToken() {
    return null;
  },
  async setSession() {
    return undefined;
  },
  async clear() {
    return undefined;
  },
};
export const authinfrastructureModule = {
  name: "authinfrastructure",
} as const;
