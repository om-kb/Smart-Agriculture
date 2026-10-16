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
    (value.source !== "manual" &&
      value.source !== "openstreetmap" &&
      value.source !== "open-meteo") ||
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

export function parseGeocodingRouteResponse(
  value: unknown,
): GeocodingResult[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("Location search returned an invalid response.");
  }
  return value.data.flatMap((item): GeocodingResult[] => {
    if (
      !isRecord(item) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 160 ||
      typeof item.latitude !== "number" ||
      typeof item.longitude !== "number" ||
      !isValidCoordinates(item.latitude, item.longitude) ||
      !isOptionalBoundedString(item.state, 160) ||
      !isOptionalBoundedString(item.district, 160) ||
      !isOptionalBoundedString(item.country, 100) ||
      (item.provider !== undefined && item.provider !== "openstreetmap")
    ) {
      return [];
    }
    return [
      {
        name: item.name.trim(),
        latitude: item.latitude,
        longitude: item.longitude,
        ...(typeof item.state === "string" ? { state: item.state } : {}),
        ...(typeof item.district === "string"
          ? { district: item.district }
          : {}),
        ...(typeof item.country === "string" ? { country: item.country } : {}),
        ...(item.provider === "openstreetmap"
          ? { provider: item.provider }
          : {}),
      },
    ];
  });
}

export function parseNominatimResults(value: unknown): GeocodingResult[] {
  if (!Array.isArray(value)) {
    throw new Error("Location search returned an invalid response.");
  }

  return value.flatMap((item): GeocodingResult[] => {
    if (
      !isRecord(item) ||
      !isRecord(item.address) ||
      typeof item.lat !== "string" ||
      typeof item.lon !== "string"
    ) {
      return [];
    }
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    const name =
      (typeof item.name === "string" && item.name.trim()) ||
      (typeof item.display_name === "string"
        ? item.display_name.split(",")[0]?.trim()
        : undefined);
    const address = item.address;
    const district =
      firstAddressString(address, [
        "state_district",
        "county",
        "district",
        "city_district",
      ]) ??
      (item.addresstype === "state_district"
        ? firstAddressString(address, ["city", "municipality"])
        : undefined);
    const state = firstAddressString(address, ["state"]);
    const country = firstAddressString(address, ["country"]);
    if (
      !name ||
      name.length > 160 ||
      !isValidCoordinates(latitude, longitude) ||
      (district !== undefined && district.length > 160) ||
      (state !== undefined && state.length > 160) ||
      (country !== undefined && country.length > 100)
    ) {
      return [];
    }
    return [
      {
        name,
        latitude,
        longitude,
        ...(state ? { state } : {}),
        ...(district ? { district } : {}),
        ...(country ? { country } : {}),
        provider: "openstreetmap",
      },
    ];
  });
}

function normalizeAreaName(value: string | undefined): string {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const aliases: Record<string, string> = {
    "bangalore": "bengaluru urban",
    "bangalore urban": "bengaluru urban",
    "bangaluru urban": "bengaluru urban",
    "bengaluru": "bengaluru urban",
    "udipi": "udupi",
    "wynaad": "wayanad",
    "palghat": "palakkad",
    "poona": "pune",
    "orissa": "odisha",
    "pondicherry": "puducherry",
  };
  const withoutDistrict = normalized.replace(/\s+district$/, "");
  return aliases[withoutDistrict] ?? withoutDistrict;
}

function firstAddressString(
  address: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = address[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function isValidIndiaCoordinates(latitude: number, longitude: number) {
  return (
    isValidCoordinates(latitude, longitude) &&
    latitude >= 6 &&
    latitude <= 38 &&
    longitude >= 68 &&
    longitude <= 98
  );
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
