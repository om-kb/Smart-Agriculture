import { parseGeocodingResults } from "./validation.ts";
import type { GeocodingResult } from "./types.ts";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export class GeocodingError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
    this.name = "GeocodingError";
  }
}

export function createGeocodingService(fetcher: typeof fetch = fetch) {
  return {
    async search(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
      const url = new URL(GEOCODING_URL);
      url.searchParams.set("name", query);
      url.searchParams.set("count", "10");
      url.searchParams.set("language", "en");
      url.searchParams.set("format", "json");

      try {
        const response = await fetcher(url, {
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(8_000)])
            : AbortSignal.timeout(8_000),
          next: { revalidate: 86_400 },
        } as RequestInit & { next: { revalidate: number } });
        if (!response.ok) {
          throw new GeocodingError(
            "Location search is temporarily unavailable. Please try again.",
            response.status === 429 ? 503 : 502,
          );
        }
        return parseGeocodingResults(await response.json());
      } catch (error) {
        if (error instanceof GeocodingError) throw error;
        if (error instanceof Error && error.name === "TimeoutError") {
          throw new GeocodingError("Location search timed out. Please try again.", 504);
        }
        throw new GeocodingError(
          "Location search is temporarily unavailable. Please try again.",
        );
      }
    },
  };
}

export const geocodingService = createGeocodingService();
