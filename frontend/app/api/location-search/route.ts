import {
  GeocodingError,
  geocodingService,
} from "@/lib/location/geocoding";

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const entries = Array.from(query.entries());
  const search = query.get("q");
  if (
    entries.length !== 1 ||
    entries[0][0] !== "q" ||
    !search ||
    search.trim().length < 2 ||
    search.length > 100
  ) {
    return Response.json(
      { error: "Enter a location name between 2 and 100 characters." },
      { status: 400 },
    );
  }

  try {
    const results = await geocodingService.search(search.trim());
    return Response.json(
      { data: results },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (error) {
    const serviceError =
      error instanceof GeocodingError
        ? error
        : new GeocodingError(
            "Location search is temporarily unavailable. Please try again.",
          );
    return Response.json(
      { error: serviceError.message },
      { status: serviceError.status },
    );
  }
}
