import type { LocationSelection } from "./lgd/types.ts";

export const LOCATION_STORAGE_KEY = "smart-agriculture-location";

export interface LocationSelectionState {
  state: string;
  district: string;
  subdistrict: string;
  block: string;
}

export const emptyLocationSelection: LocationSelectionState = {
  state: "",
  district: "",
  subdistrict: "",
  block: "",
};

export function resetAfterStateChange(state: string): LocationSelectionState {
  return { ...emptyLocationSelection, state };
}

export function resetAfterDistrictChange(
  selection: LocationSelectionState,
  district: string,
): LocationSelectionState {
  return { ...selection, district, subdistrict: "", block: "" };
}

export function parseSavedLocation(value: unknown): LocationSelection | null {
  if (!isRecord(value) || !isSavedPlace(value.state) || !isSavedPlace(value.district)) {
    return null;
  }

  if (
    !isOptionalSavedPlace(value.subdistrict) ||
    !isOptionalSavedPlace(value.block)
  ) {
    return null;
  }

  return {
    state: value.state,
    district: value.district,
    ...(value.subdistrict ? { subdistrict: value.subdistrict } : {}),
    ...(value.block ? { block: value.block } : {}),
  };
}

export function saveSelection(
  selection: LocationSelectionState,
  stateName: string,
  districtName: string,
  subdistrictName: string,
  blockName: string,
): LocationSelection | null {
  if (!selection.state || !selection.district || !stateName || !districtName) {
    return null;
  }

  return {
    state: { code: selection.state, name: stateName },
    district: { code: selection.district, name: districtName },
    ...(selection.subdistrict && subdistrictName
      ? { subdistrict: { code: selection.subdistrict, name: subdistrictName } }
      : {}),
    ...(selection.block && blockName
      ? { block: { code: selection.block, name: blockName } }
      : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSavedPlace(value: unknown): value is { code: string; name: string } {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    /^\d+$/.test(value.code) &&
    typeof value.name === "string"
  );
}

function isOptionalSavedPlace(value: unknown): value is
  | { code: string; name: string }
  | undefined {
  return value === undefined || isSavedPlace(value);
}
