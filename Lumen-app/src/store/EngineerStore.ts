export interface EngineerStoreState {
  readonly hydrated: boolean;
  readonly loaded: boolean;
}

export const engineerStore: EngineerStoreState = {
  hydrated: false,
  loaded: false,
};
