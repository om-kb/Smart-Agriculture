import type { LocationSelection } from "../lgd/types.ts";

export type LocationSource = "manual" | "openstreetmap" | "open-meteo";

export interface FarmLocation {
  name: string;
  latitude: number;
  longitude: number;
  state?: string;
  district?: string;
  administrativeArea?: LocationSelection;
  source: LocationSource;
  coordinatesConfirmed: boolean;
}

export interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  state?: string;
  district?: string;
  country?: string;
  provider?: "openstreetmap";
}
