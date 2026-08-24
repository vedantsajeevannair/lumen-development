export interface UseCameraState {
  readonly permissionGranted: boolean;
  readonly ready: boolean;
}

export function useCamera(): UseCameraState {
  return {
    permissionGranted: false,
    ready: false,
  } as const;
}
