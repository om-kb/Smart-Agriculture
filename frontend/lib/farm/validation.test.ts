import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deserializeFarmProfile,
  normalizeFarmProfile,
  serializeFarmProfile,
  validateFarmProfile,
} from "./storage.ts";
import { emptyFarmProfile } from "./types.ts";

describe("farm profile validation and storage", () => {
  it("allows an incomplete profile and round-trips it", () => {
    assert.equal(validateFarmProfile(emptyFarmProfile), true);
    assert.deepEqual(
      deserializeFarmProfile(serializeFarmProfile(emptyFarmProfile)),
      emptyFarmProfile,
    );
  });

  it("normalizes farm size and names before saving", () => {
    const profile = normalizeFarmProfile(
      { ...emptyFarmProfile, farmName: "  South field  " },
      "2.5",
    );
    assert.equal(profile.farmName, "South field");
    assert.equal(profile.farmSize, 2.5);
    assert.equal(validateFarmProfile(profile), true);
  });

  it("rejects invalid farm sizes, choices, and dates", () => {
    assert.equal(validateFarmProfile({ ...emptyFarmProfile, farmSize: -2 }), false);
    assert.equal(
      validateFarmProfile({ ...emptyFarmProfile, crop: "Unsupported crop" }),
      false,
    );
    assert.equal(
      validateFarmProfile({ ...emptyFarmProfile, sowingDate: "not-a-date" }),
      false,
    );
    assert.equal(
      validateFarmProfile({ ...emptyFarmProfile, sowingDate: "2026-02-31" }),
      false,
    );
  });

  it("handles corrupt or invalid stored profile data safely", () => {
    assert.equal(deserializeFarmProfile("{broken"), null);
    assert.equal(
      deserializeFarmProfile(JSON.stringify({ ...emptyFarmProfile, farmSize: -1 })),
      null,
    );
  });
});
