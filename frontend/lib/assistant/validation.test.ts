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
