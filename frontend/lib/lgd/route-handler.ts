import { LgdServiceError } from "./service.ts";

export interface LocationListResponse<T> {
  data: T[];
}

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export function createEntityRouteHandler<T>(
  parameter: "state" | "district",
  fetchEntities: (code: string) => Promise<T[]>,
) {
  return async function GET(request: Request): Promise<Response> {
    const query = new URL(request.url).searchParams;
    const entries = Array.from(query.entries());
    if (
      entries.length !== 1 ||
      entries[0][0] !== parameter ||
      !/^\d+$/.test(entries[0][1])
    ) {
      return Response.json(
        {
          error:
            parameter === "state"
              ? "Enter a valid numeric state code."
              : "Enter a valid numeric district code.",
        },
        { status: 400 },
      );
    }

    try {
      const data = await fetchEntities(entries[0][1]);
      const response: LocationListResponse<T> = { data };
      return Response.json(response, { headers: CACHE_HEADERS });
    } catch (error) {
      const serviceError =
        error instanceof LgdServiceError
          ? error
          : new LgdServiceError(
              "Location data is temporarily unavailable. Please try again.",
            );
      return Response.json(
        { error: serviceError.message },
        { status: serviceError.status },
      );
    }
  };
}

export function createStatesRouteHandler<T>(fetchEntities: () => Promise<T[]>) {
  return async function GET(request: Request): Promise<Response> {
    if (new URL(request.url).search) {
      return Response.json(
        { error: "The states endpoint does not accept query parameters." },
        { status: 400 },
      );
    }

    try {
      const data = await fetchEntities();
      const response: LocationListResponse<T> = { data };
      return Response.json(response, { headers: CACHE_HEADERS });
    } catch (error) {
      const serviceError =
        error instanceof LgdServiceError
          ? error
          : new LgdServiceError(
              "Location data is temporarily unavailable. Please try again.",
            );
      return Response.json(
        { error: serviceError.message },
        { status: serviceError.status },
      );
    }
  };
}
