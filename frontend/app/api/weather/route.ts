import { createWeatherRouteHandler } from "@/lib/weather/route-handler";
import { weatherService } from "@/lib/weather/service";

export const GET = createWeatherRouteHandler((latitude, longitude) =>
  weatherService.forecast(latitude, longitude),
);
