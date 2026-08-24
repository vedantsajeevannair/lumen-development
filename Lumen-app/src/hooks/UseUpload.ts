export interface UseUploadState {
  readonly uploading: boolean;
  readonly progress: number;
}

export function useUpload(): UseUploadState {
  return {
    uploading: false,
    progress: 0,
  } as const;
}
