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
    assert.match(response.answer, /don't have current weather data/i);
    assert.equal(response.basis, "general-guidance");
    assert.deepEqual(response.missingInformation, [
      "current weather data from a connected weather source",
    ]);
    const locationOnly = generateChatResponse({
      message: "What's the weather here?",
      locationContext: { displayName: "Pune", state: "Maharashtra" },
    });
    assert.equal(locationOnly.topicId, "weather.current");
    assert.match(locationOnly.answer, /don't have current weather data/i);
  });

  it("answers rainfall questions from the exact forecast date without current readings", () => {
    const request: ChatRequest = {
      message: "Will it rain tomorrow?",
      locationContext: { displayName: "Udupi" },
      weatherContext: {
        timezone: "Asia/Kolkata",
        currentTemperatureC: 39,
        dailyForecasts: [
          { date: "2026-10-16", precipitationMm: 1 },
          {
            date: "2026-10-17",
            precipitationMm: 12.3,
            precipitationProbabilityPercent: 80,
          },
        ],
        source: "Open-Meteo",
      },
    };
    const response = generateChatResponse(
      request,
      new Date("2026-10-16T01:00:00.000Z"),
    );
    assert.equal(response.basis, "weather-context");
    assert.match(
      response.answer,
      /Rain is forecast for Udupi tomorrow, with approximately 12\.3 mm expected/,
    );
    assert.match(response.answer, /80%/);
    assert.match(response.answer, /Open-Meteo/);
    assert.doesNotMatch(response.answer, /39 °C/);
    assert.doesNotMatch(response.answer, /2026-10-/);
    assert.doesNotMatch(response.answer, /T\d{2}:/);
    assert.equal(response.verificationStatus, "unverified-general-guidance");
  });

  it("answers current weather with current readings only", () => {
    const current = generateChatResponse({
      message: "What is the weather like here?",
      locationContext: {
        displayName: "Pune, Pune, Maharashtra",
        state: "Maharashtra",
        district: "Pune",
      },
      weatherContext: {
        currentTemperatureC: 29,
        currentHumidityPercent: 60,
        source: "Open-Meteo",
        timezone: "Asia/Kolkata",
        dailyForecasts: [
          { date: "2026-10-16", precipitationMm: 8 },
        ],
      },
    });
    assert.equal(current.topicId, "weather.current");
    assert.match(current.answer, /29 °C/);
    assert.match(current.answer, /60% humidity/);
    assert.match(current.answer, /Current weather for Pune/);
    assert.match(current.answer, /regional estimates/);
    assert.doesNotMatch(current.answer, /8 mm/);
    assert.doesNotMatch(current.answer, /2026-10-/);

    const irrigation = generateChatResponse({
      message: "Should I consider irrigating tomorrow?",
      locationContext: { displayName: "Pune" },
      farmContext: {
        crop: "Maize",
        soilType: "Black soil",
        growthStage: "Flowering",
      },
      weatherContext: {
        timezone: "Asia/Kolkata",
        dailyForecasts: [{ date: "2026-10-16", precipitationMm: 4 }],
        source: "Open-Meteo",
      },
    }, new Date("2026-10-15T12:00:00.000Z"));
    assert.equal(irrigation.basis, "weather-context");
    assert.match(irrigation.answer, /Rain is forecast for Pune tomorrow, with approximately 4 mm expected/);
    assert.ok(
      irrigation.missingInformation.includes("recent rainfall or a local rainfall forecast") === false,
    );
  });

  it("uses the farm timezone when determining tomorrow across UTC date boundaries", () => {
    const response = generateChatResponse({
      message: "Will it rain tomorrow?",
      locationContext: { displayName: "Udupi" },
      weatherContext: {
        timezone: "Asia/Kolkata",
        dailyForecasts: [
          { date: "2026-10-17", precipitationMm: 1 },
          { date: "2026-10-18", precipitationMm: 6.5 },
        ],
      },
    }, new Date("2026-10-16T20:00:00.000Z"));
    assert.equal(response.basis, "weather-context");
    assert.match(response.answer, /approximately 6\.5 mm expected/);
  });

  it("does not substitute another day when tomorrow's rainfall forecast is unavailable", () => {
    const response = generateChatResponse(
      {
        message: "Will it rain tomorrow?",
        locationContext: { displayName: "Udupi" },
        weatherContext: {
          timezone: "Asia/Kolkata",
          dailyForecasts: [
            { date: "2026-10-15", precipitationMm: 0 },
            { date: "2026-10-18", precipitationMm: 20 },
          ],
          source: "Open-Meteo",
        },
      },
      new Date("2026-10-15T12:00:00.000Z"),
    );
    assert.match(response.answer, /don't have tomorrow's forecast/i);
    assert.doesNotMatch(response.answer, /20 mm/);
    assert.ok(response.missingInformation.includes("tomorrow's rainfall forecast"));
  });

  it("uses an actual zero forecast and its supplied probability without inventing certainty", () => {
    const response = generateChatResponse(
      {
        message: "Will it rain tomorrow?",
        locationContext: { displayName: "Udupi" },
        weatherContext: {
          timezone: "Asia/Kolkata",
          dailyForecasts: [
            {
              date: "2026-10-16",
              precipitationMm: 0,
              precipitationProbabilityPercent: 25,
            },
          ],
          source: "Open-Meteo",
        },
      },
      new Date("2026-10-15T12:00:00.000Z"),
    );
    assert.match(response.answer, /approximately 0 mm expected/);
    assert.match(response.answer, /25%/);
    assert.doesNotMatch(response.answer, /no chance|certain|guaranteed/i);
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
      timezone: "Asia/Kolkata",
      currentTemperatureC: 29,
      currentHumidityPercent: 60,
      currentWindSpeedKmh: 8,
      dailyForecasts: [
        {
          date: "2026-10-17",
          precipitationMm: 4,
          precipitationProbabilityPercent: 50,
        },
      ],
      source: "Open-Meteo",
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
        expected: /4 mm expected/,
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
      }, new Date("2026-10-16T01:00:00.000Z"));
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
