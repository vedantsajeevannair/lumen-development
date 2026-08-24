export interface LocationStoreState {
  readonly hydrated: boolean;
  readonly tracked: boolean;
}

export const locationStore: LocationStoreState = {
  hydrated: false,
  tracked: false,
};
