export interface MapsStoreState {
  readonly hydrated: boolean;
  readonly selectedMarkerId: string | null;
  readonly searchActive: boolean;
}

export const mapsStore: MapsStoreState = {
  hydrated: false,
  selectedMarkerId: null,
  searchActive: false,
};
export const mapsstoreModule = {
  name: "mapsstore",
} as const;
