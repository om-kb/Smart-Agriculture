export interface WeatherPresentation {
  label: string;
  icon: string;
}

export function describeWeatherCode(
  code: number | null,
): WeatherPresentation {
  if (code === null) return { label: "Conditions unavailable", icon: "—" };
  if (code === 0) return { label: "Clear sky", icon: "☀" };
  if (code === 1) return { label: "Mainly clear", icon: "🌤" };
  if (code === 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁" };
  if ([45, 48].includes(code)) return { label: "Fog", icon: "🌫" };
  if ([51, 53, 55, 56, 57].includes(code))
    return { label: "Drizzle", icon: "🌦" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return { label: "Rain", icon: "🌧" };
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return { label: "Snow", icon: "❄" };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", icon: "⛈" };
  return { label: "Variable conditions", icon: "🌤" };
}

export function formatForecastDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(parsed);
}

export function formatValue(value: number | null, unit: string): string {
  return value === null ? "—" : `${Math.round(value)}${unit}`;
}
