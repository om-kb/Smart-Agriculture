import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGeocodingService, GeocodingError } from "./geocoding.ts";

describe("Open-Meteo geocoding service", () => {
  it("uses documented search parameters and validates geocoding results", async () => {
    const requested: URL[] = [];
    const service = createGeocodingService(async (input) => {
      requested.push(new URL(String(input)));
      return Response.json({
        results: [
          {
            name: "Nashik",
            latitude: 19.99,
            longitude: 73.78,
            admin1: "Maharashtra",
            admin2: "Nashik",
            country: "India",
          },
        ],
      });
    });
    const results = await service.search(" Nashik ");
    assert.equal(requested[0].searchParams.get("name"), " Nashik ");
    assert.equal(requested[0].searchParams.get("format"), "json");
    assert.equal(results[0].state, "Maharashtra");
  });

  it("returns a friendly geocoding failure", async () => {
    const service = createGeocodingService(
      async () => new Response("upstream internals", { status: 500 }),
    );
    await assert.rejects(
      service.search("Pune"),
      (error: unknown) =>
        error instanceof GeocodingError &&
        !error.message.includes("upstream internals"),
    );
  });
});
