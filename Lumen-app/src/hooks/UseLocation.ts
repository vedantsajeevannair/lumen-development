export interface UseLocationState {
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export function useLocation(): UseLocationState {
  return {
    latitude: null,
    longitude: null,
  } as const;
}
