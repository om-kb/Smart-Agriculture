import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAssistantRequestContext } from "./integration-context.ts";
import type { FarmProfile } from "../farm/types.ts";
import type { FarmLocation } from "../location/types.ts";
import type { WeatherData } from "../weather/types.ts";

const location: FarmLocation = {
  name: "Pune, Pune, Maharashtra",
  latitude: 18.52,
  longitude: 73.85,
  state: "Maharashtra",
  district: "Pune",
  administrativeArea: {
    state: { code: "27", name: "Maharashtra" },
    district: { code: "521", name: "Pune" },
  },
  source: "open-meteo",
  coordinatesConfirmed: true,
};

const profile: FarmProfile = {
  farmName: "Field A",
  farmSize: 2.5,
  farmSizeUnit: "hectares",
  crop: "Maize",
  soilType: "Black soil",
  irrigationType: "Drip",
  growthStage: "Flowering",
  sowingDate: "",
};

const weather: WeatherData = {
  location: {
    latitude: 18.52,
    longitude: 73.85,
    timezone: "Asia/Kolkata",
    timezoneAbbreviation: "GMT+5:30",
    elevationMeters: 560,
  },
  current: {
    time: "2026-10-15T12:00",
    temperatureC: 29,
    humidityPercent: 60,
    feelsLikeC: 31,
    precipitationMm: 0,
    windSpeedKmh: 8,
    windDirectionDegrees: 180,
    weatherCode: 2,
  },
  daily: [
    {
      date: "2026-10-15",
      maxTemperatureC: 32,
      minTemperatureC: 23,
      precipitationMm: 1.2,
      precipitationProbabilityPercent: 30,
      maxWindSpeedKmh: 18,
      weatherCode: 2,
    },
    {
      date: "2026-10-16",
      maxTemperatureC: 31,
      minTemperatureC: 22,
      precipitationMm: 4,
      precipitationProbabilityPercent: 50,
      maxWindSpeedKmh: 14,
      weatherCode: 0,
    },
  ],
  fetchedAt: "2026-10-15T06:30:00.000Z",
  source: {
    name: "Open-Meteo",
    url: "https://open-meteo.com/",
    license: "CC BY 4.0",
  },
};

describe("assistant application context integration", () => {
  it("maps validated location, farm profile, and actual weather data", () => {
    assert.deepEqual(createAssistantRequestContext(location, profile, weather), {
      locationContext: {
        displayName: "Pune, Pune, Maharashtra",
        state: "Maharashtra",
        district: "Pune",
      },
      farmContext: {
        location: "Pune, Pune, Maharashtra",
        crop: "Maize",
        soilType: "Black soil",
        irrigationMethod: "Drip",
        growthStage: "Flowering",
        farmSize: 2.5,
      },
      weatherContext: {
        timezone: "Asia/Kolkata",
        source: "Open-Meteo",
        currentTemperatureC: 29,
        currentHumidityPercent: 60,
        currentWindSpeedKmh: 8,
        dailyForecasts: [
          {
            date: "2026-10-15",
            maxTemperatureC: 32,
            minTemperatureC: 23,
            precipitationMm: 1.2,
            precipitationProbabilityPercent: 30,
            maxWindSpeedKmh: 18,
          },
          {
            date: "2026-10-16",
            maxTemperatureC: 31,
            minTemperatureC: 22,
            precipitationMm: 4,
            precipitationProbabilityPercent: 50,
            maxWindSpeedKmh: 14,
          },
        ],
      },
    });
  });

  it("omits missing context and never turns missing weather into zero", () => {
    const context = createAssistantRequestContext(location, null, null);
    assert.deepEqual(context, {
      locationContext: {
        displayName: "Pune, Pune, Maharashtra",
        state: "Maharashtra",
        district: "Pune",
      },
    });
    const missingValues = {
      ...weather,
      current: { ...weather.current, temperatureC: null, humidityPercent: null },
      daily: [
        {
          ...weather.daily[0],
          date: "2026-10-15",
          precipitationMm: null,
        },
      ],
    };
    const weatherContext = createAssistantRequestContext(
      null,
      null,
      missingValues,
    ).weatherContext;
    assert.equal(weatherContext?.currentTemperatureC, undefined);
    assert.equal(weatherContext?.currentHumidityPercent, undefined);
    assert.equal(
      weatherContext?.dailyForecasts?.[0]?.precipitationMm,
      undefined,
    );
  });
});
