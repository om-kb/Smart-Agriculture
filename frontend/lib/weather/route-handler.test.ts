import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createWeatherRouteHandler } from "./route-handler.ts";

describe("weather API input validation", () => {
  it("rejects missing, malformed, out-of-range, duplicate, and extra parameters", async () => {
    let calls = 0;
    const handler = createWeatherRouteHandler(async () => {
      calls += 1;
      return { current: {} };
    });
    for (const query of [
      "",
      "?latitude=x&longitude=10",
      "?latitude=91&longitude=10",
      "?latitude=10&longitude=181",
      "?latitude=10&longitude=10&extra=1",
      "?latitude=10&latitude=11&longitude=10",
    ]) {
      const response = await handler(
        new Request(`http://localhost/api/weather${query}`),
      );
      assert.equal(response.status, 400);
    }
    assert.equal(calls, 0);
  });

  it("serves valid coordinates with a cache policy", async () => {
    const handler = createWeatherRouteHandler(async (latitude, longitude) => ({
      latitude,
      longitude,
    }));
    const response = await handler(
      new Request("http://localhost/api/weather?latitude=19.99&longitude=73.78"),
    );
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Cache-Control"),
      "public, s-maxage=1800, stale-while-revalidate=3600",
    );
    assert.deepEqual(await response.json(), {
      data: { latitude: 19.99, longitude: 73.78 },
    });
  });
});
