import {
  matchGeocodingAdministrativeArea,
  parseNominatimResults,
} from "./validation.ts";
import type { GeocodingResult } from "./types.ts";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const REQUEST_TIMEOUT_MS = 8_000;
const MIN_REQUEST_INTERVAL_MS = 1_100;
const ATTRIBUTION_URL = "https://www.openstreetmap.org/copyright";

let nextRequestAt = 0;
const resultCache = new Map<
  string,
  { expiresAt: number; results: GeocodingResult[] }
>();

export interface GeocodingArea {
  state: string;
  district: string;
}

export class GeocodingError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
    this.name = "GeocodingError";
  }
}

function normalizeQueryPart(value: string): string {
  return value.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
}

function buildNominatimQuery(query: string, area: GeocodingArea): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const part of [
    ...query.split(","),
    area.district,
    area.state,
    "India",
  ]) {
    const trimmed = part.trim();
    const normalized = normalizeQueryPart(trimmed);
    if (trimmed && !seen.has(normalized)) {
      parts.push(trimmed);
      seen.add(normalized);
    }
  }
  return parts.join(", ");
}

async function waitForRequestSlot(): Promise<void> {
  const now = Date.now();
  const startAt = Math.max(now, nextRequestAt);
  nextRequestAt = startAt + MIN_REQUEST_INTERVAL_MS;
  const delay = startAt - now;
  if (delay > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
  }
}

export function createGeocodingService(fetcher: typeof fetch = fetch) {
  return {
    async search(
      query: string,
      area: GeocodingArea,
      signal?: AbortSignal,
    ): Promise<GeocodingResult[]> {
      const url = new URL(NOMINATIM_URL);
      url.searchParams.set("q", buildNominatimQuery(query, area));
      url.searchParams.set("countrycodes", "in");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "10");

      try {
        const cached = resultCache.get(url.href);
        if (cached && cached.expiresAt > Date.now()) return cached.results;
        if (cached) resultCache.delete(url.href);
        await waitForRequestSlot();
        const response = await fetcher(url, {
          headers: {
            "Accept-Language": "en",
            "User-Agent": `SmartAgricultureAdvisor/1.0 (${ATTRIBUTION_URL})`,
          },
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
            : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          next: { revalidate: 86_400 },
        } as RequestInit & { next: { revalidate: number } });
        if (!response.ok) {
          throw new GeocodingError(
            response.status === 429
              ? "Location search is busy. Please wait a moment and retry."
              : "Location search is temporarily unavailable. Please try again.",
            response.status === 429 ? 503 : 502,
          );
        }

        const results = parseNominatimResults(await response.json())
          .filter(
            (result) =>
              (!result.country ||
                normalizeQueryPart(result.country) === "india") &&
              matchGeocodingAdministrativeArea(result, area) !== "mismatch",
          )
          .sort(
            (left, right) =>
              Number(
                matchGeocodingAdministrativeArea(right, area) === "match",
              ) -
              Number(
                matchGeocodingAdministrativeArea(left, area) === "match",
              ),
          );
        resultCache.set(url.href, {
          expiresAt: Date.now() + 86_400_000,
          results,
        });
        if (resultCache.size > 200) {
          const oldest = resultCache.keys().next().value;
          if (oldest) resultCache.delete(oldest);
        }
        return results;
      } catch (error) {
        if (error instanceof GeocodingError) throw error;
        if (error instanceof Error && error.name === "TimeoutError") {
          throw new GeocodingError(
            "Location search timed out. Please try again.",
            504,
          );
        }
        if (error instanceof Error && error.name === "AbortError") {
          throw new GeocodingError("Location search was cancelled.", 503);
        }
        throw new GeocodingError(
          "Location search is temporarily unavailable. Please try again.",
        );
      }
    },
  };
}

export const geocodingService = createGeocodingService();
