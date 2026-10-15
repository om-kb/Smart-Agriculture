import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidCoordinates,
  parseFarmLocation,
  parseGeocodingResults,
} from "./validation.ts";
import { deserializeLocation, serializeLocation } from "./storage.ts";

describe("location validation and persistence", () => {
  it("accepts coordinates only within geographic bounds", () => {
    assert.equal(parseFarmLocation(null), null);
    assert.equal(isValidCoordinates(90, 180), true);
    assert.equal(isValidCoordinates(-90, -180), true);
    assert.equal(isValidCoordinates(90.1, 0), false);
    assert.equal(isValidCoordinates(0, -181), false);
    assert.equal(isValidCoordinates(Number.NaN, 0), false);
  });

  it("safely serializes and restores a confirmed manual location", () => {
    const location = {
      name: "My field",
      latitude: 20.5,
      longitude: 78.2,
      source: "manual" as const,
      coordinatesConfirmed: true,
    };
    assert.deepEqual(deserializeLocation(serializeLocation(location)), location);
    assert.equal(parseFarmLocation({ ...location, latitude: 100 }), null);
  });

  it("filters malformed geocoder results and handles failed responses", () => {
    assert.deepEqual(
      parseGeocodingResults({
        results: [
          { name: "Pune", latitude: 18.52, longitude: 73.85, admin1: "Maharashtra" },
          { name: "Invalid", latitude: 100, longitude: 0 },
        ],
      }),
      [
        {
          name: "Pune",
          latitude: 18.52,
          longitude: 73.85,
          state: "Maharashtra",
        },
      ],
    );
    assert.throws(() => parseGeocodingResults({}), /invalid response/i);
  });
});
