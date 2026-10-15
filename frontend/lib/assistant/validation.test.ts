import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isChatResponse, validateChatRequest } from "./validation.ts";
import { generateChatResponse } from "./response.ts";

describe("chat request validation", () => {
  it("accepts a valid message with typed context", () => {
    const result = validateChatRequest({
      message: "Should I irrigate?",
      farmContext: { crop: "Maize", farmSize: 2 },
      weatherContext: {
        rainfallForecastMm: 5,
        forecastDate: "2026-10-16",
      },
      recentTurns: [{ role: "user", content: "Earlier question" }],
    });
    assert.equal(result.valid, true);
  });

  it("accepts location names within the validated location model limits", () => {
    assert.equal(
      validateChatRequest({
        message: "Where is my farm?",
        locationContext: {
          displayName: "L".repeat(200),
          state: "S".repeat(160),
          district: "D".repeat(160),
        },
        farmContext: { location: "L".repeat(200) },
      }).valid,
      true,
    );
  });

  it("validates conversation turns using the role-specific stored message limits", () => {
    const longAssistantReply = generateChatResponse({
      message: "How do I protect crops from heat?",
      farmContext: {
        crop: "Maize",
        soilType: "Black soil",
        irrigationMethod: "Drip",
        growthStage: "Flowering",
        farmSize: 2.5,
        location: "Pune, Pune, Maharashtra",
      },
      locationContext: {
        displayName: "Pune, Pune, Maharashtra",
        state: "Maharashtra",
        district: "Pune",
      },
      weatherContext: {
        temperatureC: 39,
        humidityPercent: 60,
        windSpeedKmh: 8,
        forecastDate: "2026-10-16",
        rainfallForecastMm: 4,
        source: "Open-Meteo",
        fetchedAt: "2026-10-16T01:00:00.000Z",
      },
    }).answer;
    assert.ok(longAssistantReply.length > 500);
    assert.equal(
      validateChatRequest({
        message: "What crop am I growing?",
        recentTurns: [
          { role: "user", content: "How do I protect crops from heat?" },
          { role: "assistant", content: longAssistantReply },
        ],
        farmContext: { crop: "Maize" },
      }).valid,
      true,
    );
    assert.equal(
      validateChatRequest({
        message: "Question",
        recentTurns: [{ role: "user", content: "x".repeat(501) }],
      }).valid,
      false,
    );
    assert.equal(
      validateChatRequest({
        message: "Question",
        recentTurns: [{ role: "assistant", content: "x".repeat(5_001) }],
      }).valid,
      false,
    );
  });

  it("rejects malformed messages and unknown request keys", () => {
    assert.equal(validateChatRequest({ message: "" }).valid, false);
    assert.equal(validateChatRequest({ message: "x".repeat(501) }).valid, false);
    assert.equal(
      validateChatRequest({ message: "Question", unexpected: true }).valid,
      false,
    );
  });

  it("rejects out-of-range, wrongly typed, or oversized context", () => {
    assert.equal(
      validateChatRequest({
        message: "Question",
        weatherContext: { humidityPercent: 120 },
      }).valid,
      false,
    );
    assert.equal(
      validateChatRequest({
        message: "Question",
        weatherContext: { forecastDate: "2026-02-31" },
      }).valid,
      false,
    );
    assert.equal(
      validateChatRequest({
        message: "Question",
        farmContext: { farmSize: -1 },
      }).valid,
      false,
    );
    assert.equal(
      validateChatRequest({
        message: "Question",
        recentTurns: Array.from({ length: 11 }, () => ({
          role: "user",
          content: "Earlier",
        })),
      }).valid,
      false,
    );
  });

  it("validates structured chat responses before the UI restores them", () => {
    const response = generateChatResponse({ message: "How do I test my soil?" });
    assert.equal(isChatResponse(response), true);
    const appHelp = generateChatResponse({
      message: "How do I select my farm location?",
    });
    assert.equal(isChatResponse(appHelp), true);
    assert.equal(
      isChatResponse({ ...response, confidence: 1.5 }),
      false,
    );
    assert.equal(
      isChatResponse({
        ...response,
        sources: [
          {
            label: "Unknown",
            url: "javascript:alert(1)",
            note: "invalid protocol",
          },
        ],
      }),
      false,
    );
  });
});
