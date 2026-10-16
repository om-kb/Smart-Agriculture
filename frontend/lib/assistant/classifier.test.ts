import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyIntent,
  editDistanceAtMostOne,
  extractForecastTemporalIntent,
  extractEntities,
} from "./classifier.ts";
import { KNOWLEDGE_BASE } from "./knowledge/index.ts";

describe("rule-based intent classification", () => {
  it("matches exact questions and recognized synonyms", () => {
    assert.equal(classifyIntent("How do I test my soil?").intent, "soil.testing");
    assert.equal(
      classifyIntent("What is the seven-day forecast?").intent,
      "weather.forecast",
    );
    assert.equal(
      classifyIntent("What's the weather here?").intent,
      "weather.current",
    );
    assert.deepEqual(extractEntities("What's the weather here?").crops, []);
    assert.equal(
      classifyIntent("Is paddy farming suitable for me?").intent,
      "crop.rice",
    );
    assert.equal(
      classifyIntent("How can I save water on my farm?").intent,
      "practice.water-conservation",
    );
  });

  it("uses one-edit fuzzy matching for minor spelling mistakes", () => {
    const result = classifyIntent("tomatto");
    assert.equal(result.status, "supported");
    assert.equal(result.intent, "crop.tomato");
    assert.equal(editDistanceAtMostOne("maize", "maiz"), true);
    assert.equal(editDistanceAtMostOne("cototn", "cotton"), true);
    assert.equal(editDistanceAtMostOne("wheat", "tomato"), false);
  });

  it("extracts crop, soil, and weather concepts", () => {
    assert.deepEqual(extractEntities("maiz in sandy soil before rainfall"), {
      crops: ["maize"],
      soilTypes: ["sandy"],
      weatherConcepts: ["rainfall"],
    });
  });

  it("classifies rainfall questions and extracts their requested forecast date", () => {
    const cases = [
      ["Will it rain today?", { kind: "today" }],
      ["Will it rain tonight?", { kind: "tonight" }],
      ["Will it rain tomorrow?", { kind: "tomorrow" }],
      [
        "Will it rain the day after tomorrow?",
        { kind: "day-after-tomorrow" },
      ],
      [
        "Will it rain on 17 October 2026?",
        { kind: "explicit-date", day: 17, month: 10, year: 2026 },
      ],
      [
        "Rain forecast for October 18",
        { kind: "explicit-date", day: 18, month: 10, year: undefined },
      ],
      [
        "Rain forecast for 2026-10-19",
        { kind: "explicit-date", day: 19, month: 10, year: 2026 },
      ],
    ] as const;

    for (const [question, expected] of cases) {
      assert.deepEqual(extractForecastTemporalIntent(question), expected);
      assert.equal(classifyIntent(question).intent, "weather.forecast", question);
    }
  });

  it("returns safe states for ambiguity, unrelated input, and empty text", () => {
    const ambiguous = classifyIntent("weather forecast uncertainty");
    assert.equal(ambiguous.status, "ambiguous");
    assert.equal(ambiguous.intent, null);
    assert.equal(classifyIntent("Tell me a joke").status, "unsupported");
    assert.equal(classifyIntent("   ").status, "empty");
  });

  it("limits very long input before classification", () => {
    const result = classifyIntent("x".repeat(1_001));
    assert.equal(result.status, "too_long");
    assert.equal(result.intent, null);
  });

  it("has one typed knowledge entry for every advertised topic", () => {
    assert.equal(KNOWLEDGE_BASE.length, 35);
    assert.equal(new Set(KNOWLEDGE_BASE.map((entry) => entry.id)).size, 35);
    for (const entry of KNOWLEDGE_BASE) {
      assert.equal(entry.topicId, entry.id);
      assert.ok(entry.supportedPatterns.length > 0);
      assert.ok(entry.answer.length > 0);
      assert.ok(entry.lastReviewed);
      assert.ok(entry.verificationStatus);
      assert.ok(Array.isArray(entry.references));
      assert.ok(
        entry.supportedPatterns.some(
          (pattern) => classifyIntent(pattern).intent === entry.id,
        ),
        `${entry.id} should be uniquely reachable from at least one example`,
      );
    }
  });
});
