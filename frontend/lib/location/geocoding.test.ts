import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGeocodingService, GeocodingError } from "./geocoding.ts";
import { createGeocodingRouteHandler } from "./geocoding-route-handler.ts";
import { createRequestSequence } from "../location-selection.ts";
import {
  matchGeocodingAdministrativeArea,
  parseGeocodingRouteResponse,
  parseNominatimResults,
} from "./validation.ts";

const districtFixtures = [
  {
    name: "Udupi",
    lat: "13.5269784",
    lon: "74.8731879",
    addresstype: "state_district",
    address: {
      state_district: "Udupi",
      state: "Karnataka",
      country: "India",
    },
  },
  {
    name: "Wayanad",
    lat: "11.7151291",
    lon: "76.1271185",
    addresstype: "state_district",
    address: {
      state_district: "Wayanad",
      state: "Kerala",
      country: "India",
    },
  },
  {
    name: "Palakkad",
    lat: "10.7873692",
    lon: "76.4742172",
    addresstype: "state_district",
    address: {
      state_district: "Palakkad",
      state: "Kerala",
      country: "India",
    },
  },
  {
    name: "Pune District",
    lat: "18.6448627",
    lon: "73.9224157",
    addresstype: "state_district",
    address: {
      state_district: "Pune",
      state: "Maharashtra",
      country: "India",
    },
  },
  {
    name: "Bengaluru Urban",
    lat: "12.9461554",
    lon: "77.5503844",
    addresstype: "state_district",
    address: {
      state_district: "Bengaluru Urban",
      state: "Karnataka",
      country: "India",
    },
  },
];

