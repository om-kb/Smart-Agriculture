import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET } from "./route.ts";

describe("GET /api/health", () => {
  it("returns the application health status", async () => {
    const response = GET();

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      service: "smart-agriculture",
    });
  });
});
