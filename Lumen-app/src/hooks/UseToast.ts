export interface UseToastState {
  readonly show: (message: string) => void;
}

export function useToast(): UseToastState {
  return {
    show: () => undefined,
  } as const;
}
