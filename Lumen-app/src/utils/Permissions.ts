export interface PermissionGrantMap {
  readonly camera: boolean;
  readonly location: boolean;
  readonly notifications: boolean;
}

export function createPermissionGrantMap(): PermissionGrantMap {
  return {
    camera: false,
    location: false,
    notifications: false,
  };
}
