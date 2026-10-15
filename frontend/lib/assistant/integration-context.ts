import type { FarmProfile } from "../farm/types.ts";
import type { FarmLocation } from "../location/types.ts";
import type { WeatherData } from "../weather/types.ts";
import type { ChatRequest } from "./types.ts";

export type AssistantRequestContext = Pick<
  ChatRequest,
  "farmContext" | "locationContext" | "weatherContext"
>;

export function createAssistantRequestContext(
  location: FarmLocation | null,
  profile: FarmProfile | null,
  weather: WeatherData | null,
): AssistantRequestContext {
  const context: AssistantRequestContext = {};

  if (location) {
    context.locationContext = {
      displayName: location.name,
      ...(location.administrativeArea
        ? {
            state: location.administrativeArea.state.name,
            district: location.administrativeArea.district.name,
          }
        : {
            ...(location.state ? { state: location.state } : {}),
            ...(location.district ? { district: location.district } : {}),
          }),
    };
  }

  if (profile) {
    const farmContext: NonNullable<ChatRequest["farmContext"]> = {
      location: location?.name,
    };
    if (profile.crop) farmContext.crop = profile.crop;
    if (profile.soilType) farmContext.soilType = profile.soilType;
    if (profile.irrigationType) {
      farmContext.irrigationMethod = profile.irrigationType;
    }
    if (profile.growthStage) farmContext.growthStage = profile.growthStage;
    if (profile.farmSize !== null) farmContext.farmSize = profile.farmSize;
    context.farmContext = farmContext;
  }

  if (weather) {
    const weatherContext: NonNullable<ChatRequest["weatherContext"]> = {
      timezone: weather.location.timezone,
      source: weather.source.name,
    };
    if (weather.current.temperatureC !== null) {
      weatherContext.currentTemperatureC = weather.current.temperatureC;
    }
    if (weather.current.humidityPercent !== null) {
      weatherContext.currentHumidityPercent = weather.current.humidityPercent;
    }
    if (weather.current.windSpeedKmh !== null) {
      weatherContext.currentWindSpeedKmh = weather.current.windSpeedKmh;
    }
    weatherContext.dailyForecasts = weather.daily.map((day) => ({
      date: day.date,
      ...(day.maxTemperatureC !== null
        ? { maxTemperatureC: day.maxTemperatureC }
        : {}),
      ...(day.minTemperatureC !== null
        ? { minTemperatureC: day.minTemperatureC }
        : {}),
      ...(day.precipitationMm !== null
        ? { precipitationMm: day.precipitationMm }
        : {}),
      ...(day.precipitationProbabilityPercent !== null
        ? {
            precipitationProbabilityPercent:
              day.precipitationProbabilityPercent,
          }
        : {}),
      ...(day.maxWindSpeedKmh !== null
        ? { maxWindSpeedKmh: day.maxWindSpeedKmh }
        : {}),
    }));
    context.weatherContext = weatherContext;
  }

  return context;
}
