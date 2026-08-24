export interface NetworkState {
  readonly online: boolean;
  readonly metered: boolean;
}

export function createNetworkState(): NetworkState {
  return {
    online: false,
    metered: false,
  };
}
