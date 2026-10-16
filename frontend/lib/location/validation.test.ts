import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGeocodingQuery,
  isValidIndiaCoordinates,
  isValidCoordinates,
  matchGeocodingAdministrativeArea,
  parseFarmLocation,
  parseNominatimResults,
  parseGeocodingRouteResponse,
} from "./validation.ts";
import { deserializeLocation, serializeLocation } from "./storage.ts";

describe("location validation and persistence", () => {
  it("builds a qualified geocoding query within the route's limit", () => {
    assert.equal(buildGeocodingQuery("Pune", "Maharashtra"), "Pune, Maharashtra");
    assert.equal(
      buildGeocodingQuery("A".repeat(150), "Maharashtra"),
      "A".repeat(150),
    );
  });

  it("accepts coordinates only within geographic bounds", () => {
    assert.equal(parseFarmLocation(null), null);
    assert.equal(isValidCoordinates(90, 180), true);
    assert.equal(isValidCoordinates(-90, -180), true);
    assert.equal(isValidCoordinates(90.1, 0), false);
    assert.equal(isValidCoordinates(0, -181), false);
    assert.equal(isValidCoordinates(Number.NaN, 0), false);
    assert.equal(isValidIndiaCoordinates(13.5, 74.8), true);
    assert.equal(isValidIndiaCoordinates(13.5, 105), false);
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

  it("preserves validated LGD codes alongside confirmed weather coordinates", () => {
    const location = {
      name: "Alappuzha, Kerala",
      latitude: 9.498,
      longitude: 76.338,
      state: "Kerala",
      district: "Alappuzha",
      administrativeArea: {
        state: { code: "32", name: "Kerala" },
        district: { code: "554", name: "Alappuzha" },
        subdistrict: { code: "2660", name: "Ambalappuzha" },
        block: { code: "6716", name: "Ambalappuzha" },
      },
      source: "openstreetmap" as const,
      coordinatesConfirmed: true,
    };
    assert.deepEqual(
      deserializeLocation(serializeLocation(location)),
      location,
    );
    assert.equal(
      parseFarmLocation({
        ...location,
        administrativeArea: {
          ...location.administrativeArea,
          district: { code: "not-a-code", name: "Alappuzha" },
        },
      }),
      null,
    );
  });

  it("distinguishes exact, ambiguous, and conflicting geocoding areas", () => {
    const selected = { state: "Maharashtra", district: "Pune" };
    assert.equal(
      matchGeocodingAdministrativeArea(
        { name: "Pune", state: "Maharashtra", district: "Pune", latitude: 18, longitude: 73 },
        selected,
      ),
      "match",
    );
    assert.equal(
      matchGeocodingAdministrativeArea(
        { name: "Pune", state: "Maharashtra", latitude: 18, longitude: 73 },
        selected,
      ),
      "ambiguous",
    );
    assert.equal(
      matchGeocodingAdministrativeArea(
        { name: "Pune", state: "Goa", district: "Pune", latitude: 18, longitude: 73 },
        selected,
      ),
      "mismatch",
    );
    for (const [districtAlias, district] of [
      ["Udipi", "Udupi"],
      ["Wynaad District", "Wayanad"],
      ["Palghat", "Palakkad"],
      ["Poona", "Pune"],
      ["Bangalore Urban", "Bengaluru Urban"],
    ]) {
      assert.equal(
        matchGeocodingAdministrativeArea(
          {
            name: districtAlias,
            state: "Karnataka",
            district: districtAlias,
            latitude: 13,
            longitude: 74,
          },
          { state: "Karnataka", district },
        ),
        "match",
        districtAlias,
      );
    }
  });

  it("parses Nominatim address details and filters malformed results", () => {
    assert.deepEqual(
      parseNominatimResults([
          { name: "Pune", latitude: 18.52, longitude: 73.85, admin1: "Maharashtra" },
          {
            name: "Pune District",
            lat: "18.52",
            lon: "73.85",
            addresstype: "state_district",
            address: {
              state_district: "Pune",
              state: "Maharashtra",
              country: "India",
            },
          },
          { name: "Invalid", lat: "100", lon: "0", address: {} },
        ]),
      [
        {
          name: "Pune District",
          latitude: 18.52,
          longitude: 73.85,
          state: "Maharashtra",
          district: "Pune",
          country: "India",
          provider: "openstreetmap",
        },
      ],
    );
    assert.deepEqual(
      parseGeocodingRouteResponse({
        data: [
          {
            name: "Pune",
            latitude: 18.52,
            longitude: 73.85,
            state: "Maharashtra",
            district: "Pune",
            country: "India",
          },
          { name: "Invalid", latitude: 91, longitude: 0 },
        ],
      }),
      [
        {
          name: "Pune",
          latitude: 18.52,
          longitude: 73.85,
          state: "Maharashtra",
          district: "Pune",
          country: "India",
        },
      ],
    );
    assert.throws(() => parseGeocodingRouteResponse({}), /invalid response/i);
  });
});
