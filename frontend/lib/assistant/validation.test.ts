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
        timezone: "Asia/Kolkata",
        dailyForecasts: [
          {
            date: "2026-10-16",
            precipitationMm: 5,
          },
        ],
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
    const longAssistantReply = "Stored assistant response ".repeat(30);
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
        weatherContext: { currentHumidityPercent: 120 },
      }).valid,
      false,
    );
    assert.equal(
      validateChatRequest({
        message: "Question",
        weatherContext: {
          dailyForecasts: [{ date: "2026-02-31", precipitationMm: 0 }],
        },
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

  it("rejects weather context associated with another selected location", () => {
    assert.equal(
      validateChatRequest({
        message: "Will it rain tomorrow?",
        locationContext: {
          displayName: "Wayanad, Kerala",
          locationKey: "wayanad-request",
        },
        weatherContext: {
          locationKey: "udupi-request",
          timezone: "Asia/Kolkata",
          dailyForecasts: [{ date: "2026-10-17", precipitationMm: 12 }],
        },
      }).valid,
      false,
    );
    assert.equal(
      validateChatRequest({
        message: "Will it rain tomorrow?",
        locationContext: {
          displayName: "Udupi, Karnataka",
          locationKey: "udupi-request",
        },
        weatherContext: {
          locationKey: "udupi-request",
          timezone: "Asia/Kolkata",
          dailyForecasts: [{ date: "2026-10-17", precipitationMm: 12 }],
        },
      }).valid,
      true,
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
