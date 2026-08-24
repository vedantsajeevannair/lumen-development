export interface QueryClientConfig {
  readonly staleTimeMs: number;
}

export const queryClientConfig: QueryClientConfig = {
  staleTimeMs: 30_000,
};
