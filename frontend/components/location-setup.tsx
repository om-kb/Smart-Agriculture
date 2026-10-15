"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, useState } from "react";
import {
  LOCATION_STORAGE_KEY,
  LOCATION_UPDATED_EVENT,
  deserializeLocation,
  serializeLocation,
} from "@/lib/location/storage";
import { isValidCoordinates, parseGeocodingResults } from "@/lib/location/validation";
import type { FarmLocation, GeocodingResult } from "@/lib/location/types";

export default function LocationSetup() {
  const router = useRouter();
  const storedLocation = useSyncExternalStore(
    subscribeToLocation,
    getStoredLocation,
    () => null,
  );
  const selectedLocation = deserializeLocation(storedLocation);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [coordinatesConfirmed, setCoordinatesConfirmed] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function searchLocations(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchError("");
    setResults([]);
    setHasSearched(false);
    const search = query.trim();
    if (search.length < 2 || search.length > 100) {
      setSearchError("Enter at least 2 characters to search for a place.");
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `/api/location-search?q=${encodeURIComponent(search)}`,
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : "Location search is unavailable. Please try again.";
        throw new Error(message);
      }
      setResults(parseGeocodingResults(payload));
      setHasSearched(true);
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "Location search is unavailable. Please try again.",
      );
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }

  function saveLocation(location: FarmLocation) {
    setSaveError("");
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, serializeLocation(location));
      window.dispatchEvent(new Event(LOCATION_UPDATED_EVENT));
      router.push("/farm");
    } catch {
      setSaveError("This browser could not save your location. Check storage settings and retry.");
    }
  }

  function saveManualLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");
    const lat = Number(latitude);
    const lon = Number(longitude);
    const name = placeName.trim();
    if (!name) {
      setSaveError("Enter a name for this location.");
      return;
    }
    if (!latitude.trim() || !longitude.trim()) {
      setSaveError("Enter both latitude and longitude.");
      return;
    }
    if (!isValidCoordinates(lat, lon)) {
      setSaveError("Latitude must be between -90 and 90; longitude must be between -180 and 180.");
      return;
    }
    if (!coordinatesConfirmed) {
      setSaveError("Confirm that these coordinates identify your location before saving.");
      return;
    }
    saveLocation({
      name,
      latitude: lat,
      longitude: lon,
      source: "manual",
      coordinatesConfirmed: true,
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f8ef] px-4 py-8 text-stone-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/"
        >
          ← Smart Agriculture Advisor
        </Link>
        <section className="mt-5 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Step 1 · Your farm area
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Set your weather location
          </h1>
          <p className="mt-3 leading-7 text-stone-600">
            Search for a nearby place or enter coordinates you know. We do not
            request GPS access or guess your location.
          </p>

          {selectedLocation && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-900">
                Current weather location: {selectedLocation.name}
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                {selectedLocation.latitude}, {selectedLocation.longitude} ·{" "}
                {selectedLocation.coordinatesConfirmed ? "coordinates confirmed" : "approximate coordinates"}
              </p>
              <Link
                className="mt-3 inline-flex min-h-11 items-center font-semibold text-emerald-900 underline underline-offset-2"
                href="/dashboard"
              >
                Continue to dashboard
              </Link>
            </div>
          )}

          <form className="mt-8" onSubmit={searchLocations}>
            <label className="text-sm font-semibold" htmlFor="place-search">
              Search by town, city, or village
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                autoComplete="off"
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-stone-300 px-4 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                id="place-search"
                maxLength={100}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="For example, Nashik"
                value={query}
              />
              <button
                className="min-h-12 rounded-xl bg-emerald-800 px-6 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:bg-stone-400"
                disabled={searching}
                type="submit"
              >
                {searching ? "Searching…" : "Search places"}
              </button>
            </div>
          </form>
          {searchError && (
            <p className="mt-3 text-sm text-rose-800" role="alert">
              {searchError}
            </p>
          )}
          {results.length > 0 && (
            <ul aria-label="Location search results" className="mt-4 divide-y divide-stone-200 rounded-2xl border border-stone-200">
              {results.map((result, index) => (
                <li className="p-4" key={`${result.name}-${result.latitude}-${index}`}>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold">{result.name}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        {[result.district, result.state, result.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {result.latitude}, {result.longitude} · approximate geocoded coordinates
                      </p>
                    </div>
                    <button
                      className="min-h-11 rounded-lg border border-emerald-800 px-4 font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                      onClick={() =>
                        saveLocation({
                          name: [result.name, result.district, result.state]
                            .filter(Boolean)
                            .join(", "),
                          latitude: result.latitude,
                          longitude: result.longitude,
                          ...(result.state ? { state: result.state } : {}),
                          ...(result.district ? { district: result.district } : {}),
                          source: "open-meteo",
                          coordinatesConfirmed: false,
                        })
                      }
                      type="button"
                    >
                      Use approximate location
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {hasSearched && !searching && results.length === 0 && !searchError && (
            <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">
              No matching places found. Try a nearby town or enter coordinates
              manually.
            </p>
          )}

          <div className="my-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            or enter coordinates
            <span className="h-px flex-1 bg-stone-200" />
          </div>

          <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveManualLocation}>
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold" htmlFor="place-name">
                Location name
              </label>
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                id="place-name"
                onChange={(event) => setPlaceName(event.currentTarget.value)}
                placeholder="My farm or nearby village"
                value={placeName}
              />
            </div>
            <CoordinateInput
              id="latitude"
              label="Latitude"
              max="90"
              min="-90"
              onChange={setLatitude}
              placeholder="e.g. 19.9975"
              value={latitude}
            />
            <CoordinateInput
              id="longitude"
              label="Longitude"
              max="180"
              min="-180"
              onChange={setLongitude}
              placeholder="e.g. 73.7898"
              value={longitude}
            />
            <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-stone-700 sm:col-span-2">
              <input
                checked={coordinatesConfirmed}
                className="mt-1 h-4 w-4 accent-emerald-800"
                onChange={(event) =>
                  setCoordinatesConfirmed(event.currentTarget.checked)
                }
                type="checkbox"
              />
              I have checked that these coordinates identify my farm area.
            </label>
            {saveError && (
              <p className="text-sm text-rose-800 sm:col-span-2" role="alert">
                {saveError}
              </p>
            )}
            <button
              className="min-h-12 rounded-xl border border-emerald-800 px-6 font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 sm:col-span-2 sm:justify-self-start"
              type="submit"
            >
              Save coordinates & continue
            </button>
          </form>
          <p className="mt-6 text-xs leading-5 text-stone-500">
            Search results are approximate and come from Open-Meteo Geocoding.
            Verify coordinates against your farm before relying on the forecast.
          </p>
        </section>
      </div>
    </main>
  );
}

function CoordinateInput({
  id,
  label,
  min,
  max,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  min: string;
  max: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        id={id}
        max={max}
        min={min}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        required
        step="any"
        type="number"
        value={value}
      />
    </div>
  );
}

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCATION_UPDATED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCATION_UPDATED_EVENT, onChange);
  };
}

function getStoredLocation(): string | null {
  try {
    return window.localStorage.getItem(LOCATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
