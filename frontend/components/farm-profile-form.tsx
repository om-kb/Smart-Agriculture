"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  FARM_PROFILE_STORAGE_KEY,
  FARM_PROFILE_UPDATED_EVENT,
  deserializeFarmProfile,
  normalizeFarmProfile,
  serializeFarmProfile,
} from "@/lib/farm/storage";
import type { FarmProfile } from "@/lib/farm/types";
import {
  cropOptions,
  emptyFarmProfile,
  growthStageOptions,
  irrigationOptions,
  soilOptions,
} from "@/lib/farm/types";
import {
  LOCATION_STORAGE_KEY,
  LOCATION_UPDATED_EVENT,
  deserializeLocation,
} from "@/lib/location/storage";

export default function FarmProfileForm() {
  const router = useRouter();
  const storedProfile = useSyncExternalStore(
    (callback) =>
      subscribeToKey(callback, FARM_PROFILE_STORAGE_KEY, FARM_PROFILE_UPDATED_EVENT),
    () => getStoredValue(FARM_PROFILE_STORAGE_KEY),
    () => null,
  );
  const storedLocation = useSyncExternalStore(
    (callback) =>
      subscribeToKey(callback, LOCATION_STORAGE_KEY, LOCATION_UPDATED_EVENT),
    () => getStoredValue(LOCATION_STORAGE_KEY),
    () => null,
  );
  const savedProfile = deserializeFarmProfile(storedProfile);
  const [draft, setDraft] = useState<FarmProfile | null>(null);
  const profile = draft ?? savedProfile ?? emptyFarmProfile;
  const [farmSizeInput, setFarmSizeInput] = useState<string | null>(null);
  const farmSizeInputValue =
    farmSizeInput ??
    (profile.farmSize === null ? "" : String(profile.farmSize));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function update<K extends keyof FarmProfile>(key: K, value: FarmProfile[K]) {
    setDraft((current) => ({ ...(current ?? profile), [key]: value }));
    setSaved(false);
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalized = normalizeFarmProfile(profile, farmSizeInputValue);
    if (
      farmSizeInputValue &&
      (!Number.isFinite(normalized.farmSize) ||
        normalized.farmSize === null ||
        normalized.farmSize <= 0 ||
        normalized.farmSize > 1_000_000)
    ) {
      setError("Farm size must be greater than 0 and no more than 1,000,000.");
      return;
    }
    try {
      localStorage.setItem(
        FARM_PROFILE_STORAGE_KEY,
        serializeFarmProfile(normalized),
      );
      window.dispatchEvent(new Event(FARM_PROFILE_UPDATED_EVENT));
      setDraft(normalized);
      setSaved(true);
      router.push("/dashboard");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The farm profile could not be saved in this browser.",
      );
    }
  }

  function resetProfile() {
    try {
      localStorage.removeItem(FARM_PROFILE_STORAGE_KEY);
      window.dispatchEvent(new Event(FARM_PROFILE_UPDATED_EVENT));
      setDraft(emptyFarmProfile);
      setFarmSizeInput(null);
      setSaved(false);
      setError("");
    } catch {
      setError("The saved profile could not be cleared from this browser.");
    }
  }

  const hasLocation = Boolean(deserializeLocation(storedLocation));

  return (
    <main className="min-h-screen bg-[#f7f8ef] px-4 py-8 text-stone-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/setup"
        >
          ← Change location
        </Link>
        <section className="mt-5 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Step 2 · About your farm
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Farm profile
          </h1>
          <p className="mt-3 leading-7 text-stone-600">
            Add any details you’d like. Your profile stays in this browser and
            is not sent to weather or geocoding services.
          </p>
          <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={save}>
            <TextField
              id="farm-name"
              label="Farm name"
              onChange={(value) => update("farmName", value)}
              placeholder="Optional"
              value={profile.farmName}
            />
            <div>
              <label className="text-sm font-semibold" htmlFor="farm-size">
                Farm size
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  className="min-h-12 min-w-0 flex-1 rounded-xl border border-stone-300 px-4 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  id="farm-size"
                  max="1000000"
                  min="0"
                  onChange={(event) => {
                    setFarmSizeInput(event.currentTarget.value);
                    setSaved(false);
                  }}
                  placeholder="Optional"
                  step="any"
                  type="number"
                  value={farmSizeInputValue}
                />
                <select
                  aria-label="Farm size unit"
                  className="min-h-12 rounded-xl border border-stone-300 bg-white px-3"
                  onChange={(event) =>
                    update(
                      "farmSizeUnit",
                      event.currentTarget.value as FarmProfile["farmSizeUnit"],
                    )
                  }

                  value={profile.farmSizeUnit}
                >
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                </select>
              </div>
            </div>
            <SelectField
              id="crop"
              label="Current crop"
              onChange={(value) => update("crop", value as FarmProfile["crop"])}
              options={cropOptions}
              value={profile.crop}
            />
            <SelectField
              id="soil"
              label="Soil type"
              onChange={(value) =>
                update("soilType", value as FarmProfile["soilType"])
              }
              options={soilOptions}
              value={profile.soilType}
            />
            <SelectField
              id="irrigation"
              label="Irrigation type"
              onChange={(value) =>
                update("irrigationType", value as FarmProfile["irrigationType"])
              }
              options={irrigationOptions}
              value={profile.irrigationType}
            />
            <SelectField
              id="growth-stage"
              label="Crop growth stage"
              onChange={(value) =>
                update("growthStage", value as FarmProfile["growthStage"])
              }
              options={growthStageOptions}
              value={profile.growthStage}
            />
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold" htmlFor="sowing-date">
                Sowing date <span className="font-normal text-stone-500">· Optional</span>
              </label>
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 sm:max-w-sm"
                id="sowing-date"
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => update("sowingDate", event.currentTarget.value)}
                type="date"
                value={profile.sowingDate}
              />
            </div>
            {error && (
              <p className="text-sm text-rose-800 sm:col-span-2" role="alert">
                {error}
              </p>
            )}
            {saved && (
              <p className="text-sm text-emerald-800 sm:col-span-2" role="status">
                Farm profile saved.
              </p>
            )}
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
              <button
                className="min-h-12 rounded-xl bg-emerald-800 px-6 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                type="submit"
              >
                Save & view dashboard
              </button>
              <button
                className="min-h-12 rounded-xl border border-stone-300 px-6 font-semibold text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                onClick={resetProfile}
                type="button"
              >
                Reset profile
              </button>
              {hasLocation && (
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold text-emerald-900 hover:bg-emerald-50"
                  href="/dashboard"
                >
                  Skip for now
                </Link>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function TextField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
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
        maxLength={100}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <select
        className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        <option value="">Not set</option>
        {options
          .filter((option) => option !== "Not set")
          .map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
      </select>
    </div>
  );
}

function subscribeToKey(
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