describe("OpenStreetMap Nominatim geocoding", () => {
  it("validates area-qualified requests and keeps route errors friendly", async () => {
    let searchCount = 0;
    const getLocations = createGeocodingRouteHandler(async (query, area) => {
      searchCount += 1;
      assert.equal(query, "Udupi");
      assert.deepEqual(area, { district: "Udupi", state: "Karnataka" });
      return parseNominatimResults([districtFixtures[0]]);
    });
    const invalid = await getLocations(
      new Request("http://localhost/api/location-search?q=Udupi"),
    );
    assert.equal(invalid.status, 400);
    assert.equal(searchCount, 0);

    const response = await getLocations(
      new Request(
        "http://localhost/api/location-search?q=Udupi&district=Udupi&state=Karnataka",
      ),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control")?.includes("s-maxage=86400"), true);
    assert.equal((await response.json()).data[0].district, "Udupi");
    assert.equal(searchCount, 1);

    const unavailable = createGeocodingRouteHandler(async () => {
      throw new GeocodingError("Location search is busy. Please wait.", 503);
    });
    const failure = await unavailable(
      new Request(
        "http://localhost/api/location-search?q=Udupi&district=Udupi&state=Karnataka",
      ),
    );
    assert.equal(failure.status, 503);
    assert.deepEqual(await failure.json(), {
      error: "Location search is busy. Please wait.",
    });
  });

  it("parses the five required Indian districts and preserves administrative ownership", () => {
    const results = parseNominatimResults(districtFixtures);
    const expected = [
      ["Udupi", "Karnataka"],
      ["Wayanad", "Kerala"],
      ["Palakkad", "Kerala"],
      ["Pune", "Maharashtra"],
      ["Bengaluru Urban", "Karnataka"],
    ];
    assert.equal(results.length, expected.length);
    for (const [index, [district, state]] of expected.entries()) {
      const result = results[index];
      assert.equal(result?.district, district);
      assert.equal(result?.state, state);
      assert.equal(result?.provider, "openstreetmap");
      assert.equal(
        matchGeocodingAdministrativeArea(result!, { district, state }),
        "match",
      );
    }
  });

  it("ignores out-of-order Udupi to Wayanad to Udupi searches", async () => {
    const requests = createRequestSequence();
    let displayedResult = districtFixtures[0];
    function startSearch() {
      const requestId = requests.next();
      let resolve!: (result: (typeof districtFixtures)[number]) => void;
      const response = new Promise<(typeof districtFixtures)[number]>(
        (complete) => {
          resolve = complete;
        },
      );
      const load = response.then((result) => {
        if (requests.isCurrent(requestId)) displayedResult = result;
      });
      return { resolve, load };
    }

    const firstUdupi = startSearch();
    const wayanad = startSearch();
    const latestUdupi = startSearch();
    const latestResult = {
      ...districtFixtures[0],
      lat: "13.6",
    };

    latestUdupi.resolve(latestResult);
    await latestUdupi.load;
    wayanad.resolve(districtFixtures[1]);
    await wayanad.load;
    firstUdupi.resolve(districtFixtures[0]);
    await firstUdupi.load;

    assert.equal(displayedResult.name, "Udupi");
    assert.equal(displayedResult.lat, "13.6");
  });

  it("sends a country- and district-qualified query with required attribution headers", async () => {
    const requested: { url?: URL; headers?: HeadersInit } = {};
    const service = createGeocodingService(async (input, init) => {
      requested.url = new URL(String(input));
      requested.headers = init?.headers;
      return Response.json([
        districtFixtures[2],
        { ...districtFixtures[0], address: { state: "Karnataka", country: "India" } },
        districtFixtures[0],
      ]);
    });

    const results = await service.search(
      "Udupi, Karnataka",
      { district: "Udupi", state: "Karnataka" },
    );
    assert.equal(
      requested.url?.searchParams.get("q"),
      "Udupi, Karnataka, India",
    );
    assert.equal(requested.url?.searchParams.get("countrycodes"), "in");
    assert.equal(requested.url?.searchParams.get("format"), "jsonv2");
    assert.equal(requested.url?.searchParams.get("addressdetails"), "1");
    assert.match(
      new Headers(requested.headers).get("User-Agent") ?? "",
      /SmartAgricultureAdvisor.*openstreetmap\.org\/copyright/i,
    );
    assert.equal(results[0]?.district, "Udupi");
    assert.equal(results.length, 2);
  });

  it("filters explicit administrative mismatches and keeps incomplete matches unselectable", () => {
    const results = parseNominatimResults([
      ...districtFixtures,
      {
        name: "Udupi",
        lat: "10.7873692",
        lon: "76.4742172",
        address: {
          state_district: "Palakkad",
          state: "Kerala",
          country: "India",
        },
      },
      {
        name: "Udupi",
        lat: "13.5",
        lon: "74.8",
        address: { state: "Karnataka", country: "India" },
      },
    ]);
    const exact = results.find((result) => result.district === "Udupi");
    const ambiguous = results.find((result) => !result.district);
    assert.equal(
      matchGeocodingAdministrativeArea(exact!, {
        district: "Udupi",
        state: "Karnataka",
      }),
      "match",
    );
    assert.equal(
      matchGeocodingAdministrativeArea(ambiguous!, {
        district: "Udupi",
        state: "Karnataka",
      }),
      "ambiguous",
    );
    assert.equal(
      matchGeocodingAdministrativeArea(
        results.find((result) => result.district === "Palakkad")!,
        { district: "Udupi", state: "Karnataka" },
      ),
      "mismatch",
    );
  });

  it("rejects malformed provider and route data", () => {
    assert.throws(() => parseNominatimResults({}), /invalid response/i);
    assert.deepEqual(parseNominatimResults([{ lat: "100", lon: "0" }]), []);
    assert.deepEqual(
      parseGeocodingRouteResponse({
        data: [
          {
            name: "Udupi",
            latitude: 13.526,
            longitude: 74.873,
            state: "Karnataka",
            district: "Udupi",
            country: "India",
            provider: "openstreetmap",
          },
        ],
      })[0]?.provider,
      "openstreetmap",
    );
    assert.throws(() => parseGeocodingRouteResponse({}), /invalid response/i);
  });

  it("returns a friendly geocoding failure", async () => {
    const service = createGeocodingService(
      async () => new Response("upstream internals", { status: 500 }),
    );
    await assert.rejects(
      service.search("Pune", { district: "Pune", state: "Maharashtra" }),
      (error: unknown) =>
        error instanceof GeocodingError &&
        !error.message.includes("upstream internals"),
    );
  });
});
