export interface CitizenStoreState {
  readonly hydrated: boolean;
  readonly loaded: boolean;
}

export const citizenStore: CitizenStoreState = {
  hydrated: false,
  loaded: false,
};
