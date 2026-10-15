export interface CurrentWeather {
  time: string | null;
  temperatureC: number | null;
  humidityPercent: number | null;
  feelsLikeC: number | null;
  precipitationMm: number | null;
  windSpeedKmh: number | null;
  windDirectionDegrees: number | null;
  weatherCode: number | null;
}

export interface DailyForecast {
  date: string;
  maxTemperatureC: number | null;
  minTemperatureC: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPercent: number | null;
  maxWindSpeedKmh: number | null;
  weatherCode: number | null;
}

export interface WeatherData {
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
    timezoneAbbreviation: string;
    elevationMeters: number | null;
  };
  current: CurrentWeather;
  daily: DailyForecast[];
  fetchedAt: string;
  source: {
    name: "Open-Meteo";
    url: "https://open-meteo.com/";
    license: "CC BY 4.0";
  };
}
