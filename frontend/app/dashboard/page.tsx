"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  LOCATION_STORAGE_KEY,
  parseSavedLocation,
} from "@/lib/location-selection";
import type { LocationSelection } from "@/lib/lgd/types";

export default function DashboardPage() {
  const savedLocation = useSyncExternalStore(
    subscribeToLocation,
    getSavedLocation,
    () => null,
  );
  const location = parseLocation(savedLocation);

  return (
    <main className="min-h-screen bg-[#f7f8ef] px-4 py-8 text-stone-900 sm:px-6 sm:py-14">
      <section className="mx-auto max-w-3xl rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
          Your dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Your location
        </h1>
        {location ? (
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <LocationDetail label="State / Union Territory" value={location.state.name} />
            <LocationDetail label="District" value={location.district.name} />
            {location.subdistrict && (
              <LocationDetail label="Sub-district" value={location.subdistrict.name} />
            )}
            {location.block && (
              <LocationDetail label="Development block" value={location.block.name} />
            )}
          </dl>
        ) : (
          <p className="mt-5 leading-7 text-stone-600">
            No saved location was found. Choose a location to continue.
          </p>
        )}
        <Link
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          href="/setup"
        >
          {location ? "Change location" : "Choose location"}
        </Link>
      </section>
    </main>
  );
}

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getSavedLocation(): string | null {
  try {
    return window.localStorage.getItem(LOCATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseLocation(value: string | null): LocationSelection | null {
  try {
    return parseSavedLocation(JSON.parse(value ?? "null") as unknown);
  } catch {
    return null;
  }
}

function LocationDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f7f8ef] p-5">
      <dt className="text-sm font-medium text-stone-500">{label}</dt>
      <dd className="mt-2 text-lg font-semibold text-emerald-950">{value}</dd>
    </div>
  );
}
