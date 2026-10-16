"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  FARM_PROFILE_UPDATED_EVENT,
  FARM_PROFILE_STORAGE_KEY,
  deserializeFarmProfile,
} from "@/lib/farm/storage";
import type { FarmProfile } from "@/lib/farm/types";
import {
  LOCATION_UPDATED_EVENT,
  LOCATION_STORAGE_KEY,
  deserializeLocation,
} from "@/lib/location/storage";
import type { FarmLocation } from "@/lib/location/types";
import {
  generateAdvisories,
  type AgriculturalAdvisory,
} from "@/lib/advisory/engine";
import type { WeatherData } from "@/lib/weather/types";
import { isWeatherData } from "@/lib/weather/validation";
import {
  describeWeatherCode,
  formatForecastDate,
  formatValue,
} from "@/components/weather/presentation";

type LoadState = "loading" | "loaded" | "error";

export default function DashboardPage() {
  const storedLocation = useSyncExternalStore(
    (callback) => subscribeToStorage(callback, LOCATION_STORAGE_KEY, LOCATION_UPDATED_EVENT),
    () => getStoredValue(LOCATION_STORAGE_KEY),
    () => null,
  );
  const storedProfile = useSyncExternalStore(
    (callback) => subscribeToStorage(callback, FARM_PROFILE_STORAGE_KEY, FARM_PROFILE_UPDATED_EVENT),
    () => getStoredValue(FARM_PROFILE_STORAGE_KEY),
    () => null,
  );
  const location = useMemo(
    () => deserializeLocation(storedLocation),
    [storedLocation],
  );
  const profile = useMemo(
    () => deserializeFarmProfile(storedProfile),
    [storedProfile],
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [advisories, setAdvisories] = useState<AgriculturalAdvisory[]>([]);
  const [weatherLocation, setWeatherLocation] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [errorLocation, setErrorLocation] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadWeather = useCallback(async (selected: FarmLocation) => {
    const response = await fetch(
      `/api/weather?latitude=${encodeURIComponent(selected.latitude)}&longitude=${encodeURIComponent(selected.longitude)}`,
      { cache: "no-store" },
    );
    const payload: unknown = await response.json();
    if (!response.ok) {
      const message =
        isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : "Weather data is unavailable right now.";
      throw new Error(message);
    }
    if (!isRecord(payload) || !isWeatherData(payload.data)) {
      throw new Error("Weather response could not be read.");
    }
    return payload.data;
  }, []);

  useEffect(() => {
    if (!location?.coordinatesConfirmed) return;
    let active = true;
    void loadWeather(location)
      .then((data) => {
        if (!active) return;
        setWeather(data);
        setWeatherLocation(`${location.latitude},${location.longitude}`);
        setAdvisories(generateAdvisories(data));
        setLastUpdated(
          new Date().toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
          }),
        );
        setLoadState("loaded");
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Weather data is unavailable right now.",
        );
        setErrorLocation(`${location.latitude},${location.longitude}`);
        setLoadState("error");
      });
    return () => {
      active = false;
    };
  }, [loadWeather, location, refreshIndex]);

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const currentLocationKey = location
    ? `${location.latitude},${location.longitude}`
    : "";
  const weatherIsCurrent = Boolean(
    location?.coordinatesConfirmed &&
      weather &&
      weatherLocation === currentLocationKey,
  );
  const isLoading =
    Boolean(location?.coordinatesConfirmed) &&
    (loadState === "loading" ||
      (!weatherIsCurrent &&
        !(error && errorLocation === currentLocationKey)));
  const currentError =
    error && errorLocation === currentLocationKey ? error : "";

  return (
    <main className="min-h-screen bg-[#f7f8ef] text-stone-900">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {!location || !location.coordinatesConfirmed ? (
          <section className="rounded-3xl border border-emerald-100 bg-white p-8 sm:p-12">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              Welcome to your farm dashboard
            </p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              {location
                ? "Confirm your forecast location"
                : "Start with your location"}
            </h1>
            <p className="mt-3 max-w-xl leading-7 text-stone-600">
              {location
                ? "Your saved coordinates need confirmation before weather can be requested. Review the selected area and coordinates to continue."
                : "Choose your official area and confirm approximate or manually entered coordinates to see a local forecast. We never request your GPS location automatically."}
            </p>
            <Link
              className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900"
              href="/setup"
            >
              Set weather location
            </Link>
          </section>
        ) : (
          <>
            <section className="flex flex-col justify-between gap-5 rounded-3xl bg-emerald-950 p-6 text-white sm:p-8 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  {dateLabel}
                </p>
                <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                  {profile?.farmName
                    ? `Welcome, ${profile.farmName}`
                    : "Your farm weather"}
                </h1>
                <p className="mt-2 text-emerald-100">
                  {location.name} · {location.latitude}, {location.longitude}
                </p>
                <p className="mt-1 text-sm text-emerald-200">
                  {location.source === "manual"
                    ? "Manual coordinates, confirmed by you"
                    : "Approximate geocoded location, confirmed by you"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-11 items-center rounded-lg border border-emerald-600 px-4 font-semibold hover:bg-emerald-900"
                  href="/farm"
                >
                  {profile ? "Edit farm profile" : "Add farm profile"}
                </Link>
                <button
                  className="min-h-11 rounded-lg bg-white px-4 font-semibold text-emerald-950 hover:bg-emerald-50 disabled:opacity-60"
                  disabled={isLoading}
                  onClick={() => {
                    setError("");
                    setErrorLocation("");
                    setLoadState("loading");
                    setRefreshIndex((value) => value + 1);
                  }}
                  type="button"
                >
                  {isLoading ? "Refreshing…" : "Refresh weather"}
                </button>
              </div>
            </section>

            {isLoading && (
              <section
                aria-live="polite"
                className="rounded-2xl border border-emerald-100 bg-white p-8 text-center text-stone-600"
              >
                Loading weather for {location.name}…
              </section>
            )}
            {currentError && (
              <section
                className="rounded-2xl border border-rose-200 bg-rose-50 p-6"
                role="alert"
              >
                <h2 className="font-bold text-rose-950">
                  Weather could not be loaded
                </h2>
                <p className="mt-2 text-sm text-rose-900">{currentError}</p>
                <button
                  className="mt-3 min-h-11 rounded-lg bg-rose-900 px-4 font-semibold text-white"
                  onClick={() => {
                    setError("");
                    setErrorLocation("");
                    setLoadState("loading");
                    setRefreshIndex((value) => value + 1);
                  }}
                  type="button"
                >
                  Try again
                </button>
              </section>
            )}

            {location.administrativeArea && (
              <section
                aria-labelledby="administrative-location-heading"
                className="rounded-2xl border border-emerald-100 bg-white p-5 sm:p-6"
              >
                <h2
                  className="text-lg font-bold text-emerald-950"
                  id="administrative-location-heading"
                >
                  Official administrative area
                </h2>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <LocationDetail
                    label="State / Union Territory"
                    value={location.administrativeArea.state.name}
                    code={location.administrativeArea.state.code}
                  />
                  <LocationDetail
                    label="District"
                    value={location.administrativeArea.district.name}
                    code={location.administrativeArea.district.code}
                  />
                  {location.administrativeArea.subdistrict && (
                    <LocationDetail
                      label="Sub-district"
                      value={location.administrativeArea.subdistrict.name}
                      code={location.administrativeArea.subdistrict.code}
                    />
                  )}
                  {location.administrativeArea.block && (
                    <LocationDetail
                      label="Development block"
                      value={location.administrativeArea.block.name}
                      code={location.administrativeArea.block.code}
                    />
                  )}
                </dl>
                <p className="mt-3 text-xs text-stone-500">
                  Sub-district and development block are distinct LGD entities.
                  Their codes are administrative identifiers, not coordinates.
                </p>
              </section>
            )}

            {weatherIsCurrent && weather && (
              <>
                <section aria-labelledby="current-weather-heading">
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <h2
                      className="text-xl font-bold text-emerald-950"
                      id="current-weather-heading"
                    >
                      Current weather
                    </h2>
                    <p className="text-sm text-stone-500">
                      {weather.current.time
                        ? `Updated ${weather.current.time} ${weather.location.timezoneAbbreviation}`
                        : `Retrieved ${lastUpdated}`}{" "}
                      · Data:{" "}
                      <a
                        className="underline underline-offset-2"
                        href={weather.source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open-Meteo · CC BY 4.0
                      </a>
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <WeatherMetric
                      icon={describeWeatherCode(weather.current.weatherCode).icon}
                      label={describeWeatherCode(weather.current.weatherCode).label}
                      title="Conditions"
                      value={formatValue(weather.current.temperatureC, "°C")}
                    />
                    <WeatherMetric
                      icon="🌡"
                      label="Feels like"
                      title="Apparent temperature"
                      value={formatValue(weather.current.feelsLikeC, "°C")}
                    />
                    <WeatherMetric
                      icon="💧"
                      label="Relative humidity"
                      title="Humidity"
                      value={formatValue(weather.current.humidityPercent, "%")}
                    />
                    <WeatherMetric
                      icon="🌧"
                      label="Precipitation"
                      title="Current precipitation"
                      value={formatValue(weather.current.precipitationMm, " mm")}
                    />
                    <WeatherMetric
                      icon="💨"
                      label="Wind speed"
                      title="Current wind"
                      value={formatValue(weather.current.windSpeedKmh, " km/h")}
                    />
                  </div>
                </section>

                <section aria-labelledby="forecast-heading">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2
                      className="text-xl font-bold text-emerald-950"
                      id="forecast-heading"
                    >
                      7-day forecast
                    </h2>
                    <p className="text-sm text-stone-500">
                      Local time · {weather.location.timezone}
                    </p>
                  </div>
                  {weather.daily.length === 0 ? (
                    <p className="rounded-2xl bg-white p-6 text-stone-600">
                      Daily forecast is not available for this location.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                      {weather.daily.map((day) => {
                        const condition = describeWeatherCode(day.weatherCode);
                        return (
                          <article
                            className="rounded-2xl border border-stone-200 bg-white p-4"
                            key={day.date}
                          >
                            <p className="text-sm font-semibold text-stone-600">
                              {formatForecastDate(day.date)}
                            </p>
                            <p
                              aria-label={condition.label}
                              className="mt-4 text-3xl"
                              role="img"
                            >
                              {condition.icon}
                            </p>
                            <p className="mt-2 min-h-10 text-sm font-semibold text-emerald-950">
                              {condition.label}
                            </p>
                            <p className="mt-3 text-lg font-bold">
                              {formatValue(day.maxTemperatureC, "°")}
                              <span className="ml-2 text-sm font-medium text-stone-500">
                                {formatValue(day.minTemperatureC, "°")}
                              </span>
                            </p>
                            <dl className="mt-3 space-y-1 text-xs text-stone-600">
                              <div className="flex justify-between gap-1">
                                <dt>Rain chance</dt>
                                <dd>
                                  {formatValue(
                                    day.precipitationProbabilityPercent,
                                    "%",
                                  )}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-1">
                                <dt>Rain</dt>
                                <dd>{formatValue(day.precipitationMm, " mm")}</dd>
                              </div>
                              <div className="flex justify-between gap-1">
                                <dt>Wind</dt>
                                <dd>
                                  {formatValue(day.maxWindSpeedKmh, " km/h")}
                                </dd>
                              </div>
                            </dl>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
                  <section aria-labelledby="advisory-heading">
                    <h2
                      className="mb-3 text-xl font-bold text-emerald-950"
                      id="advisory-heading"
                    >
                      Weather-based field notes
                    </h2>
                    <p className="mb-3 text-sm text-stone-600">
                      General weather awareness, not crop-specific or expert advice.
                    </p>
                    {advisories.length === 0 ? (
                      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-stone-600">
                        No weather thresholds are currently triggered. Keep
                        checking local conditions and official advisories.
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {advisories.map((advisory) => (
                          <AdvisoryCard advisory={advisory} key={advisory.id} />
                        ))}
                      </ul>
                    )}
                    <p className="mt-3 text-xs leading-5 text-stone-500">
                      Rules: rainfall ≥50 mm/day, maximum temperature ≥38 °C,
                      maximum wind ≥40 km/h, forecast weekly rain &lt;5 mm,
                      irrigation awareness at ≥30 °C and low forecast rain.
                      These are general screening thresholds, not scientifically
                      validated crop-specific limits.
                    </p>
                  </section>

                  <section aria-labelledby="farm-overview-heading">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2
                        className="text-xl font-bold text-emerald-950"
                        id="farm-overview-heading"
                      >
                        Farm profile
                      </h2>
                      <Link
                        className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
                        href="/farm"
                      >
                        Edit profile
                      </Link>
                    </div>
                    <FarmOverview profile={profile} />
                  </section>
                </div>

                <section className="rounded-2xl border border-emerald-100 bg-white p-6 sm:p-8">
                  <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                    Ask a follow-up
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-emerald-950">
                    Farming assistant
                  </h2>
                  <p className="mt-2 max-w-2xl leading-7 text-stone-600">
                    Ask about the weather, your saved crop or soil, irrigation,
                    and supported farming topics. The assistant uses only
                    validated saved profile data and the current available
                    forecast context.
                  </p>
                  <Link
                    className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-2 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                    href="/assistant"
                  >
                    Open farming assistant
                  </Link>
                </section>
                <footer className="pb-5 text-xs leading-5 text-stone-500">
                  General weather awareness only. Forecasts can change and do
                  not measure field conditions, soil moisture, or crop health.
                  Consult local agricultural experts and official alerts for
                  decisions.
                </footer>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function LocationDetail({
  label,
  value,
  code,
}: {
  label: string;
  value: string;
  code: string;
}) {
  return (
    <div className="rounded-xl bg-[#f7f8ef] p-4">
      <dt className="text-xs font-medium text-stone-500">{label}</dt>
      <dd className="mt-1 font-semibold text-emerald-950">{value}</dd>
      <dd className="mt-1 text-xs text-stone-500">LGD code {code}</dd>
    </div>
  );
}

function WeatherMetric({
  icon,
  title,
  value,
  label,
}: {
  icon: string;
  title: string;
  value: string;
  label: string;
}) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5">
      <p className="text-sm font-medium text-stone-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-emerald-950">{value}</p>
      <p className="mt-2 text-sm text-stone-600">
        <span aria-hidden="true">{icon} </span>
        {label}
      </p>
    </article>
  );
}

function FarmOverview({ profile }: { profile: FarmProfile | null }) {
  if (!profile) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-stone-600">
          Add crop and farm details to keep your farm information together.
        </p>
        <Link
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-emerald-900 underline underline-offset-2"
          href="/farm"
        >
          Create farm profile
        </Link>
      </div>
    );
  }
  const items: [string, string][] = [
    ["Crop", profile.crop],
    [
      "Farm size",
      profile.farmSize === null
        ? ""
        : `${profile.farmSize} ${profile.farmSizeUnit}`,
    ],
    ["Soil", profile.soilType],
    ["Irrigation", profile.irrigationType],
    ["Growth stage", profile.growthStage],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  return items.length ? (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div
          className="rounded-2xl border border-stone-200 bg-white p-4"
          key={label}
        >
          <dt className="text-sm text-stone-500">{label}</dt>
          <dd className="mt-1 font-semibold text-emerald-950">{value}</dd>
        </div>
      ))}
    </dl>
  ) : (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 text-stone-600">
      Your profile is saved but no farm details have been added yet.
    </div>
  );
}

function AdvisoryCard({ advisory }: { advisory: AgriculturalAdvisory }) {
  const severity = {
    warning: "border-rose-200 bg-rose-50",
    caution: "border-amber-200 bg-amber-50",
    information: "border-emerald-100 bg-white",
  }[advisory.severity];
  return (
    <li className={`rounded-2xl border p-5 ${severity}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-stone-950">{advisory.title}</h3>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {advisory.severity}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        {advisory.explanation}
      </p>
      <p className="mt-2 text-sm font-semibold text-stone-800">
        {advisory.supportingWeather}
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-stone-700">
        {advisory.precautions.map((precaution) => (
          <li key={precaution}>{precaution}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-stone-500">
        General guidance · Rule {advisory.ruleId}
      </p>
    </li>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function subscribeToStorage(
  callback: () => void,
  key: string,
  customEvent: string,
) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(customEvent, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(customEvent, callback);
  };
}

function getStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
