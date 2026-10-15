import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createRequestSequence,
  filterDistrictsForState,
  parseSavedLocation,
  resetAfterDistrictChange,
  resetAfterStateChange,
  saveSelection,
  type LocationSelectionState,
} from "./location-selection.ts";

const fullSelection: LocationSelectionState = {
  state: "32",
  district: "554",
  subdistrict: "2660",
  block: "6716",
};

describe("cascading location selection", () => {
  it("clears all child selections when the state changes", () => {
    assert.deepEqual(resetAfterStateChange("20"), {
      state: "20",
      district: "",
      subdistrict: "",
      block: "",
    });
  });

  it("clears sub-district and block when the district changes", () => {
    assert.deepEqual(resetAfterDistrictChange(fullSelection, "555"), {
      state: "32",
      district: "555",
      subdistrict: "",
      block: "",
    });
  });

  it("saves district-level choices and restores valid saved locations", () => {
    const saved = saveSelection(fullSelection, "Kerala", "Alappuzha", "", "");
    assert.deepEqual(saved, {
      state: { code: "32", name: "Kerala" },
      district: { code: "554", name: "Alappuzha" },
    });
    assert.deepEqual(parseSavedLocation(saved), saved);
  });

  it("rejects malformed saved data instead of restoring it", () => {
    assert.equal(
      parseSavedLocation({
        state: { code: "32", name: "Kerala" },
        district: { code: "not-a-code", name: "Alappuzha" },
      }),
      null,
    );
    assert.equal(parseSavedLocation(null), null);
  });

  it("keeps only the latest state response when requests finish out of order", async () => {
    const requests = createRequestSequence();
    const visibleDistricts: Array<{
      code: string;
      name: string;
      state_code: string;
    }> = [];
    let visibleState = "";
    let resolveMaharashtra!: (value: Array<{
      code: string;
      name: string;
      state_code: string;
    }>) => void;
    let resolveKerala!: (value: Array<{
      code: string;
      name: string;
      state_code: string;
    }>) => void;
    const maharashtraResponse = new Promise<Array<{
      code: string;
      name: string;
      state_code: string;
    }>>((resolve) => {
      resolveMaharashtra = resolve;
    });
    const keralaResponse = new Promise<Array<{
      code: string;
      name: string;
      state_code: string;
    }>>((resolve) => {
      resolveKerala = resolve;
    });

    const maharashtraRequest = requests.next();
    const maharashtraLoad = maharashtraResponse.then((districts) => {
      if (requests.isCurrent(maharashtraRequest)) {
        visibleDistricts.splice(
          0,
          visibleDistricts.length,
          ...filterDistrictsForState(districts, "27"),
        );
        visibleState = "27";
      }
    });
    const keralaRequest = requests.next();
    const keralaLoad = keralaResponse.then((districts) => {
      if (requests.isCurrent(keralaRequest)) {
        visibleDistricts.splice(
          0,
          visibleDistricts.length,
          ...filterDistrictsForState(districts, "32"),
        );
        visibleState = "32";
      }
    });

    resolveKerala([
      { code: "554", name: "Alappuzha", state_code: "32" },
      { code: "521", name: "Pune", state_code: "27" },
    ]);
    await keralaLoad;
    resolveMaharashtra([{ code: "521", name: "Pune", state_code: "27" }]);
    await maharashtraLoad;

    assert.equal(visibleState, "32");
    assert.deepEqual(visibleDistricts, [
      { code: "554", name: "Alappuzha", state_code: "32" },
    ]);
  });

  it("filters live district records for all six states by normalized ownership", () => {
    const stateDistricts = [
      { code: "524", name: "Bagalkote", state_code: "29" },
      { code: "466", name: "Ahilyanagar", state_code: "27" },
      { code: "610", name: "Ariyalur", state_code: "33" },
      { code: "554", name: "Alappuzha", state_code: "32" },
      { code: "118", name: "Agra", state_code: "9" },
      { code: "77", name: "Central", state_code: "7" },
    ];

    for (const stateCode of ["29", "27", "33", "32", "9", "7"]) {
      const filtered = filterDistrictsForState(stateDistricts, stateCode);
      assert.ok(filtered.length > 0, `state ${stateCode} should have districts`);
      assert.ok(filtered.every((district) => district.state_code === stateCode));
    }
  });

  it("keeps the newest response after six rapid state switches", async () => {
    const requests = createRequestSequence();
    const stateCodes = ["29", "27", "33", "32", "9", "7"];
    const pending: Array<{
      requestId: number;
      stateCode: string;
      resolve: (districts: Array<{
        code: string;
        name: string;
        state_code: string;
      }>) => void;
    }> = [];
    let displayedState = "";
    let displayedDistricts: Array<{
      code: string;
      name: string;
      state_code: string;
    }> = [];

    const loads = stateCodes.map((stateCode) => {
      const requestId = requests.next();
      let resolve!: (districts: Array<{
        code: string;
        name: string;
        state_code: string;
      }>) => void;
      const response = new Promise<Array<{
        code: string;
        name: string;
        state_code: string;
      }>>((complete) => {
        resolve = complete;
      });
      pending.push({ requestId, stateCode, resolve });
      return response.then((districts) => {
        if (requests.isCurrent(requestId)) {
          displayedState = stateCode;
          displayedDistricts = filterDistrictsForState(districts, stateCode);
        }
      });
    });

    for (const request of [...pending].reverse()) {
      request.resolve([
        {
          code: `district-${request.stateCode}`,
          name: `District ${request.stateCode}`,
          state_code: request.stateCode,
        },
        { code: "foreign", name: "Foreign", state_code: "99" },
      ]);
    }
    await Promise.all(loads);

    assert.equal(displayedState, "7");
    assert.deepEqual(displayedDistricts, [
      { code: "district-7", name: "District 7", state_code: "7" },
    ]);
  });
});
