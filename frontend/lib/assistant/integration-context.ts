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
      source: weather.source.name,
      fetchedAt: weather.fetchedAt,
    };
    if (weather.current.temperatureC !== null) {
      weatherContext.temperatureC = weather.current.temperatureC;
    }
    if (weather.current.humidityPercent !== null) {
      weatherContext.humidityPercent = weather.current.humidityPercent;
    }
    if (weather.current.windSpeedKmh !== null) {
      weatherContext.windSpeedKmh = weather.current.windSpeedKmh;
    }
    const currentDate = weather.current.time?.slice(0, 10);
    const nextForecast = currentDate
      ? weather.daily.find((day) => day.date > currentDate)
      : undefined;
    if (nextForecast) {
      weatherContext.forecastDate = nextForecast.date;
      if (nextForecast.precipitationMm !== null) {
        weatherContext.rainfallForecastMm = nextForecast.precipitationMm;
      }
    }
    context.weatherContext = weatherContext;
  }

  return context;
}
