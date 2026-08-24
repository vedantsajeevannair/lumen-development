export interface UsePaginationState {
  readonly page: number;
  readonly pageSize: number;
}

export function usePagination(): UsePaginationState {
  return {
    page: 1,
    pageSize: 20,
  } as const;
}
