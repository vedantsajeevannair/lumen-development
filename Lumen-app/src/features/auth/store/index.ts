export interface AuthStoreState {
  readonly hydrated: boolean;
  readonly authenticated: boolean;
  readonly role: "citizen" | "engineer" | "admin" | null;
}

export const authStore: AuthStoreState = {
  hydrated: false,
  authenticated: false,
  role: null,
};
export const authstoreModule = {
  name: "authstore",
} as const;
