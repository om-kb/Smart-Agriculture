import type {
  CurrentWeather,
  DailyForecast,
  WeatherData,
} from "./types.ts";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 8_000;
const WEATHER_CACHE_SECONDS = 1_800;
const CURRENT_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "wind_speed_10m",
  "wind_direction_10m",
  "weather_code",
].join(",");
const DAILY_VARIABLES = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "weather_code",
].join(",");

export class WeatherServiceError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
    this.name = "WeatherServiceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function currentValue(
  current: Record<string, unknown>,
  units: Record<string, unknown>,
  key: string,
): number | null {
  const value = numeric(current[key]);
  if (value === null) return null;
  const unit = stringValue(units[key]);
  if (unit === "°F") return ((value - 32) * 5) / 9;
  if (unit === "mph") return value * 1.609344;
  if (unit === "m/s") return value * 3.6;
  if (unit === "kn") return value * 1.852;
  return value;
}

export function parseOpenMeteoResponse(
  payload: unknown,
  requestedLatitude: number,
  requestedLongitude: number,
  fetchedAt = new Date().toISOString(),
): WeatherData {
  if (
    !isRecord(payload) ||
    !isRecord(payload.current) ||
    !isRecord(payload.daily) ||
    !isRecord(payload.current_units)
  ) {
    throw new WeatherServiceError("Weather data could not be read.");
  }

  const current = payload.current;
  const units = payload.current_units;
  const daily = payload.daily;
  const dates = Array.isArray(daily.time) ? daily.time : [];
  const dailyValues = (key: string): unknown[] =>
    Array.isArray(daily[key]) ? daily[key] : [];

  const forecast: DailyForecast[] = dates.flatMap((date, index) => {
    if (typeof date !== "string") return [];
    return [
      {
        date,
        maxTemperatureC: numeric(dailyValues("temperature_2m_max")[index]),
        minTemperatureC: numeric(dailyValues("temperature_2m_min")[index]),
        precipitationMm: numeric(dailyValues("precipitation_sum")[index]),
        precipitationProbabilityPercent: numeric(
          dailyValues("precipitation_probability_max")[index],
        ),
        maxWindSpeedKmh: numeric(dailyValues("wind_speed_10m_max")[index]),
        weatherCode: numeric(dailyValues("weather_code")[index]),
      },
    ];
  });

  const timezone = stringValue(payload.timezone);
  if (!timezone) {
    throw new WeatherServiceError("Weather location timezone was unavailable.");
  }

  const normalizedCurrent: CurrentWeather = {
    time: stringValue(current.time),
    temperatureC: currentValue(current, units, "temperature_2m"),
    humidityPercent: numeric(current.relative_humidity_2m),
    feelsLikeC: currentValue(current, units, "apparent_temperature"),
    precipitationMm: numeric(current.precipitation),
    windSpeedKmh: currentValue(current, units, "wind_speed_10m"),
    windDirectionDegrees: numeric(current.wind_direction_10m),
    weatherCode: numeric(current.weather_code),
  };

  return {
    location: {
      latitude: numeric(payload.latitude) ?? requestedLatitude,
      longitude: numeric(payload.longitude) ?? requestedLongitude,
      timezone,
      timezoneAbbreviation: stringValue(payload.timezone_abbreviation) ?? "",
      elevationMeters: numeric(payload.elevation),
    },
    current: normalizedCurrent,
    daily: forecast.slice(0, 7),
    fetchedAt,
    source: {
      name: "Open-Meteo",
      url: "https://open-meteo.com/",
      license: "CC BY 4.0",
    },
  };
}

export function createWeatherService(fetcher: typeof fetch = fetch) {
  return {
    async forecast(
      latitude: number,
      longitude: number,
      signal?: AbortSignal,
    ): Promise<WeatherData> {
      const url = new URL(FORECAST_URL);
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("longitude", String(longitude));
      url.searchParams.set("current", CURRENT_VARIABLES);
      url.searchParams.set("daily", DAILY_VARIABLES);
      url.searchParams.set("forecast_days", "7");
      url.searchParams.set("timezone", "auto");
      url.searchParams.set("temperature_unit", "celsius");
      url.searchParams.set("wind_speed_unit", "kmh");
      url.searchParams.set("precipitation_unit", "mm");

      try {
        const response = await fetcher(url, {
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
            : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          next: { revalidate: WEATHER_CACHE_SECONDS },
        } as RequestInit & { next: { revalidate: number } });

        if (!response.ok) {
          throw new WeatherServiceError(
            "Weather service is temporarily unavailable. Please try again.",
            response.status === 429 ? 503 : 502,
          );
        }
        return parseOpenMeteoResponse(
          await response.json(),
          latitude,
          longitude,
        );
      } catch (error) {
        if (error instanceof WeatherServiceError) throw error;
        if (error instanceof Error && error.name === "TimeoutError") {
          throw new WeatherServiceError(
            "Weather data is taking too long to load. Please retry.",
            504,
          );
        }
        if (error instanceof Error && error.name === "AbortError") {
          throw new WeatherServiceError("Weather request was cancelled.", 503);
        }
        throw new WeatherServiceError(
          "Weather service is temporarily unavailable. Please try again.",
        );
      }
    },
  };
}

export const weatherService = createWeatherService();
