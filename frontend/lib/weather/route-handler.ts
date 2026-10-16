import { isValidCoordinates } from "../location/validation.ts";
import { WeatherServiceError } from "./service.ts";

interface WeatherFetcher<T> {
  (latitude: number, longitude: number): Promise<T>;
}

export function createWeatherRouteHandler<T>(
  getWeather: WeatherFetcher<T>,
) {
  return async function GET(request: Request): Promise<Response> {
    const query = new URL(request.url).searchParams;
    const entries = Array.from(query.entries());
    if (
      entries.length !== 2 ||
      !query.has("latitude") ||
      !query.has("longitude")
    ) {
      return Response.json(
        { error: "Provide latitude and longitude coordinates." },
        { status: 400 },
      );
    }

    const latitudeText = query.get("latitude");
    const longitudeText = query.get("longitude");
    const latitude = latitudeText === null ? Number.NaN : Number(latitudeText);
    const longitude = longitudeText === null ? Number.NaN : Number(longitudeText);
    if (
      latitudeText === null ||
      longitudeText === null ||
      !latitudeText.trim() ||
      !longitudeText.trim() ||
      !isValidCoordinates(latitude, longitude)
    ) {
      return Response.json(
        { error: "Enter valid latitude and longitude coordinates." },
        { status: 400 },
      );
    }

    try {
      const data = await getWeather(latitude, longitude);
      return Response.json(
        { data },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=1800, stale-while-revalidate=3600",
          },
        },
      );
    } catch (error) {
      const weatherError =
        error instanceof WeatherServiceError
          ? error
          : new WeatherServiceError(
              "Weather service is temporarily unavailable. Please try again.",
            );
      return Response.json(
        { error: weatherError.message },
        { status: weatherError.status },
      );
    }
  };
}
