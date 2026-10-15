import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLgdService, LgdServiceError, parseEntities } from "./service.ts";
import type { State } from "./types.ts";

const statePayload = {
  success: true,
  data: [
    {
      code: "32",
      name: "Kerala",
      name_local: "KERALA",
      type: "S",
      census_2001_code: "32",
      census_2011_code: "32",
    },
  ],
  meta: { count: 1 },
};

describe("LGD response parsing", () => {
  it("parses the documented response envelope and entity fields", () => {
    assert.deepEqual(parseEntities<State>(statePayload, ["code", "name"], ["type"]), [
      {
        code: "32",
        name: "Kerala",
        name_local: "KERALA",
        type: "S",
        census_2001_code: "32",
        census_2011_code: "32",
      },
    ]);
  });

  it("rejects malformed envelopes and missing required properties", () => {
    assert.throws(
      () => parseEntities<State>({ success: true, data: [], meta: {} }, ["code", "name"]),
      LgdServiceError,
    );
    assert.throws(
      () =>
        parseEntities<State>(
          { ...statePayload, data: [{ code: "32" }] },
          ["code", "name"],
        ),
      /Location data could not be read/,
    );
  });
});

describe("LGD service failures", () => {
  it("uses the documented API endpoint and state parameter", async () => {
    let requestedUrl = "";
    const service = createLgdService(async (input) => {
      requestedUrl = String(input);
      return Response.json(statePayload);
    });

    assert.deepEqual(await service.states(), statePayload.data);
    assert.equal(requestedUrl, "https://india-lgd-index-api.vercel.app/v1/states");
  });

  it("uses the documented district filters for all child levels", async () => {
    const requestedUrls: string[] = [];
    const service = createLgdService(async (input) => {
      requestedUrls.push(String(input));
      return Response.json({
        success: true,
        data: [],
        meta: { count: 0 },
      });
    });

    await service.districts("32");
    await service.subdistricts("607");
    await service.blocks("607");

    assert.deepEqual(requestedUrls, [
      "https://india-lgd-index-api.vercel.app/v1/districts?state=32",
      "https://india-lgd-index-api.vercel.app/v1/subdistricts?district=607",
      "https://india-lgd-index-api.vercel.app/v1/blocks?district=607",
    ]);
  });

  it("converts upstream HTTP failures into a safe service error", async () => {
    const service = createLgdService(async () => new Response("private upstream detail", { status: 500 }));

    await assert.rejects(
      service.districts("32"),
      (error: unknown) =>
        error instanceof LgdServiceError &&
        error.status === 502 &&
        error.message ===
          "Location data is temporarily unavailable. Please try again.",
    );
  });

  it("reports request timeouts with a friendly message", async () => {
    const service = createLgdService(async () => {
      const error = new Error("aborted");
      error.name = "TimeoutError";
      throw error;
    });

    await assert.rejects(
      service.blocks("607"),
      /Location data is taking too long to load/,
    );
  });
});
