import {
  GeocodingError,
  type GeocodingArea,
} from "./geocoding.ts";
import type { GeocodingResult } from "./types.ts";

type GeocodingSearch = (
  query: string,
  area: GeocodingArea,
  signal?: AbortSignal,
) => Promise<GeocodingResult[]>;

const RESPONSE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
};

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
      return Response.json(
        {
          error:
            "Choose a district and state, then enter a place name between 2 and 160 characters.",
        },
        { status: 400 },
      );
    }

    try {
      const data = await search(
        query.trim(),
        { state: state.trim(), district: district.trim() },
        request.signal,
      );
      return Response.json({ data }, { headers: RESPONSE_HEADERS });
    } catch (error) {
      const geocodingError =
        error instanceof GeocodingError
          ? error
          : new GeocodingError(
              "Location search is temporarily unavailable. Please try again.",
            );
      return Response.json(
        { error: geocodingError.message },
        { status: geocodingError.status },
      );
    }
  };
}
