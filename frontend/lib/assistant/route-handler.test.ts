import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleChatRequest } from "./route-handler.ts";
import { createAssistantRequestContext } from "./integration-context.ts";
import { generateChatResponse } from "./response.ts";
import type { FarmProfile } from "../farm/types.ts";
import type { FarmLocation } from "../location/types.ts";
import type { WeatherData } from "../weather/types.ts";

const confirmedLocation: FarmLocation = {
  name: "Pune, Pune, Maharashtra",
  latitude: 18.52,
  longitude: 73.85,
  state: "Maharashtra",
  district: "Pune",
  source: "open-meteo",
  coordinatesConfirmed: true,
};

const savedProfile: FarmProfile = {
  farmName: "Field A",
  farmSize: 2.5,
  farmSizeUnit: "hectares",
  crop: "Maize",
  soilType: "Black soil",
  irrigationType: "Drip",
  growthStage: "Flowering",
  sowingDate: "",
};

const currentWeather: WeatherData = {
  location: {
    latitude: 18.52,
    longitude: 73.85,
    timezone: "Asia/Kolkata",
    timezoneAbbreviation: "IST",
    elevationMeters: 560,
  },
  current: {
    time: "2026-10-16T06:30",
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
      date: "2026-10-16",
      maxTemperatureC: 32,
      minTemperatureC: 23,
      precipitationMm: 1.2,
      precipitationProbabilityPercent: 30,
      maxWindSpeedKmh: 18,
      weatherCode: 2,
    },
    {
      date: "2026-10-17",
      maxTemperatureC: 31,
      minTemperatureC: 22,
      precipitationMm: 4,
      precipitationProbabilityPercent: 50,
      maxWindSpeedKmh: 14,
      weatherCode: 0,
    },
  ],
  fetchedAt: "2026-10-16T01:00:00.000Z",
  source: {
    name: "Open-Meteo",
    url: "https://open-meteo.com/",
    license: "CC BY 4.0",
  },
};

function post(body: string, contentType = "application/json"): Request {
  return new Request("http://localhost/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });
}

describe("POST /api/assistant/chat", () => {
  it("returns a typed deterministic response without external services", async () => {
    const response = await handleChatRequest(post(JSON.stringify({
      message: "How do I test my soil?",
    })));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.topicId, "soil.testing");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  });

  it("uses only supplied location, farm, and forecast context", async () => {
    const response = await handleChatRequest(
      post(
        JSON.stringify({
          message: "Will it rain tomorrow?",
          locationContext: {
            displayName: "Pune, Pune, Maharashtra",
            state: "Maharashtra",
            district: "Pune",
          },
          farmContext: {
            crop: "Maize",
            soilType: "Black soil",
            location: "Pune, Pune, Maharashtra",
          },
          weatherContext: {
            rainfallForecastMm: 4,
            forecastDate: "2026-10-16",
            source: "Open-Meteo",
            fetchedAt: "2026-10-15T06:30:00.000Z",
          },
        }),
      ),
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.topicId, "weather.forecast");
    assert.match(body.answer, /4 mm forecast rainfall/);
    assert.match(body.answer, /Open-Meteo/);
  });

  it("accepts page-generated context and assistant replies in recent history", async () => {
    const longReply = generateChatResponse({
      message: "How do I protect crops from heat?",
      ...createAssistantRequestContext(
        confirmedLocation,
        savedProfile,
        currentWeather,
      ),
    }).answer;
    assert.ok(longReply.length > 500);

    const response = await handleChatRequest(
      post(
        JSON.stringify({
          message: "What crop am I growing?",
          ...createAssistantRequestContext(
            confirmedLocation,
            savedProfile,
            currentWeather,
          ),
          recentTurns: [
            {
              role: "user",
              content: "How do I protect crops from heat?",
            },
            { role: "assistant", content: longReply },
          ],
        }),
      ),
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(body.answer, /lists Maize as your crop/);
  });

  it("rejects malformed JSON, invalid input, and non-JSON content types", async () => {
    assert.equal((await handleChatRequest(post("{"))).status, 400);
    assert.equal(
      (await handleChatRequest(post(JSON.stringify({ message: "" })))).status,
      400,
    );
    assert.equal((await handleChatRequest(post("{}", "text/plain"))).status, 415);
  });

  it("rejects oversized request bodies before parsing", async () => {
    const response = await handleChatRequest(
      post(JSON.stringify({ message: "x".repeat(25_000) })),
    );
    assert.equal(response.status, 413);

    const multibyteResponse = await handleChatRequest(
      post(JSON.stringify({ message: "🌱".repeat(6_000) })),
    );
    assert.equal(multibyteResponse.status, 413);
  });
});
