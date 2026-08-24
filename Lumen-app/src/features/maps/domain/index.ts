export interface MapViewport {
  readonly latitude: number;
  readonly longitude: number;
  readonly zoom: number;
}

export interface MapMarker {
  readonly id: string;
  readonly title: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface MapRoute {
  readonly id: string;
  readonly label: string;
}
export const mapsdomainModule = {
  name: "mapsdomain",
} as const;
