import type { FarmLocation, GeocodingResult } from "./types.ts";
import { parseSavedLocation } from "../location-selection.ts";

export type AdministrativeAreaMatch = "match" | "ambiguous" | "mismatch";

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
  const administrativeArea =
    value.administrativeArea === undefined
      ? undefined
      : parseSavedLocation(value.administrativeArea);
  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 200 ||
    typeof value.latitude !== "number" ||
    typeof value.longitude !== "number" ||
    !isValidCoordinates(value.latitude, value.longitude) ||
    (value.source !== "manual" && value.source !== "open-meteo") ||
    typeof value.coordinatesConfirmed !== "boolean" ||
    !isOptionalString(value.state) ||
    !isOptionalString(value.district) ||
    (typeof value.state === "string" && value.state.length > 160) ||
    (typeof value.district === "string" && value.district.length > 160) ||
    (value.administrativeArea !== undefined && !administrativeArea)
  ) {
    return null;
  }

  return {
    name: value.name.trim(),
    latitude: value.latitude,
    longitude: value.longitude,
    ...(value.state ? { state: value.state } : {}),
    ...(value.district ? { district: value.district } : {}),
    ...(administrativeArea ? { administrativeArea } : {}),
    source: value.source,
    coordinatesConfirmed: value.coordinatesConfirmed,
  };
}

export function matchGeocodingAdministrativeArea(
  result: GeocodingResult,
  selected: { state: string; district: string },
): AdministrativeAreaMatch {
  const state = normalizeAreaName(result.state);
  const district = normalizeAreaName(result.district);
  const selectedState = normalizeAreaName(selected.state);
  const selectedDistrict = normalizeAreaName(selected.district);

  if (
    (state && state !== selectedState) ||
    (district && district !== selectedDistrict)
  ) {
    return "mismatch";
  }
  return state && district ? "match" : "ambiguous";
}

export function buildGeocodingQuery(district: string, state: string): string {
  const districtName = district.trim();
  const qualifiedQuery = [districtName, state.trim()].filter(Boolean).join(", ");
  return qualifiedQuery.length <= 160 ? qualifiedQuery : districtName;
}

export function parseGeocodingResults(value: unknown): GeocodingResult[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error("Location search returned an invalid response.");
  }

  return parseGeocodingItems(value.results, "upstream");
}

export function parseGeocodingRouteResponse(
  value: unknown,
): GeocodingResult[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("Location search returned an invalid response.");
  }
  return parseGeocodingItems(value.data, "route");
}

function parseGeocodingItems(
  items: unknown[],
  source: "upstream" | "route",
): GeocodingResult[] {
  return items.flatMap((item): GeocodingResult[] => {
    if (
      !isRecord(item) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 160 ||
      typeof item.latitude !== "number" ||
      typeof item.longitude !== "number" ||
      !isValidCoordinates(item.latitude, item.longitude) ||
      !isOptionalBoundedString(source === "upstream" ? item.admin1 : item.state, 160) ||
      !isOptionalBoundedString(source === "upstream" ? item.admin2 : item.district, 160) ||
      !isOptionalBoundedString(item.country, 100)
    ) {
      return [];
    }
    const state = source === "upstream" ? item.admin1 : item.state;
    const district = source === "upstream" ? item.admin2 : item.district;
    return [
      {
        name: item.name.trim(),
        latitude: item.latitude,
        longitude: item.longitude,
        ...(typeof state === "string" ? { state } : {}),
        ...(typeof district === "string" ? { district } : {}),
        ...(typeof item.country === "string" ? { country: item.country } : {}),
      },
    ];
  });
}

function normalizeAreaName(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalBoundedString(
  value: unknown,
  maximumLength: number,
): value is string | null | undefined {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.length <= maximumLength)
  );
}
