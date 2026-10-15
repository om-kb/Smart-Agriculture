import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assistantLocationKey,
  createAssistantRequestContext,
  createWeatherRequestSequence,
  isWeatherSnapshotForLocation,
} from "./integration-context.ts";
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
    assert.deepEqual(
      createAssistantRequestContext(
        location,
        profile,
        weather,
        assistantLocationKey(location),
      ),
      {
        locationContext: {
          displayName: "Pune, Pune, Maharashtra",
          locationKey: JSON.stringify([
            18.52,
            73.85,
            "27",
            "521",
            "Pune, Pune, Maharashtra",
          ]),
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
          locationKey: JSON.stringify([
            18.52,
            73.85,
            "27",
            "521",
            "Pune, Pune, Maharashtra",
          ]),
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
      },
    );
  });

  it("omits missing context and never turns missing weather into zero", () => {
    const context = createAssistantRequestContext(location, null, null);
    assert.deepEqual(context, {
      locationContext: {
        displayName: "Pune, Pune, Maharashtra",
        locationKey: assistantLocationKey(location),
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
      location,
      null,
      missingValues,
      assistantLocationKey(location),
    ).weatherContext;
    assert.equal(weatherContext?.currentTemperatureC, undefined);
    assert.equal(weatherContext?.currentHumidityPercent, undefined);
    assert.equal(
      weatherContext?.dailyForecasts?.[0]?.precipitationMm,
      undefined,
    );
  });

  it("keys weather snapshots to the confirmed location and ignores stale responses", async () => {
    const udupi: FarmLocation = {
      ...location,
      name: "Udupi, Udupi, Karnataka",
      latitude: 13.5269,
      longitude: 74.8731,
      state: "Karnataka",
      district: "Udupi",
      administrativeArea: {
        state: { code: "29", name: "Karnataka" },
        district: { code: "523", name: "Udupi" },
      },
    };
    const wayanad: FarmLocation = {
      ...udupi,
      name: "Wayanad, Kerala",
      latitude: 11.7151,
      longitude: 76.1271,
      state: "Kerala",
      district: "Wayanad",
      administrativeArea: {
        state: { code: "32", name: "Kerala" },
        district: { code: "555", name: "Wayanad" },
      },
    };
    assert.notEqual(assistantLocationKey(udupi), assistantLocationKey(wayanad));
    assert.equal(
      isWeatherSnapshotForLocation(wayanad, assistantLocationKey(udupi)),
      false,
    );
    assert.equal(
      isWeatherSnapshotForLocation(udupi, assistantLocationKey(udupi)),
      true,
    );
    assert.equal(
      createAssistantRequestContext(
        wayanad,
        profile,
        weather,
        assistantLocationKey(udupi),
      ).weatherContext,
      undefined,
    );

    const requests = createWeatherRequestSequence();
    const oldRequest = requests.next();
    const newRequest = requests.next();
    let displayed = "";
    const delayedOldResponse = new Promise<void>((resolve) =>
      setTimeout(resolve, 10),
    ).then(() => {
      if (requests.isCurrent(oldRequest)) displayed = "Udupi";
    });
    if (requests.isCurrent(newRequest)) displayed = "Wayanad";
    await delayedOldResponse;
    assert.equal(displayed, "Wayanad");
  });
});
