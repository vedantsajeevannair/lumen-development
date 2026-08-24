export interface UseMapViewportResult {
  readonly loading: boolean;
  readonly viewport: string | null;
}

export function useMapViewport(): UseMapViewportResult {
  return {
    loading: false,
    viewport: null,
  } as const;
}

export interface UseMapSearchResult {
  readonly searching: boolean;
}

export function useMapSearch(): UseMapSearchResult {
  return {
    searching: false,
  } as const;
}
export const mapshooksModule = {
  name: "mapshooks",
} as const;
