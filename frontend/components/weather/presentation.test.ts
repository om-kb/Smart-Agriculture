import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeWeatherCode,
  formatForecastDate,
  formatValue,
} from "./presentation.ts";

describe("weather presentation helpers", () => {
  it("maps documented WMO codes and missing values", () => {
    assert.deepEqual(describeWeatherCode(0), { label: "Clear sky", icon: "☀" });
    assert.equal(describeWeatherCode(3).label, "Overcast");
    assert.deepEqual(describeWeatherCode(95), {
      label: "Thunderstorm",
      icon: "⛈",
    });
    assert.equal(describeWeatherCode(null).label, "Conditions unavailable");
  });

  it("formats dates and missing measurements safely", () => {
    assert.match(formatForecastDate("2026-10-15"), /15/);
    assert.equal(formatValue(null, "°"), "—");
    assert.equal(formatValue(25.4, "°"), "25°");
  });
});
