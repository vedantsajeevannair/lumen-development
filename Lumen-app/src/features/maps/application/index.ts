export interface LoadMapQuery {
  readonly latitude: number;
  readonly longitude: number;
}

export interface SearchMapQuery {
  readonly query: string;
}

export interface LoadRouteQuery {
  readonly routeId: string;
}
export const mapsapplicationModule = {
  name: "mapsapplication",
} as const;
