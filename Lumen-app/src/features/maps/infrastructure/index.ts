export interface MapsCacheAdapter {
  getViewport(): Promise<string | null>;
  setViewport(value: string): Promise<void>;
}

export const mapsCacheAdapter: MapsCacheAdapter = {
  async getViewport() {
    return null;
  },
  async setViewport() {
    return undefined;
  },
};
export const mapsinfrastructureModule = {
  name: "mapsinfrastructure",
} as const;
