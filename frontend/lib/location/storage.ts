import { parseFarmLocation } from "./validation.ts";
import type { FarmLocation } from "./types.ts";

export const LOCATION_STORAGE_KEY = "smart-agriculture-weather-location";
export const LOCATION_UPDATED_EVENT = "smart-agriculture-location-updated";

export function deserializeLocation(value: string | null): FarmLocation | null {
  if (!value) return null;
  try {
    return parseFarmLocation(JSON.parse(value) as unknown);
  } catch {
    return null;
  }
}

export function serializeLocation(location: FarmLocation): string {
  return JSON.stringify(location);
}
