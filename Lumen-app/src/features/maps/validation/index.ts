import type { MapRouteRequestValues, MapSearchFormValues } from "../types";

export function isValidMapSearch(values: MapSearchFormValues): boolean {
  return values.query.length > 0;
}

export function isValidMapRouteRequest(values: MapRouteRequestValues): boolean {
  return values.routeId.length > 0;
}
export const mapsvalidationModule = {
  name: "mapsvalidation",
} as const;
