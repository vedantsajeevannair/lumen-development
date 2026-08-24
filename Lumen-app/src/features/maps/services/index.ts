import type { LoadMapQuery, LoadRouteQuery, SearchMapQuery } from "../application";
import type { MapMarker, MapRoute, MapViewport } from "../domain";

export interface MapsApiService {
  loadMap(query: LoadMapQuery): Promise<{ viewport: MapViewport; markers: MapMarker[] }>;
  searchMap(query: SearchMapQuery): Promise<MapMarker[]>;
  loadRoute(query: LoadRouteQuery): Promise<MapRoute>;
}

export const mapsApiService: MapsApiService = {
  async loadMap(query) {
    return {
      viewport: {
        latitude: query.latitude,
        longitude: query.longitude,
        zoom: 14,
      },
      markers: [],
    };
  },
  async searchMap() {
    return [];
  },
  async loadRoute(query) {
    return { id: query.routeId, label: "" };
  },
};
export const mapsservicesModule = {
  name: "mapsservices",
} as const;
