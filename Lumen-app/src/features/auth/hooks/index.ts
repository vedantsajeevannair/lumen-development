export interface UseAuthSessionResult {
  readonly hydrated: boolean;
  readonly authenticated: boolean;
}

export function useAuthSession(): UseAuthSessionResult {
  return {
    hydrated: false,
    authenticated: false,
  } as const;
}

export interface UseBiometricReadyResult {
  readonly ready: boolean;
}

export function useBiometricReady(): UseBiometricReadyResult {
  return {
    ready: false,
  } as const;
}
export const authhooksModule = {
  name: "authhooks",
} as const;
