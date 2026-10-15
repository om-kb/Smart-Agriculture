import type { FarmLocation, GeocodingResult } from "./types.ts";

export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function parseFarmLocation(value: unknown): FarmLocation | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    typeof value.latitude !== "number" ||
    typeof value.longitude !== "number" ||
    !isValidCoordinates(value.latitude, value.longitude) ||
    (value.source !== "manual" && value.source !== "open-meteo") ||
    typeof value.coordinatesConfirmed !== "boolean" ||
    !isOptionalString(value.state) ||
    !isOptionalString(value.district)
  ) {
    return null;
  }

  return {
    name: value.name.trim(),
    latitude: value.latitude,
    longitude: value.longitude,
    ...(value.state ? { state: value.state } : {}),
    ...(value.district ? { district: value.district } : {}),
    source: value.source,
    coordinatesConfirmed: value.coordinatesConfirmed,
  };
}

export function parseGeocodingResults(value: unknown): GeocodingResult[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error("Location search returned an invalid response.");
  }

  return value.results.flatMap((item): GeocodingResult[] => {
    if (
      !isRecord(item) ||
      typeof item.name !== "string" ||
      typeof item.latitude !== "number" ||
      typeof item.longitude !== "number" ||
      !isValidCoordinates(item.latitude, item.longitude)
    ) {
      return [];
    }
    return [
      {
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        ...(typeof item.admin1 === "string" ? { state: item.admin1 } : {}),
        ...(typeof item.admin2 === "string" ? { district: item.admin2 } : {}),
        ...(typeof item.country === "string" ? { country: item.country } : {}),
      },
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}
