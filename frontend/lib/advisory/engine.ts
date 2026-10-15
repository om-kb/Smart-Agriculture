import type { WeatherData } from "../weather/types.ts";

export const ADVISORY_THRESHOLDS = {
  heavyRainWarningMm: 50,
  heavyRainSevereMm: 80,
  highTemperatureC: 38,
  strongWindKmh: 40,
  lowWeeklyRainMm: 5,
  irrigationAwarenessTemperatureC: 30,
} as const;

export type AdvisorySeverity = "information" | "caution" | "warning";
export type AdvisoryCategory =
  | "heavy-rainfall"
  | "high-temperature"
  | "strong-wind"
  | "low-rainfall"
  | "irrigation-awareness";

export interface AgriculturalAdvisory {
  id: string;
  category: AdvisoryCategory;
  severity: AdvisorySeverity;
  title: string;
  explanation: string;
  supportingWeather: string;
  precautions: string[];
  ruleId: string;
}

function maximumByForecast<T>(
  days: T[],
  getValue: (day: T) => number | null,
): T | null {
  let maximum: T | null = null;
  let maximumValue = Number.NEGATIVE_INFINITY;
  for (const day of days) {
    const value = getValue(day);
    if (value !== null && value > maximumValue) {
      maximum = day;
      maximumValue = value;
    }
  }
  return maximum;
}

export function generateAdvisories(
  weather: Pick<WeatherData, "current" | "daily">,
): AgriculturalAdvisory[] {
  const advisories: AgriculturalAdvisory[] = [];
  const wettestDay = maximumByForecast(
    weather.daily,
    (day) => day.precipitationMm,
  );
  if (
    wettestDay?.precipitationMm !== null &&
    wettestDay?.precipitationMm !== undefined &&
    wettestDay.precipitationMm >= ADVISORY_THRESHOLDS.heavyRainWarningMm
  ) {
    advisories.push({
      id: "heavy-rainfall",
      category: "heavy-rainfall",
      severity:
        wettestDay.precipitationMm >= ADVISORY_THRESHOLDS.heavyRainSevereMm
          ? "warning"
          : "caution",
      title: "Heavy rainfall in the forecast",
      explanation:
        "A high daily rainfall forecast can increase local waterlogging and runoff risk. Conditions vary by field and drainage.",
      supportingWeather: `${wettestDay.precipitationMm} mm forecast on ${wettestDay.date}`,
      precautions: [
        "Check field drains and clear blocked outlets where safe.",
        "Avoid working in waterlogged fields.",
        "Follow local weather and agriculture department alerts.",
      ],
      ruleId: "rainfall.daily_mm >= 50",
    });
  }

  const hottestDay = maximumByForecast(
    weather.daily,
    (day) => day.maxTemperatureC,
  );
  if (
    hottestDay?.maxTemperatureC !== null &&
    hottestDay?.maxTemperatureC !== undefined &&
    hottestDay.maxTemperatureC >= ADVISORY_THRESHOLDS.highTemperatureC
  ) {
    advisories.push({
      id: "high-temperature",
      category: "high-temperature",
      severity: "caution",
      title: "High temperatures expected",
      explanation:
        "Forecast temperatures at this level may increase heat stress for people, livestock, and some crops.",
      supportingWeather: `${hottestDay.maxTemperatureC} °C maximum on ${hottestDay.date}`,
      precautions: [
        "Plan outdoor work for cooler parts of the day.",
        "Provide drinking water and shade for livestock.",
        "Check crops regularly and follow locally appropriate guidance.",
      ],
      ruleId: "temperature.daily_max_c >= 38",
    });
  }

  const windiestDay = maximumByForecast(
    weather.daily,
    (day) => day.maxWindSpeedKmh,
  );
  if (
    windiestDay?.maxWindSpeedKmh !== null &&
    windiestDay?.maxWindSpeedKmh !== undefined &&
    windiestDay.maxWindSpeedKmh >= ADVISORY_THRESHOLDS.strongWindKmh
  ) {
    advisories.push({
      id: "strong-wind",
      category: "strong-wind",
      severity: "caution",
      title: "Strong winds expected",
      explanation:
        "Strong winds may affect exposed crops and light structures. Local gusts can differ from this forecast.",
      supportingWeather: `${windiestDay.maxWindSpeedKmh} km/h maximum on ${windiestDay.date}`,
      precautions: [
        "Secure loose items and check temporary structures.",
        "Use caution around trees and exposed equipment.",
        "Follow official warnings if conditions worsen.",
      ],
      ruleId: "wind.daily_max_kmh >= 40",
    });
  }

  const knownRainDays = weather.daily.filter(
    (day) => day.precipitationMm !== null,
  );
  const weeklyRain = knownRainDays.reduce(
    (total, day) => total + (day.precipitationMm ?? 0),
    0,
  );
  const hasCompleteForecastRain =
    weather.daily.length === 7 && knownRainDays.length === 7;
  if (
    hasCompleteForecastRain &&
    weeklyRain < ADVISORY_THRESHOLDS.lowWeeklyRainMm
  ) {
    advisories.push({
      id: "low-rainfall",
      category: "low-rainfall",
      severity: "information",
      title: "Little rainfall expected",
      explanation:
        "The available forecast shows little rain. This is not a soil-moisture measurement or a prediction of crop water need.",
      supportingWeather: `${weeklyRain.toFixed(1)} mm across ${knownRainDays.length} forecast days`,
      precautions: [
        "Review local conditions and your field's recent rainfall.",
        "Plan water use using crop, soil, and irrigation guidance from local experts.",
      ],
      ruleId: "rainfall.known_forecast_total_mm < 5",
    });
  }

  if (
    weather.current.temperatureC !== null &&
    weather.current.temperatureC >=
      ADVISORY_THRESHOLDS.irrigationAwarenessTemperatureC &&
    weeklyRain < ADVISORY_THRESHOLDS.lowWeeklyRainMm &&
    hasCompleteForecastRain
  ) {
    advisories.push({
      id: "irrigation-awareness",
      category: "irrigation-awareness",
      severity: "information",
      title: "Review irrigation plans",
      explanation:
        "Warm current conditions and a low-rain forecast may be worth considering alongside crop stage, soil, and local advice.",
      supportingWeather: `${weather.current.temperatureC} °C now; ${weeklyRain.toFixed(1)} mm forecast rain`,
      precautions: [
        "Check field conditions before deciding when to irrigate.",
        "Use local crop and soil guidance; no irrigation amount is calculated here.",
      ],
      ruleId: "current.temperature_c >= 30 && rainfall.forecast_total_mm < 5",
    });
  }

  return advisories;
}
