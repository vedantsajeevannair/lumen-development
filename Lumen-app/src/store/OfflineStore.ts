export interface OfflineStoreState {
  readonly hydrated: boolean;
  readonly queueLength: number;
  readonly flushing: boolean;
}

export const offlineStore: OfflineStoreState = {
  hydrated: false,
  queueLength: 0,
  flushing: false,
};
