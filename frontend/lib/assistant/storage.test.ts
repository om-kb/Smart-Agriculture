import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStoredConversation } from "./storage.ts";

describe("assistant conversation persistence validation", () => {
  it("restores valid recent user and assistant messages", () => {
    const messages = [
      {
        id: "user-1",
        role: "user",
        content: "How do I test soil?",
        createdAt: "2026-10-15T00:00:00.000Z",
      },
    ];
    assert.deepEqual(parseStoredConversation(JSON.stringify(messages)), {
      messages,
      invalid: false,
    });
  });

  it("rejects malformed data, invalid entries, and excessive history", () => {
    assert.deepEqual(parseStoredConversation("{"), {
      messages: [],
      invalid: true,
    });
    assert.equal(
      parseStoredConversation(JSON.stringify([{ role: "system", content: "x" }]))
        .invalid,
      true,
    );
    assert.equal(
      parseStoredConversation(
        JSON.stringify(
          Array.from({ length: 41 }, (_, index) => ({
            id: `m-${index}`,
            role: "user",
            content: "Question",
            createdAt: "2026-10-15T00:00:00.000Z",
          })),
        ),
      ).invalid,
      true,
    );
  });

  it("handles an empty store without reporting invalid data", () => {
    assert.deepEqual(parseStoredConversation(null), {
      messages: [],
      invalid: false,
    });
  });
});
