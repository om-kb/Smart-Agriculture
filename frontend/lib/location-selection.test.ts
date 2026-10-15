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
});
