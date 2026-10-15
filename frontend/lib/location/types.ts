export type LocationSource = "manual" | "open-meteo";

export interface FarmLocation {
  name: string;
  latitude: number;
  longitude: number;
  state?: string;
  district?: string;
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
}
