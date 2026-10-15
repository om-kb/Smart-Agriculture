"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AssistantChat } from "@/components/assistant-chat";
import {
  FARM_PROFILE_STORAGE_KEY,
  FARM_PROFILE_UPDATED_EVENT,
  deserializeFarmProfile,
} from "@/lib/farm/storage";
import {
  LOCATION_STORAGE_KEY,
  LOCATION_UPDATED_EVENT,
  deserializeLocation,
} from "@/lib/location/storage";
import {
  assistantLocationKey,
  createAssistantRequestContext,
  createWeatherRequestSequence,
  isWeatherSnapshotForLocation,
} from "@/lib/assistant/integration-context";
import type { WeatherData } from "@/lib/weather/types";
import { isWeatherData } from "@/lib/weather/validation";

interface WeatherSnapshot {
  key: string;
  data: WeatherData;
}

export default function AssistantPage() {
  const storedLocation = useSyncExternalStore(
    (callback) =>
      subscribeToStorage(callback, LOCATION_STORAGE_KEY, LOCATION_UPDATED_EVENT),
    () => getStoredValue(LOCATION_STORAGE_KEY),
    () => null,
  );
  const storedProfile = useSyncExternalStore(
    (callback) =>
      subscribeToStorage(
        callback,
        FARM_PROFILE_STORAGE_KEY,
        FARM_PROFILE_UPDATED_EVENT,
      ),
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
  const locationKey = assistantLocationKey(location);
  const locationKeyRef = useRef(locationKey);
  const weatherRequests = useRef(createWeatherRequestSequence());
  const [weatherSnapshot, setWeatherSnapshot] =
    useState<WeatherSnapshot | null>(null);
  const [failedWeatherKey, setFailedWeatherKey] = useState("");

  useLayoutEffect(() => {
    locationKeyRef.current = locationKey;
  }, [locationKey]);

  useEffect(() => {
    const requests = weatherRequests.current;
    const requestId = requests.next();
    if (!location?.coordinatesConfirmed) return;
    const selectedLocation = location;
    const controller = new AbortController();
    const requestKey = locationKey;

    async function loadWeather() {
      try {
        const response = await fetch(
          `/api/weather?latitude=${encodeURIComponent(selectedLocation.latitude)}&longitude=${encodeURIComponent(selectedLocation.longitude)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (
          !response.ok ||
          !isRecord(payload) ||
          !isWeatherData(payload.data)
        ) {
          throw new Error("Weather context is unavailable.");
        }
        if (
          controller.signal.aborted ||
          !requests.isCurrent(requestId) ||
          locationKeyRef.current !== requestKey
        ) {
          return;
        }
        setWeatherSnapshot({ key: requestKey, data: payload.data });
        setFailedWeatherKey("");
      } catch {
        if (
          !controller.signal.aborted &&
          requests.isCurrent(requestId) &&
          locationKeyRef.current === requestKey
        ) {
          setFailedWeatherKey(requestKey);
        }
      }
    }

    void loadWeather();
    return () => {
      controller.abort();
      requests.next();
    };
  }, [location, locationKey]);

  const weather =
    isWeatherSnapshotForLocation(location, weatherSnapshot?.key)
      ? weatherSnapshot?.data ?? null
      : null;
  const context = useMemo(
    () =>
      createAssistantRequestContext(
        location,
        profile,
        weather,
        weatherSnapshot?.key,
      ),
    [location, profile, weather, weatherSnapshot?.key],
  );
  const contextNotice = !location
    ? "No confirmed location is saved. Choose your area to add weather context."
    : !location.coordinatesConfirmed
      ? "Your location is saved but not confirmed. Review it before weather data is requested."
      : weather
      ? `Using ${location.name}, your validated saved farm profile, and current Open-Meteo weather context.`
      : failedWeatherKey === locationKey
        ? `Using ${location.name} and your validated saved farm profile. Weather could not be loaded for this reply.`
        : `Using ${location.name} and your validated saved farm profile. Loading current weather context…`;

  return (
    <AssistantChat
      key={locationKey}
      context={context}
      contextNotice={contextNotice}
    />
  );
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
