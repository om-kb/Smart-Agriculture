import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
});
