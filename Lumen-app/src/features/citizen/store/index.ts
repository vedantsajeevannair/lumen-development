export interface CitizenStoreState {
  readonly hydrated: boolean;
  readonly profileLoaded: boolean;
  readonly unreadNotifications: number;
}

export const citizenStore: CitizenStoreState = {
  hydrated: false,
  profileLoaded: false,
  unreadNotifications: 0,
};
export const citizenstoreModule = {
  name: "citizenstore",
} as const;
