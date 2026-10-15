import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createWeatherService,
  parseOpenMeteoResponse,
  WeatherServiceError,
} from "./service.ts";

const fixture = {
  latitude: 19.99,
  longitude: 73.78,
  elevation: 560,
  timezone: "Asia/Kolkata",
  timezone_abbreviation: "GMT+5:30",
  current_units: {
    temperature_2m: "°C",
    relative_humidity_2m: "%",
    apparent_temperature: "°C",
    precipitation: "mm",
    wind_speed_10m: "km/h",
    wind_direction_10m: "°",
    weather_code: "wmo code",
  },
  current: {
    time: "2026-10-15T12:00",
    temperature_2m: 29,
    relative_humidity_2m: 60,
    apparent_temperature: 31,
    precipitation: 0,
    wind_speed_10m: 8,
    wind_direction_10m: 180,
    weather_code: 2,
  },
  daily: {
    time: ["2026-10-15", "2026-10-16"],
    temperature_2m_max: [32, 31],
    temperature_2m_min: [23, 22],
    precipitation_sum: [1.2, 0],
    precipitation_probability_max: [30, 0],
    wind_speed_10m_max: [18, 14],
    weather_code: [2, 0],
  },
};

describe("Open-Meteo response parsing", () => {
  it("normalizes a documented response into metric weather data", () => {
    const weather = parseOpenMeteoResponse(fixture, 19.99, 73.78);
    assert.equal(weather.current.temperatureC, 29);
    assert.equal(weather.current.feelsLikeC, 31);
    assert.equal(weather.daily.length, 2);
    assert.equal(weather.daily[0].precipitationMm, 1.2);
    assert.equal(weather.source.name, "Open-Meteo");
  });

  it("preserves missing weather values as null", () => {
    const weather = parseOpenMeteoResponse(
      {
        ...fixture,
        current: { time: "2026-10-15T12:00" },
        daily: { time: ["2026-10-15"] },
      },
      19.99,
      73.78,
    );
    assert.equal(weather.current.temperatureC, null);
    assert.equal(weather.daily[0].maxTemperatureC, null);
  });

  it("converts non-metric temperatures and wind using provider units", () => {
    const weather = parseOpenMeteoResponse(
      {
        ...fixture,
        current_units: {
          ...fixture.current_units,
          temperature_2m: "°F",
          apparent_temperature: "°F",
          wind_speed_10m: "mph",
        },
        current: {
          ...fixture.current,
          temperature_2m: 68,
          apparent_temperature: 77,
          wind_speed_10m: 10,
        },
      },
      19.99,
      73.78,
    );
    assert.equal(weather.current.temperatureC, 20);
    assert.equal(weather.current.feelsLikeC, 25);
    assert.equal(weather.current.windSpeedKmh, 16.09344);
  });

  it("rejects a malformed response", () => {
    assert.throws(
      () => parseOpenMeteoResponse({}, 19.99, 73.78),
      WeatherServiceError,
    );
  });
});

describe("Open-Meteo request behavior", () => {
  it("requests documented current and daily fields with seven-day metric settings", async () => {
    const requested: URL[] = [];
    const service = createWeatherService(async (input) => {
      requested.push(new URL(String(input)));
      return Response.json(fixture);
    });
    await service.forecast(19.99, 73.78);
    assert.equal(requested[0].searchParams.get("forecast_days"), "7");
    assert.equal(requested[0].searchParams.get("timezone"), "auto");
    assert.equal(requested[0].searchParams.get("temperature_unit"), "celsius");
    assert.equal(requested[0].searchParams.get("wind_speed_unit"), "kmh");
    assert.equal(requested[0].searchParams.get("precipitation_unit"), "mm");
  });

  it("converts upstream failures and timeout into safe errors", async () => {
    const failed = createWeatherService(
      async () => new Response("private details", { status: 500 }),
    );
    await assert.rejects(failed.forecast(0, 0), (error: unknown) =>
      error instanceof WeatherServiceError &&
      error.status === 502 &&
      !error.message.includes("private"),
    );

    const timeout = createWeatherService(async () => {
      const error = new Error("aborted");
      error.name = "TimeoutError";
      throw error;
    });
    await assert.rejects(
      timeout.forecast(0, 0),
      /taking too long to load/,
    );
  });
});
