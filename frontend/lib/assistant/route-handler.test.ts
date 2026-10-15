import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleChatRequest } from "./route-handler.ts";

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
