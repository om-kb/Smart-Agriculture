import {
  cropOptions,
  emptyFarmProfile,
  growthStageOptions,
  irrigationOptions,
  soilOptions,
  type FarmProfile,
} from "./types.ts";

export const FARM_PROFILE_STORAGE_KEY = "smart-agriculture-farm-profile";
export const FARM_PROFILE_UPDATED_EVENT = "smart-agriculture-profile-updated";

export function validateFarmProfile(value: unknown): value is FarmProfile {
  if (!isRecord(value)) return false;
  return (
    typeof value.farmName === "string" &&
    (value.farmSize === null ||
      (typeof value.farmSize === "number" &&
        Number.isFinite(value.farmSize) &&
        value.farmSize > 0 &&
        value.farmSize <= 1_000_000)) &&
    (value.farmSizeUnit === "acres" || value.farmSizeUnit === "hectares") &&
    isChoice(value.crop, cropOptions, true) &&
    isChoice(value.soilType, soilOptions, true) &&
    isChoice(value.irrigationType, irrigationOptions, true) &&
    isChoice(value.growthStage, growthStageOptions, true) &&
    typeof value.sowingDate === "string" &&
    isValidDate(value.sowingDate)
  );
}

export function deserializeFarmProfile(value: string | null): FarmProfile | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return validateFarmProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeFarmProfile(profile: FarmProfile): string {
  if (!validateFarmProfile(profile)) {
    throw new Error("Check the farm profile values and try again.");
  }
  return JSON.stringify(profile);
}

export function normalizeFarmProfile(
  profile: FarmProfile,
  farmSizeInput: string,
): FarmProfile {
  return {
    ...profile,
    farmName: profile.farmName.trim(),
    farmSize: farmSizeInput.trim() ? Number(farmSizeInput) : null,
  };
}

export { emptyFarmProfile };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDate(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date.getTime() <= Date.now()
  );
}

function isChoice<const T extends readonly string[]>(
  value: unknown,
  options: T,
  allowEmpty: boolean,
): value is T[number] | "" {
  return (allowEmpty && value === "") || options.includes(value as T[number]);
}
