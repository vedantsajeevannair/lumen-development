export interface UseAuthState {
  readonly initialized: boolean;
  readonly authenticated: boolean;
}

export function useAuth(): UseAuthState {
  return {
    initialized: false,
    authenticated: false,
  } as const;
}
