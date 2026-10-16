import {
  GeocodingError,
  type GeocodingArea,
} from "./geocoding.ts";
import { matchGeocodingAdministrativeArea } from "./validation.ts";
import type { GeocodingResult } from "./types.ts";

type GeocodingSearch = (
  query: string,
  area: GeocodingArea,
  signal?: AbortSignal,
) => Promise<GeocodingResult[]>;

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
};

function isIndiaCountry(country: string | undefined): boolean {
  return (
    country
      ?.normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .toLocaleLowerCase("en") === "india"
  );
}

function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
): Response {
  return Response.json(body, {
    ...init,
    headers: { ...RESPONSE_HEADERS, ...init.headers },
  });
}

export function createGeocodingRouteHandler(search: GeocodingSearch) {
  return async function GET(request: Request): Promise<Response> {
    const parameters = new URL(request.url).searchParams;
    const entries = Array.from(parameters.entries());
    const query = parameters.get("q");
    const district = parameters.get("district");
    const state = parameters.get("state");
    if (
      entries.length !== 3 ||
      !entries.some(([key]) => key === "q") ||
      !entries.some(([key]) => key === "district") ||
      !entries.some(([key]) => key === "state") ||
      !query ||
      query.trim().length < 2 ||
      query.length > 160 ||
      !district?.trim() ||
      district.length > 160 ||
      !state?.trim() ||
      state.length > 160
    ) {
      return jsonResponse(
        {
          error:
            "Choose a district and state, then enter a place name between 2 and 160 characters.",
        },
        { status: 400 },
      );
    }

    try {
      const results = await search(
        query.trim(),
        { state: state.trim(), district: district.trim() },
        request.signal,
      );
      const area = { state: state.trim(), district: district.trim() };
      const data = results.filter(
        (result) =>
          (!result.country || isIndiaCountry(result.country)) &&
          matchGeocodingAdministrativeArea(result, area) === "match",
      );
      return jsonResponse({ data });
    } catch (error) {
      const geocodingError =
        error instanceof GeocodingError
          ? error
          : new GeocodingError(
              "Location search is temporarily unavailable. Please try again.",
            );
      return jsonResponse(
        { error: geocodingError.message },
        { status: geocodingError.status },
      );
    }
  };
}
