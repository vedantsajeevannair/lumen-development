export interface UserStoreState {
  readonly hydrated: boolean;
  readonly ready: boolean;
}

export const userStore: UserStoreState = {
  hydrated: false,
  ready: false,
};
