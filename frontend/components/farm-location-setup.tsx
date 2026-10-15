"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createRequestSequence,
  emptyLocationSelection,
  filterDistrictsForState,
  LOCATION_STORAGE_KEY as LGD_LOCATION_STORAGE_KEY,
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
  type LocationSelection,
  type State,
  type Subdistrict,
} from "@/lib/lgd/types";
import {
  LOCATION_STORAGE_KEY,
  LOCATION_UPDATED_EVENT,
  deserializeLocation,
  serializeLocation,
} from "@/lib/location/storage";
import {
  buildGeocodingQuery,
  isValidCoordinates,
  matchGeocodingAdministrativeArea,
  parseGeocodingRouteResponse,
} from "@/lib/location/validation";
import type { FarmLocation, GeocodingResult } from "@/lib/location/types";

type LoadState = "idle" | "loading";
type CoordinatesSource = FarmLocation["source"];

export default function FarmLocationSetup() {
  const router = useRouter();
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsStateCode, setDistrictsStateCode] = useState("");
  const [subdistricts, setSubdistricts] = useState<Subdistrict[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selection, setSelection] =
    useState<LocationSelectionState>(emptyLocationSelection);
  const [statesLoad, setStatesLoad] = useState<LoadState>("loading");
  const [districtsLoad, setDistrictsLoad] = useState<LoadState>("idle");
  const [subdistrictsLoad, setSubdistrictsLoad] = useState<LoadState>("idle");
  const [blocksLoad, setBlocksLoad] = useState<LoadState>("idle");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<GeocodingResult[]>([]);
  const [selectedResult, setSelectedResult] =
    useState<GeocodingResult | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [coordinatesSource, setCoordinatesSource] =
    useState<CoordinatesSource>("manual");
  const [coordinatesConfirmed, setCoordinatesConfirmed] = useState(false);
  const [locationSearchLoad, setLocationSearchLoad] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [locationSearchError, setLocationSearchError] = useState("");
  const districtRequestId = useRef(createRequestSequence());
  const detailRequestId = useRef(createRequestSequence());
  const searchRequestId = useRef(0);

  const selectedState = states.find((state) => state.code === selection.state);
  const visibleDistricts = useMemo(
    () => (districtsStateCode === selection.state ? districts : []),
    [districts, districtsStateCode, selection.state],
  );
  const selectedDistrict = visibleDistricts.find(
    (district) => district.code === selection.district,
  );
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const coordinatesValid =
    latitude.trim().length > 0 &&
    longitude.trim().length > 0 &&
    isValidCoordinates(numericLatitude, numericLongitude);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let restoreDistrictRequestId: number | undefined;
    let restoreDetailRequestId: number | undefined;

    async function restoreLocation() {
      let savedWeatherLocation: FarmLocation | null = null;
      let savedArea: LocationSelection | null = null;
      try {
        savedWeatherLocation = deserializeLocation(
          localStorage.getItem(LOCATION_STORAGE_KEY),
        );
        const legacyValue = localStorage.getItem(LGD_LOCATION_STORAGE_KEY);
        savedArea =
          savedWeatherLocation?.administrativeArea ??
          parseSavedLocation(JSON.parse(legacyValue ?? "null") as unknown);
      } catch {
        if (active) {
          setError("A saved location could not be read. Choose your farm area again.");
        }
      }

      if (savedWeatherLocation) {
        setLatitude(String(savedWeatherLocation.latitude));
        setLongitude(String(savedWeatherLocation.longitude));
        setCoordinatesSource(savedWeatherLocation.source);
        setCoordinatesConfirmed(false);
        setSelectedResult({
          name: savedWeatherLocation.name,
          latitude: savedWeatherLocation.latitude,
          longitude: savedWeatherLocation.longitude,
          ...(savedWeatherLocation.state
            ? { state: savedWeatherLocation.state }
            : {}),
          ...(savedWeatherLocation.district
            ? { district: savedWeatherLocation.district }
            : {}),
        });
        setLocationQuery(savedWeatherLocation.name);
      }

      try {
        const stateOptions = await fetchLocationOptions(
          "/api/locations/states",
          isState,
          controller.signal,
        );
        if (!active) return;
        setStates(stateOptions);
        setStatesLoad("idle");

        if (!savedArea) return;
        const matchingState = stateOptions.find(
          (state) => state.code === savedArea.state.code,
        );
        if (!matchingState) return;
        restoreDistrictRequestId = districtRequestId.current.next();
        setSelection({
          state: matchingState.code,
          district: "",
          subdistrict: "",
          block: "",
        });
        setDistricts([]);
        setDistrictsStateCode("");
        setSubdistricts([]);
        setBlocks([]);

        setDistrictsLoad("loading");
        const districtOptions = await fetchLocationOptions(
          `/api/locations/districts?state=${encodeURIComponent(matchingState.code)}`,
          isDistrict,
          controller.signal,
        );
        if (
          !active ||
          !districtRequestId.current.isCurrent(restoreDistrictRequestId)
        ) {
          return;
        }
        const stateDistricts = filterDistrictsForState(
          districtOptions,
          matchingState.code,
        );
        setDistricts(stateDistricts);
        setDistrictsStateCode(matchingState.code);
        const matchingDistrict = stateDistricts.find(
          (district) => district.code === savedArea.district.code,
        );
        if (!matchingDistrict) return;

        const restoredSelection: LocationSelectionState = {
          state: matchingState.code,
          district: matchingDistrict.code,
          subdistrict: "",
          block: "",
        };
        setSelection(restoredSelection);
        setLocationQuery(
          buildGeocodingQuery(matchingDistrict.name, matchingState.name),
        );

        restoreDetailRequestId = detailRequestId.current.next();
        setSubdistrictsLoad("loading");
        setBlocksLoad("loading");
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
        if (
          !active ||
          !districtRequestId.current.isCurrent(restoreDistrictRequestId) ||
          !detailRequestId.current.isCurrent(restoreDetailRequestId)
        ) {
          return;
        }

        if (subdistrictResult.status === "fulfilled") {
          const restoredSubdistricts = subdistrictResult.value.filter(
            (item) =>
              item.state_code === matchingState.code &&
              item.district_code === matchingDistrict.code,
          );
          setSubdistricts(restoredSubdistricts);
          restoredSelection.subdistrict =
            restoredSubdistricts.find(
              (item) => item.code === savedArea?.subdistrict?.code,
            )?.code ?? "";
        } else {
          setError(getErrorMessage(subdistrictResult.reason));
        }
        if (blockResult.status === "fulfilled") {
          const restoredBlocks = blockResult.value.filter(
            (item) =>
              item.state_code === matchingState.code &&
              item.district_code === matchingDistrict.code,
          );
          setBlocks(restoredBlocks);
          restoredSelection.block =
            restoredBlocks.find(
              (item) => item.code === savedArea?.block?.code,
            )?.code ?? "";
        } else {
          setError((current) =>
            current
              ? `${current} Development blocks could not be loaded.`
              : getErrorMessage(blockResult.reason),
          );
        }
        setSelection({ ...restoredSelection });

        if (
          savedWeatherLocation?.coordinatesConfirmed &&
          sameAdministrativeArea(savedWeatherLocation.administrativeArea, savedArea)
        ) {
          setCoordinatesConfirmed(true);
        }
      } catch (loadError) {
        if (active && !controller.signal.aborted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setStatesLoad("idle");
          if (
            restoreDistrictRequestId === undefined ||
            districtRequestId.current.isCurrent(restoreDistrictRequestId)
          ) {
            setDistrictsLoad("idle");
          }
          if (
            restoreDetailRequestId === undefined ||
            detailRequestId.current.isCurrent(restoreDetailRequestId)
          ) {
            setSubdistrictsLoad("idle");
            setBlocksLoad("idle");
          }
        }
      }
    }

    void restoreLocation();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const resetCoordinates = useCallback(() => {
    searchRequestId.current += 1;
    setLocationResults([]);
    setSelectedResult(null);
    setLatitude("");
    setLongitude("");
    setCoordinatesSource("manual");
    setCoordinatesConfirmed(false);
    setLocationSearchLoad("idle");
    setLocationSearchError("");
  }, []);

  const handleStateChange = useCallback(
    async (stateCode: string) => {
      const requestId = districtRequestId.current.next();
      detailRequestId.current.next();
      setError("");
      setDistricts([]);
      setDistrictsStateCode("");
      setSubdistricts([]);
      setBlocks([]);
      setSubdistrictsLoad("idle");
      setBlocksLoad("idle");
      setSelection(resetAfterStateChange(stateCode));
      setLocationQuery("");
      resetCoordinates();
      if (!stateCode) {
        setDistrictsLoad("idle");
        return;
      }

      setDistrictsLoad("loading");
      try {
        const options = await fetchLocationOptions(
          `/api/locations/districts?state=${encodeURIComponent(stateCode)}`,
          isDistrict,
        );
        if (districtRequestId.current.isCurrent(requestId)) {
          setDistricts(filterDistrictsForState(options, stateCode));
          setDistrictsStateCode(stateCode);
        }
      } catch (loadError) {
        if (districtRequestId.current.isCurrent(requestId)) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (districtRequestId.current.isCurrent(requestId)) {
          setDistrictsLoad("idle");
        }
      }
    },
    [resetCoordinates],
  );

  const handleDistrictChange = useCallback(
    async (districtCode: string) => {
      const requestId = detailRequestId.current.next();
      const district = visibleDistricts.find((item) => item.code === districtCode);
      setError("");
      setSubdistricts([]);
      setBlocks([]);
      setSubdistrictsLoad("idle");
      setBlocksLoad("idle");
      setSelection((current) => resetAfterDistrictChange(current, districtCode));
      setLocationQuery(
        district && selectedState
          ? buildGeocodingQuery(district.name, selectedState.name)
          : "",
      );
      resetCoordinates();
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
      if (!detailRequestId.current.isCurrent(requestId)) return;

      if (subdistrictResult.status === "fulfilled") {
        setSubdistricts(
          subdistrictResult.value.filter(
            (item) =>
              item.state_code === selection.state &&
              item.district_code === districtCode,
          ),
        );
      } else {
        setError(getErrorMessage(subdistrictResult.reason));
      }
      if (blockResult.status === "fulfilled") {
        setBlocks(
          blockResult.value.filter(
            (item) =>
              item.state_code === selection.state &&
              item.district_code === districtCode,
          ),
        );
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
    [visibleDistricts, resetCoordinates, selectedState, selection.state],
  );

  async function searchCoordinates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestId = ++searchRequestId.current;
    const query = locationQuery.trim();
    setLocationSearchError("");
    setLocationResults([]);
    setSelectedResult(null);
    setLatitude("");
    setLongitude("");
    setCoordinatesSource("manual");
    setCoordinatesConfirmed(false);
    if (!selectedState || !selectedDistrict) {
      setLocationSearchError("Choose a state and district before finding coordinates.");
      return;
    }
    if (query.length < 2 || query.length > 160) {
      setLocationSearchError("Enter a place name between 2 and 160 characters.");
      return;
    }

    setLocationSearchLoad("loading");
    try {
      const response = await fetch(
        `/api/location-search?q=${encodeURIComponent(query)}`,
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : "Location search is unavailable. Please try again.";
        throw new Error(message);
      }
      const results = parseGeocodingRouteResponse(payload);
      if (requestId === searchRequestId.current) {
        setLocationResults(results);
      }
    } catch (searchError) {
      if (requestId === searchRequestId.current) {
        setLocationSearchError(getErrorMessage(searchError));
      }
    } finally {
      if (requestId === searchRequestId.current) {
        setLocationSearchLoad("idle");
      }
    }
  }

  function selectGeocodingResult(result: GeocodingResult) {
    const stateName = selectedState?.name ?? "";
    const districtName = selectedDistrict?.name ?? "";
    if (
      matchGeocodingAdministrativeArea(result, {
        state: stateName,
        district: districtName,
      }) === "mismatch" ||
      (result.country && normalizeName(result.country) !== "india")
    ) {
      return;
    }
    setSelectedResult(result);
    setLatitude(String(result.latitude));
    setLongitude(String(result.longitude));
    setCoordinatesSource("open-meteo");
    setCoordinatesConfirmed(false);
  }

  function saveAndContinue() {
    setError("");
    if (!selectedState || !selectedDistrict) {
      setError("Choose a state and district before continuing.");
      return;
    }
    if (!coordinatesValid) {
      setError("Enter valid latitude and longitude coordinates.");
      return;
    }
    if (!coordinatesConfirmed) {
      setError("Confirm that the coordinates identify your selected area.");
      return;
    }

    const administrativeArea = saveSelection(
      selection,
      selectedState.name,
      selectedDistrict.name,
      subdistricts.find((item) => item.code === selection.subdistrict)?.name ?? "",
      blocks.find((item) => item.code === selection.block)?.name ?? "",
    );
    if (!administrativeArea) {
      setError("The selected state and district could not be saved.");
      return;
    }

    const location: FarmLocation = {
      name: selectedResult?.name ?? selectedDistrict.name,
      latitude: numericLatitude,
      longitude: numericLongitude,
      state: selectedState.name,
      district: selectedDistrict.name,
      administrativeArea,
      source: coordinatesSource,
      coordinatesConfirmed: true,
    };
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, serializeLocation(location));
      window.dispatchEvent(new Event(LOCATION_UPDATED_EVENT));
      router.push("/farm");
    } catch {
      setError("The confirmed location could not be saved in this browser.");
    }
  }

  const canContinue = Boolean(
    selectedState &&
      selectedDistrict &&
      coordinatesValid &&
      coordinatesConfirmed,
  );

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
            Choose and confirm your location
          </h1>
          <p className="mt-3 leading-7 text-stone-600">
            Select your official administrative area, then review approximate
            coordinates for the local forecast. LGD codes are identifiers, not GPS coordinates.
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
              options={visibleDistricts}
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

          <p className="mt-4 text-sm text-stone-500">
            State and district are required. Sub-district and development block
            are separate optional administrative selections.
          </p>

          <section
            aria-labelledby="coordinate-heading"
            className="mt-8 border-t border-stone-200 pt-7"
          >
            <h2 className="text-xl font-bold text-emerald-950" id="coordinate-heading">
              Find forecast coordinates
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Search is prefilled with your selected district and state. Results
              are approximate; conflicting administrative matches cannot be selected.
            </p>
            <form className="mt-4" onSubmit={(event) => void searchCoordinates(event)}>
              <label className="text-sm font-semibold" htmlFor="coordinate-search">
                Place name in the selected district
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  autoComplete="off"
                  className="min-h-12 min-w-0 flex-1 rounded-xl border border-stone-300 px-4 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
                  disabled={!selectedDistrict}
                  id="coordinate-search"
                  maxLength={100}
                  onChange={(event) => {
                    setLocationQuery(event.currentTarget.value);
                    resetCoordinates();
                  }}
                  value={locationQuery}
                />
                <button
                  className="min-h-12 rounded-xl bg-emerald-800 px-6 font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-400"
                  disabled={!selectedDistrict || locationSearchLoad === "loading"}
                  type="submit"
                >
                  {locationSearchLoad === "loading" ? "Searching…" : "Find coordinates"}
                </button>
              </div>
            </form>
            {locationSearchError && (
              <p className="mt-3 text-sm text-rose-800" role="alert">
                {locationSearchError}
              </p>
            )}
            {locationResults.length > 0 && (
              <ul
                aria-label="Approximate coordinate candidates"
                className="mt-4 divide-y divide-stone-200 rounded-2xl border border-stone-200"
              >
                {locationResults.map((result, index) => {
                  const areaMatch = candidateAreaMatch(
                    result,
                    selectedState?.name ?? "",
                    selectedDistrict?.name ?? "",
                  );
                  return (
                    <li
                      className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                      key={`${result.name}-${result.latitude}-${index}`}
                    >
                      <div>
                        <p className="font-semibold text-emerald-950">{result.name}</p>
                        <p className="mt-1 text-sm text-stone-600">
                          {[result.district, result.state, result.country]
                            .filter(Boolean)
                            .join(", ") || "Administrative details unavailable"}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {result.latitude}, {result.longitude} · approximate
                          coordinates
                        </p>
                        <p className="mt-1 text-xs font-medium text-amber-800">
                          {areaMatch === "match"
                            ? "State and district match your selection"
                            : areaMatch === "ambiguous"
                              ? "Area details are incomplete; confirm the match before continuing"
                              : "Area conflicts with your selection; not selectable"}
                        </p>
                      </div>
                      <button
                        className="min-h-11 rounded-lg border border-emerald-800 px-4 font-semibold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
                        disabled={areaMatch === "mismatch"}
                        onClick={() => selectGeocodingResult(result)}
                        type="button"
                      >
                        Use this result
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {locationResults.length === 0 &&
              locationSearchLoad === "idle" &&
              !locationSearchError &&
              selectedDistrict && (
                <p className="mt-3 text-sm text-stone-500">
                  If the geocoder has no matching place, enter coordinates
                  manually below.
                </p>
              )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <CoordinateInput
                id="latitude"
                label="Latitude"
                min="-90"
                max="90"
                value={latitude}
                onChange={(value) => {
                  setLatitude(value);
                  setCoordinatesSource("manual");
                  setCoordinatesConfirmed(false);
                }}
              />
              <CoordinateInput
                id="longitude"
                label="Longitude"
                min="-180"
                max="180"
                value={longitude}
                onChange={(value) => {
                  setLongitude(value);
                  setCoordinatesSource("manual");
                  setCoordinatesConfirmed(false);
                }}
              />
              <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-stone-700 sm:col-span-2">
                <input
                  checked={coordinatesConfirmed}
                  className="mt-1 h-4 w-4 accent-emerald-800"
                  disabled={!coordinatesValid || !selectedDistrict}
                  onChange={(event) =>
                    setCoordinatesConfirmed(event.currentTarget.checked)
                  }
                  type="checkbox"
                />
                I confirm these coordinates represent my selected district and
                farm area.
              </label>
              {selectedResult && coordinatesSource === "manual" && (
                <p className="text-sm text-emerald-800 sm:col-span-2" role="status">
                  Coordinates edited manually. Review both values before confirming.
                </p>
              )}
            </div>
          </section>

          {error && (
            <div
              className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              role="alert"
            >
              <p>{error}</p>
              <button
                className="mt-2 min-h-11 font-semibold underline underline-offset-2"
                onClick={() => window.location.reload()}
                type="button"
              >
                Retry location data
              </button>
            </div>
          )}
          <button
            className="mt-8 min-h-12 w-full rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto sm:min-w-52"
            disabled={!canContinue}
            onClick={saveAndContinue}
            type="button"
          >
            Confirm location & continue
          </button>
          <p className="mt-5 text-xs leading-5 text-stone-500">
            Location selections and confirmed coordinates are saved in this
            browser. Only your place-name query and confirmed coordinates are
            sent to Open-Meteo; official LGD codes are never treated as
            coordinates.
          </p>
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

function CoordinateInput({
  id,
  label,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  label: string;
  min: string;
  max: string;
  value: string;
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
        required
        step="any"
        type="number"
        value={value}
      />
    </div>
  );
}

function sameAdministrativeArea(
  first: FarmLocation["administrativeArea"],
  second: NonNullable<FarmLocation["administrativeArea"]>,
): boolean {
  return (
    first?.state.code === second.state.code &&
    first.district.code === second.district.code
  );
}

function candidateAreaMatch(
  result: GeocodingResult,
  state: string,
  district: string,
) {
  if (result.country && normalizeName(result.country) !== "india") {
    return "mismatch";
  }
  return matchGeocodingAdministrativeArea(result, { state, district });
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Location data is temporarily unavailable. Please retry.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
