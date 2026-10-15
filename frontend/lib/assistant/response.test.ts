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
    assert.match(response.answer, /Live weather is not connected/);
    assert.equal(response.basis, "general-guidance");
    assert.deepEqual(response.missingInformation, [
      "weather data from a connected weather source",
    ]);
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
    assert.doesNotMatch(response.answer, /Live weather is not connected/);
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
