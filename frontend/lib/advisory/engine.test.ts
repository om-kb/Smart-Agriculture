import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateAdvisories } from "./engine.ts";
import type { WeatherData } from "../weather/types.ts";

function forecast(overrides: Partial<WeatherData["daily"][number]> = {}) {
  return {
    date: "2026-10-15",
    maxTemperatureC: 25,
    minTemperatureC: 18,
    precipitationMm: 0,
    precipitationProbabilityPercent: 0,
    maxWindSpeedKmh: 10,
    weatherCode: 0,
    ...overrides,
  };
}

describe("weather advisory rules", () => {
  it("warns about heavy rainfall and severe rainfall thresholds", () => {
    const advisories = generateAdvisories({
      current: { temperatureC: null },
      daily: [
        forecast({ precipitationMm: 85 }),
        forecast({ date: "2026-10-16", precipitationMm: 0 }),
      ],
    } as WeatherData);
    const advisory = advisories.find((item) => item.id === "heavy-rainfall");
    assert.equal(advisory?.severity, "warning");
    assert.equal(advisory?.ruleId, "rainfall.daily_mm >= 50");
  });

  it("creates heat, wind, low-rain and irrigation awareness when thresholds are met", () => {
    const advisories = generateAdvisories({
      current: { temperatureC: 32 },
      daily: Array.from({ length: 7 }, (_, index) =>
        forecast({
          date: `2026-10-${15 + index}`,
          maxTemperatureC: index === 0 ? 40 : 25,
          maxWindSpeedKmh: index === 0 ? 45 : 10,
          precipitationMm: index === 0 ? 1 : 0,
        }),
      ),
    } as WeatherData);
    assert.deepEqual(
      advisories.map((item) => item.id),
      [
        "high-temperature",
        "strong-wind",
        "low-rainfall",
        "irrigation-awareness",
      ],
    );
  });

  it("does not generate weather-dependent advisories from missing values", () => {
    assert.deepEqual(
      generateAdvisories({
        current: { temperatureC: null },
        daily: [
          forecast({
            maxTemperatureC: null,
            maxWindSpeedKmh: null,
            precipitationMm: null,
          }),
        ],
      } as WeatherData),
      [],
    );
  });

  it("does not infer low weekly rainfall from incomplete daily data", () => {
    const partialDays = Array.from({ length: 7 }, (_, index) =>
      forecast({
        date: `2026-10-${15 + index}`,
        precipitationMm: index === 0 ? 0 : null,
      }),
    );
    const advisories = generateAdvisories({
      current: { temperatureC: 35 },
      daily: partialDays,
    } as WeatherData);
    assert.deepEqual(advisories, []);
  });

  it("returns no advisories when observed forecast values are below thresholds", () => {
    assert.deepEqual(
      generateAdvisories({
        current: { temperatureC: 20 },
        daily: [forecast({ precipitationMm: 20 })],
      } as WeatherData),
      [],
    );
  });
});
