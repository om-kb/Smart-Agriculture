import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEntityRouteHandler } from "../../../lib/lgd/route-handler.ts";

describe("location route validation", () => {
  it("rejects missing, malformed, duplicate, and unexpected parameters", async () => {
    let calls = 0;
    const getDistricts = createEntityRouteHandler("state", async () => {
      calls += 1;
      return [];
    });

    for (const search of ["", "?state=abc", "?state=32&state=33", "?district=32"]) {
      const response = await getDistricts(
        new Request(`http://localhost/api/locations/districts${search}`),
      );
      assert.equal(response.status, 400);
      assert.equal(typeof (await response.json()).error, "string");
    }
    assert.equal(calls, 0);
  });

  it("returns a friendly error when the upstream service fails", async () => {
    const getBlocks = createEntityRouteHandler("district", async () => {
      throw new Error("upstream internals must not be exposed");
    });
    const response = await getBlocks(
      new Request("http://localhost/api/locations/blocks?district=607"),
    );

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: "Location data is temporarily unavailable. Please try again.",
    });
  });

  it("returns cached data using the documented query parameter", async () => {
    const getDistricts = createEntityRouteHandler("state", async (state) => [
      { code: "554", name: "Alappuzha", state_code: state },
    ]);
    const response = await getDistricts(
      new Request("http://localhost/api/locations/districts?state=32"),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "public, s-maxage=3600, stale-while-revalidate=86400");
    assert.deepEqual(await response.json(), {
      data: [{ code: "554", name: "Alappuzha", state_code: "32" }],
    });
  });
});
