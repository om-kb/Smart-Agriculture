import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateChatResponse } from "./response.ts";
import type { ChatRequest, WeatherContext } from "./types.ts";

const now = new Date("2026-10-16T01:00:00.000Z");
const locationContext = {
  displayName: "Udupi, Udupi, Karnataka",
  district: "Udupi",
  state: "Karnataka",
};
const datedWeather: WeatherContext = {
  timezone: "Asia/Kolkata",
  source: "Open-Meteo",
  dailyForecasts: [
    {
      date: "2026-10-16",
      precipitationMm: 1.2,
      precipitationProbabilityPercent: 30,
    },
    {
      date: "2026-10-17",
      precipitationMm: 12.3,
      precipitationProbabilityPercent: 80,
    },
    {
      date: "2026-10-18",
      precipitationMm: 6.5,
    },
    {
      date: "2026-10-19",
      precipitationMm: 0,
      precipitationProbabilityPercent: 25,
    },
  ],
};

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

  it("selects distinct daily forecast records for today, tomorrow, and the day after", () => {
    const cases = [
      {
        message: "Will it rain today?",
        date: "16 October",
        precipitation: "1.2 mm",
      },
      {
        message: "Will it rain tomorrow?",
        date: "17 October",
        precipitation: "12.3 mm",
      },
      {
        message: "Will it rain the day after tomorrow?",
        date: "18 October",
        precipitation: "6.5 mm",
      },
    ];

    for (const item of cases) {
      const response = generateChatResponse(
        {
          message: item.message,
          locationContext,
          weatherContext: datedWeather,
        },
        now,
      );
      assert.equal(response.topicId, "weather.forecast");
      assert.match(response.answer, new RegExp(`For Udupi on ${item.date}`));
      assert.match(response.answer, new RegExp(item.precipitation));
      assert.match(response.answer, /Open-Meteo/);
      assert.match(response.answer, /Actual rainfall at your farm may differ/);
      assert.doesNotMatch(response.answer, /2026-10-|T\d{2}:/);
    }
  });

  it("uses the exact explicit date and omits missing probabilities", () => {
    const request: ChatRequest = {
      message: "Rain forecast for October 18?",
      locationContext,
      weatherContext: datedWeather,
    };
    const response = generateChatResponse(request, now);
    assert.match(response.answer, /For Udupi on 18 October/);
    assert.match(response.answer, /approximately 6\.5 mm of rain/);
    assert.doesNotMatch(response.answer, /probability/);

    const isoDate = generateChatResponse(
      {
        message: "Will it rain on 2026-10-19?",
        locationContext,
        weatherContext: datedWeather,
      },
      now,
    );
    assert.match(isoDate.answer, /For Udupi on 19 October/);
    assert.match(isoDate.answer, /approximately 0 mm of rain with 25% probability/);
  });

  it("uses timezone-local calendar boundaries for relative dates", () => {
    const afterUtcMidnight = generateChatResponse(
      {
        message: "Will it rain tomorrow?",
        locationContext,
        weatherContext: {
          timezone: "Asia/Kolkata",
          dailyForecasts: [
            { date: "2026-10-17", precipitationMm: 2 },
            { date: "2026-10-18", precipitationMm: 8.4 },
          ],
        },
      },
      new Date("2026-10-16T20:00:00.000Z"),
    );
    assert.match(afterUtcMidnight.answer, /For Udupi on 18 October/);
    assert.match(afterUtcMidnight.answer, /8\.4 mm/);
  });

  it("reports unavailable daily and hourly forecasts without substituting another date", () => {
    const missingDate = generateChatResponse(
      {
        message: "Will it rain tomorrow?",
        locationContext,
        weatherContext: {
          ...datedWeather,
          dailyForecasts: [
            { date: "2026-10-16", precipitationMm: 0 },
            { date: "2026-10-20", precipitationMm: 20 },
          ],
        },
      },
      now,
    );
    assert.match(missingDate.answer, /don't have a forecast for Udupi on 17 October/i);
    assert.match(missingDate.answer, /covers 16 October to 20 October/);
    assert.doesNotMatch(missingDate.answer, /20 mm/);
    assert.ok(
      missingDate.missingInformation.includes("rainfall forecast for 17 October"),
    );

    const missingValues = generateChatResponse(
      {
        message: "Will it rain today?",
        locationContext,
        weatherContext: {
          timezone: "Asia/Kolkata",
          dailyForecasts: [
            { date: "2026-10-16" },
            { date: "2026-10-17", precipitationMm: 10 },
          ],
        },
      },
      now,
    );
    assert.match(missingValues.answer, /Rainfall details are not available.*16 October/);
    assert.doesNotMatch(missingValues.answer, /10 mm/);

    const tonight = generateChatResponse(
      {
        message: "Will it rain tonight?",
        locationContext,
        weatherContext: datedWeather,
      },
      now,
    );
    assert.match(tonight.answer, /don't have an hourly forecast/i);
    assert.ok(tonight.missingInformation.includes("an hourly forecast for tonight"));
    assert.doesNotMatch(tonight.answer, /12\.3 mm/);
  });

  it("returns a clear answer when relative date selection lacks timezone context", () => {
    const response = generateChatResponse({
      message: "Will it rain today?",
      locationContext,
      weatherContext: {
        dailyForecasts: [{ date: "2026-10-16", precipitationMm: 5 }],
      },
    });
    assert.match(response.answer, /timezone or date is unavailable/i);
    assert.equal(response.basis, "general-guidance");
  });

  it("answers current weather from current observations only", () => {
    const response = generateChatResponse({
      message: "What's the weather here?",
      locationContext: { displayName: "Pune, Maharashtra" },
      weatherContext: {
        timezone: "Asia/Kolkata",
        currentTemperatureC: 29,
        currentHumidityPercent: 60,
        dailyForecasts: [{ date: "2026-10-17", precipitationMm: 8 }],
        source: "Open-Meteo",
      },
    });
    assert.match(response.answer, /29 °C/);
    assert.match(response.answer, /60% humidity/);
    assert.doesNotMatch(response.answer, /8 mm/);
  });

  it("uses supplied forecast context for irrigation without hiding missing farm details", () => {
    const response = generateChatResponse(
      {
        message: "Should I consider irrigating tomorrow?",
        locationContext: { district: "Udupi" },
        farmContext: {
          crop: "Maize",
          soilType: "Black soil",
          growthStage: "Flowering",
        },
        weatherContext: datedWeather,
      },
      now,
    );
    assert.equal(response.basis, "weather-context");
    assert.match(response.answer, /17 October/);
    assert.match(response.answer, /12\.3 mm/);
    assert.ok(
      !response.missingInformation.includes(
        "recent rainfall or a local rainfall forecast",
      ),
    );
  });

  it("uses crop-only follow-up answers without inventing irrigation needs", () => {
    const response = generateChatResponse({
      message: "Maize",
      recentTurns: [
        { role: "user", content: "Should I irrigate tomorrow?" },
        { role: "assistant", content: "What crop are you growing?" },
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
