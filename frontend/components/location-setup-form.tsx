"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyLocationSelection,
  LOCATION_STORAGE_KEY,
  parseSavedLocation,
  resetAfterDistrictChange,
  resetAfterStateChange,
  saveSelection,
  type LocationSelectionState,
} from "@/lib/location-selection";
import { fetchLocationOptions } from "@/lib/locations-api";
import {
  isBlock,
  isDistrict,
  isState,
  isSubdistrict,
  type Block,
  type District,
  type State,
  type Subdistrict,
} from "@/lib/lgd/types";

type LoadState = "idle" | "loading";

export default function LocationSetupForm() {
  const router = useRouter();
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [subdistricts, setSubdistricts] = useState<Subdistrict[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selection, setSelection] =
    useState<LocationSelectionState>(emptyLocationSelection);
  const [statesLoad, setStatesLoad] = useState<LoadState>("loading");
  const [districtsLoad, setDistrictsLoad] = useState<LoadState>("idle");
  const [subdistrictsLoad, setSubdistrictsLoad] = useState<LoadState>("idle");
  const [blocksLoad, setBlocksLoad] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [statesLoaded, setStatesLoaded] = useState(false);
  const districtRequestId = useRef(0);
  const detailRequestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadSavedLocation() {
      let saved = null;
      try {
        saved = parseSavedLocation(
          JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY) ?? "null") as unknown,
        );
      } catch {
        try {
          localStorage.removeItem(LOCATION_STORAGE_KEY);
        } catch {
          setError("Saved location could not be cleared from this browser.");
        }
      }

      try {
        setStatesLoad("loading");
        const stateOptions = await fetchLocationOptions(
          "/api/locations/states",
          isState,
          controller.signal,
        );
        if (!active) return;
        setStates(stateOptions);
        setStatesLoaded(true);

        const matchingState = stateOptions.find(
          (state) => state.code === saved?.state.code,
        );
        if (!matchingState || !saved) return;
        setSelection({
          state: matchingState.code,
          district: "",
          subdistrict: "",
          block: "",
        });

        setDistrictsLoad("loading");
        const districtOptions = await fetchLocationOptions(
          `/api/locations/districts?state=${encodeURIComponent(matchingState.code)}`,
          isDistrict,
          controller.signal,
        );
        if (!active) return;
        setDistricts(districtOptions);
        const matchingDistrict = districtOptions.find(
          (district) => district.code === saved.district.code,
        );
        if (!matchingDistrict) return;

        const nextSelection = {
          state: matchingState.code,
          district: matchingDistrict.code,
          subdistrict: "",
          block: "",
        };
        setSelection(nextSelection);

        const [subdistrictResult, blockResult] = await Promise.allSettled([
          fetchLocationOptions(
            `/api/locations/subdistricts?district=${encodeURIComponent(matchingDistrict.code)}`,
            isSubdistrict,
            controller.signal,
          ),
          fetchLocationOptions(
            `/api/locations/blocks?district=${encodeURIComponent(matchingDistrict.code)}`,
            isBlock,
            controller.signal,
          ),
        ]);
        if (!active) return;

        if (subdistrictResult.status === "fulfilled") {
          setSubdistricts(subdistrictResult.value);
          nextSelection.subdistrict =
            subdistrictResult.value.find(
              (item) => item.code === saved.subdistrict?.code,
            )?.code ?? "";
        } else {
          setError(subdistrictResult.reason.message);
        }
        if (blockResult.status === "fulfilled") {
          setBlocks(blockResult.value);
          nextSelection.block =
            blockResult.value.find((item) => item.code === saved.block?.code)
              ?.code ?? "";
        } else {
          setError(blockResult.reason.message);
        }
        setSelection({ ...nextSelection });
      } catch (loadError) {
        if (active && !controller.signal.aborted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setStatesLoad("idle");
          setDistrictsLoad("idle");
          setRestored(true);
        }
      }
    }

    void loadSavedLocation();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!restored || !statesLoaded) return;
    const saved = saveSelection(
      selection,
      states.find((state) => state.code === selection.state)?.name ?? "",
      districts.find((district) => district.code === selection.district)?.name ?? "",
      subdistricts.find((item) => item.code === selection.subdistrict)?.name ?? "",
      blocks.find((item) => item.code === selection.block)?.name ?? "",
    );
    try {
      if (saved) {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(saved));
      } else if (!selection.state) {
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    } catch (storageError) {
      console.error("Unable to save the selected location in localStorage.", storageError);
    }
  }, [blocks, districts, restored, selection, states, statesLoaded, subdistricts]);

  const handleStateChange = useCallback(
    async (stateCode: string) => {
      const requestId = ++districtRequestId.current;
      detailRequestId.current += 1;
      setError("");
      setDistricts([]);
      setSubdistricts([]);
      setBlocks([]);
      setSelection(resetAfterStateChange(stateCode));
      if (!stateCode) return;

      setDistrictsLoad("loading");
      try {
        const options = await fetchLocationOptions(
          `/api/locations/districts?state=${encodeURIComponent(stateCode)}`,
          isDistrict,
        );
        if (requestId === districtRequestId.current) setDistricts(options);
      } catch (loadError) {
        if (requestId === districtRequestId.current) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (requestId === districtRequestId.current) setDistrictsLoad("idle");
      }
    },
    [],
  );

  const handleDistrictChange = useCallback(
    async (districtCode: string) => {
      const requestId = ++detailRequestId.current;
      setError("");
      setSubdistricts([]);
      setBlocks([]);
      setSelection((current) => resetAfterDistrictChange(current, districtCode));
      if (!districtCode) return;

      setSubdistrictsLoad("loading");
      setBlocksLoad("loading");
      const [subdistrictResult, blockResult] = await Promise.allSettled([
        fetchLocationOptions(
          `/api/locations/subdistricts?district=${encodeURIComponent(districtCode)}`,
          isSubdistrict,
        ),
        fetchLocationOptions(
          `/api/locations/blocks?district=${encodeURIComponent(districtCode)}`,
          isBlock,
        ),
      ]);
      if (requestId !== detailRequestId.current) return;

      if (subdistrictResult.status === "fulfilled") {
        setSubdistricts(subdistrictResult.value);
      } else {
        setError(getErrorMessage(subdistrictResult.reason));
      }
      if (blockResult.status === "fulfilled") {
        setBlocks(blockResult.value);
      } else {
        setError((current) =>
          current
            ? `${current} Development blocks could not be loaded.`
            : getErrorMessage(blockResult.reason),
        );
      }
      setSubdistrictsLoad("idle");
      setBlocksLoad("idle");
    },
    [],
  );

  const canContinue = Boolean(selection.state && selection.district);

  return (
    <main className="min-h-screen bg-[#f7f8ef] px-4 py-8 text-stone-900 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/"
        >
          ← Smart Agriculture Advisor
        </Link>
        <section className="mt-5 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Let’s get started
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Choose your location
          </h1>
          <p className="mt-3 max-w-xl leading-7 text-stone-600">
            Select your area so we can make future agriculture tools relevant to
            your community.
          </p>

          <div className="mt-8 grid gap-5">
            <LocationSelect
              id="state"
              label="State / Union Territory"
              value={selection.state}
              options={states}
              loading={statesLoad === "loading"}
              placeholder="Choose your state or UT"
              onChange={(value) => void handleStateChange(value)}
              emptyMessage="State and union territory data is unavailable."
            />
            <LocationSelect
              id="district"
              label="District"
              value={selection.district}
              options={districts}
              loading={districtsLoad === "loading"}
              disabled={!selection.state || districtsLoad === "loading"}
              placeholder="Choose your district"
              onChange={(value) => void handleDistrictChange(value)}
              emptyMessage="No districts are listed for this location."
            />
            <LocationSelect
              id="subdistrict"
              label="Sub-district"
              hint="Optional"
              value={selection.subdistrict}
              options={subdistricts}
              loading={subdistrictsLoad === "loading"}
              disabled={!selection.district || subdistrictsLoad === "loading"}
              placeholder="Choose your sub-district"
              onChange={(value) =>
                setSelection((current) => ({ ...current, subdistrict: value }))
              }
              emptyMessage="No sub-districts are listed for this district."
            />
            <LocationSelect
              id="block"
              label="Development block"
              hint="Optional"
              value={selection.block}
              options={blocks}
              loading={blocksLoad === "loading"}
              disabled={!selection.district || blocksLoad === "loading"}
              placeholder="Choose your development block"
              onChange={(value) =>
                setSelection((current) => ({ ...current, block: value }))
              }
              emptyMessage="No development blocks are listed for this district."
            />
          </div>

          <p className="mt-5 text-sm text-stone-500">
            Your state and district are enough to continue. Sub-district and
            block details are optional.
          </p>
          {error && (
            <div
              className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              role="alert"
            >
              <p>{error}</p>
              <button
                className="mt-2 min-h-11 font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                onClick={() => window.location.reload()}
                type="button"
              >
                Retry
              </button>
            </div>
          )}
          <button
            className="mt-8 min-h-12 w-full rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto sm:min-w-48"
            disabled={!canContinue}
            onClick={() => router.push("/dashboard")}
            type="button"
          >
            Continue
          </button>
        </section>
      </div>
    </main>
  );
}

