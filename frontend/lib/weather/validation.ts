import type { WeatherData } from "./types.ts";

export function isWeatherData(value: unknown): value is WeatherData {
  return (
    isRecord(value) &&
    isRecord(value.location) &&
    isCoordinate(value.location.latitude, -90, 90) &&
    isCoordinate(value.location.longitude, -180, 180) &&
    isNonEmptyString(value.location.timezone) &&
    isNonEmptyString(value.location.timezoneAbbreviation) &&
    isNullableNumber(value.location.elevationMeters) &&
    isRecord(value.current) &&
    isNullableString(value.current.time) &&
    isNullableNumber(value.current.temperatureC) &&
    isNullableNumber(value.current.humidityPercent, 0, 100) &&
    isNullableNumber(value.current.feelsLikeC) &&
    isNullableNumber(value.current.precipitationMm, 0) &&
    isNullableNumber(value.current.windSpeedKmh, 0) &&
    isNullableNumber(value.current.windDirectionDegrees, 0, 360) &&
    isNullableNumber(value.current.weatherCode, 0, 99) &&
    Array.isArray(value.daily) &&
    value.daily.length <= 7 &&
    value.daily.every(
      (day) =>
        isRecord(day) &&
        isIsoDate(day.date) &&
        isNullableNumber(day.maxTemperatureC) &&
        isNullableNumber(day.minTemperatureC) &&
        isNullableNumber(day.precipitationMm, 0) &&
        isNullableNumber(day.precipitationProbabilityPercent, 0, 100) &&
        isNullableNumber(day.maxWindSpeedKmh, 0) &&
        isNullableNumber(day.weatherCode, 0, 99),
    ) &&
    isNonEmptyString(value.fetchedAt) &&
    !Number.isNaN(Date.parse(value.fetchedAt)) &&
    isRecord(value.source) &&
    value.source.name === "Open-Meteo" &&
    value.source.url === "https://open-meteo.com/" &&
    value.source.license === "CC BY 4.0"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableNumber(
  value: unknown,
  minimum = Number.NEGATIVE_INFINITY,
  maximum = Number.POSITIVE_INFINITY,
): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= minimum &&
      value <= maximum)
  );
}

function isCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
