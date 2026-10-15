import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateChatResponse } from "./response.ts";
import type { ChatRequest } from "./types.ts";

describe("rule-based response generation", () => {
  it("answers supported topics and returns sources and follow-ups", () => {
    const response = generateChatResponse({ message: "How do I test my soil?" });
    assert.equal(response.matchedIntent, "soil.testing");
    assert.equal(response.basis, "general-guidance");
    assert.equal(response.verificationStatus, "official-overview-linked");
    assert.equal(response.sources[0]?.url, "https://soilhealth.dac.gov.in/");
    assert.ok(response.suggestedFollowUps.length > 0);
  });

  it("does not fabricate current weather when context is absent", () => {
    const response = generateChatResponse({ message: "current weather" });
    assert.match(response.answer, /No validated live weather data was available/);
    assert.equal(response.basis, "general-guidance");
    assert.deepEqual(response.missingInformation, [
      "weather data from a connected weather source",
    ]);
    const locationOnly = generateChatResponse({
      message: "What's the weather here?",
      locationContext: { displayName: "Pune", state: "Maharashtra" },
    });
    assert.equal(locationOnly.topicId, "weather.current");
    assert.match(
      locationOnly.answer,
      /No validated live weather data was available/,
    );
  });

  it("uses only supplied weather fields and marks their context", () => {
    const request: ChatRequest = {
      message: "weather tomorrow",
      weatherContext: {
        rainfallForecastMm: 4.5,
        forecastDate: "2026-10-16",
        source: "test provider",
        fetchedAt: "2026-10-15T12:00:00Z",
      },
    };
    const response = generateChatResponse(request);
    assert.equal(response.basis, "weather-context");
    assert.match(response.answer, /4.5 mm forecast rainfall/);
    assert.match(response.answer, /test provider/);
    assert.equal(response.verificationStatus, "unverified-general-guidance");
    assert.doesNotMatch(response.answer, /temperature is \d/);
  });

  it("answers the farmer's local weather and irrigation questions from context", () => {
    const current = generateChatResponse({
      message: "What is the weather like here?",
      locationContext: {
        displayName: "Pune, Pune, Maharashtra",
        state: "Maharashtra",
        district: "Pune",
      },
      weatherContext: {
        temperatureC: 29,
        humidityPercent: 60,
        source: "Open-Meteo",
        fetchedAt: "2026-10-15T06:30:00.000Z",
      },
    });
    assert.equal(current.topicId, "weather.current");
    assert.match(current.answer, /29 °C/);
    assert.match(current.answer, /60% humidity/);
    assert.match(current.answer, /selected forecast location is Pune/);

    const irrigation = generateChatResponse({
      message: "Should I consider irrigating tomorrow?",
      farmContext: {
        crop: "Maize",
        soilType: "Black soil",
        growthStage: "Flowering",
      },
      weatherContext: {
        rainfallForecastMm: 4,
        forecastDate: "2026-10-16",
        source: "Open-Meteo",
      },
    });
    assert.equal(irrigation.basis, "weather-context");
    assert.match(irrigation.answer, /4 mm forecast rainfall/);
    assert.ok(
      irrigation.missingInformation.includes("recent rainfall or a local rainfall forecast") === false,
    );
  });

  it("treats an observed zero rainfall value as supplied context", () => {
    const response = generateChatResponse({
      message: "Should I irrigate after rain?",
      weatherContext: {
        rainfallForecastMm: 0,
        forecastDate: "2026-10-16",
      },
    });
    assert.equal(response.basis, "weather-context");
    assert.match(response.answer, /0 mm forecast rainfall/);
    assert.ok(
      !response.missingInformation.includes(
        "recent rainfall or a local rainfall forecast",
      ),
    );
    assert.doesNotMatch(response.answer, /No validated live weather data was available/);
  });

  it("uses crop-only follow-up answers without inventing irrigation needs", () => {
    const response = generateChatResponse({
      message: "Maize",
      recentTurns: [
        { role: "user", content: "Should I irrigate tomorrow?" },
        {
          role: "assistant",
          content: "What crop are you growing?",
        },
      ],
    });
    assert.equal(response.topicId, "irrigation.general");
    assert.equal(response.basis, "contextual-follow-up");
    assert.match(response.answer, /grow maize/i);
    assert.match(response.answer, /local rainfall information/);
    assert.ok(response.missingInformation.includes("field soil condition"));
  });

  it("answers saved crop and soil questions from supplied profile context only", () => {
    const crop = generateChatResponse({
      message: "What crop am I growing?",
      farmContext: { crop: "Maize" },
    });
    assert.match(crop.answer, /lists Maize as your crop/);
    assert.equal(crop.basis, "contextual-follow-up");

    const soil = generateChatResponse({
      message: "What soil type did I select?",
      farmContext: { soilType: "Black soil" },
    });
    assert.match(soil.answer, /lists Black soil as your soil type/);

    const missing = generateChatResponse({ message: "What crop am I growing?" });
    assert.match(missing.answer, /No saved farm profile context was available/);
  });

  it("answers the requested farmer questions from the supplied context", () => {
    const farmContext = {
      crop: "Maize",
      soilType: "Black soil",
      irrigationMethod: "Drip",
      growthStage: "Flowering",
      farmSize: 2.5,
      location: "Pune, Pune, Maharashtra",
    };
    const locationContext = {
      displayName: "Pune, Pune, Maharashtra",
      state: "Maharashtra",
      district: "Pune",
    };
    const weatherContext = {
      temperatureC: 29,
      humidityPercent: 60,
      windSpeedKmh: 8,
      rainfallForecastMm: 4,
      forecastDate: "2026-10-17",
      source: "Open-Meteo",
      fetchedAt: "2026-10-16T01:00:00.000Z",
    };
    const questions = [
      {
        message: "What crop am I growing?",
        expected: /lists Maize as your crop/,
      },
      {
        message: "What soil type did I select?",
        expected: /lists Black soil as your soil type/,
      },
      {
        message: "Will it rain tomorrow?",
        expected: /4 mm forecast rainfall/,
      },
      {
        message: "What's the weather here?",
        expected: /29 °C.*60% humidity/,
      },
    ];

    for (const { message, expected } of questions) {
      const response = generateChatResponse({
        message,
        farmContext,
        locationContext,
        weatherContext,
      });
      assert.match(response.answer, expected, message);
      if (message === "What's the weather here?") {
        assert.doesNotMatch(response.answer, /question mentions wheat/i);
      }
    }
  });

  it("asks for relevant details for underspecified irrigation advice", () => {
    const response = generateChatResponse({
      message: "When should I irrigate?",
    });
    assert.equal(response.matchedIntent, "irrigation.general");
    assert.ok(response.missingInformation.includes("crop"));
    assert.ok(response.suggestedFollowUps.some((item) => /growth stage/i.test(item)));
    assert.doesNotMatch(response.answer, /\b\d+\s*(litres|millimetres|hours)\b/i);
  });

  it("returns safe clarification and unsupported-topic fallbacks", () => {
    assert.equal(
      generateChatResponse({ message: "weather forecast uncertainty" }).basis,
      "clarification",
    );
    const unsupported = generateChatResponse({ message: "diagnose my plant disease" });
    assert.equal(unsupported.basis, "fallback");
    assert.match(unsupported.answer, /cannot answer arbitrary questions/);
    assert.match(unsupported.answer, /diagnose crop disease/);
  });
});