type LocationOption = Pick<State, "code" | "name">;

interface LocationSelectProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  options: LocationOption[];
  loading: boolean;
  disabled?: boolean;
  placeholder: string;
  emptyMessage?: string;
  onChange: (value: string) => void;
}

function LocationSelect({
  id,
  label,
  hint,
  value,
  options,
  loading,
  disabled = false,
  placeholder,
  emptyMessage,
  onChange,
}: LocationSelectProps) {
  return (
    <div>
      <label
        className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold"
        htmlFor={id}
      >
        <span>{label}</span>
        {hint && (
          <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
            {hint}
          </span>
        )}
      </label>
      <div className="relative">
        <select
          className="min-h-12 w-full appearance-none rounded-xl border border-stone-300 bg-white px-4 py-3 pr-11 text-base text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
          disabled={disabled || loading}
          id={id}
          onChange={(event) => onChange(event.currentTarget.value)}
          value={value}
        >
          <option value="">{loading ? "Loading…" : placeholder}</option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        {loading ? (
          <span
            aria-label={`Loading ${label.toLowerCase()}`}
            className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-emerald-700 border-r-transparent"
            role="status"
          />
        ) : (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-500"
          >
            ▾
          </span>
        )}
      </div>
      {!loading && !disabled && options.length === 0 && emptyMessage && (
        <p className="mt-2 text-sm text-stone-500">{emptyMessage}</p>
      )}
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Location data is temporarily unavailable. Please retry.";
}
