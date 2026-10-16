import type { Block, District, State, Subdistrict } from "./types.ts";

const LGD_API_ORIGIN = "https://india-lgd-index-api.vercel.app";
const REQUEST_TIMEOUT_MS = 8_000;

type Entity = State | District | Subdistrict | Block;

export class LgdServiceError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
    this.name = "LgdServiceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function hasRequiredStrings(
  value: unknown,
  fields: readonly string[],
): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    fields.every((field) => isString(value[field]))
  );
}

export function parseEntities<T extends Entity>(
  payload: unknown,
  fields: readonly string[],
  optionalFields: readonly string[] = [],
): T[] {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !Array.isArray(payload.data) ||
    !isRecord(payload.meta) ||
    typeof payload.meta.count !== "number"
  ) {
    throw new LgdServiceError("Location data could not be read.");
  }

  const entities = payload.data;
  if (
    !entities.every(
      (entity) =>
        hasRequiredStrings(entity, fields) &&
        optionalFields.every(
          (field) => entity[field] === undefined || isString(entity[field]),
        ),
    )
  ) {
    throw new LgdServiceError("Location data could not be read.");
  }

  return entities as T[];
}

function parseStates(payload: unknown): State[] {
  return parseEntities<State>(
    payload,
    ["code", "name"],
    [
      "name_local",
      "type",
      "census_2001_code",
      "census_2011_code",
    ],
  );
}

function parseDistricts(payload: unknown, requestedState: string): District[] {
  const entities = parseEntities<
    Omit<District, "state_code"> & { state_code?: string }
  >(payload, ["code", "name"], ["state_code"]);

  return entities.map((district) => {
    if (district.state_code && district.state_code !== requestedState) {
      throw new LgdServiceError("Location data could not be read.");
    }
    return { ...district, state_code: requestedState };
  });
}

function parseSubdistricts(payload: unknown): Subdistrict[] {
  return parseEntities<Subdistrict>(payload, [
    "code",
    "name",
    "state_code",
    "district_code",
  ]);
}

function parseBlocks(payload: unknown): Block[] {
  return parseEntities<Block>(payload, [
    "code",
    "name",
    "state_code",
    "district_code",
  ]);
}

export function createLgdService(fetcher: typeof fetch = fetch) {
  async function getEntities<T extends Entity>(
    path: string,
    parse: (payload: unknown) => T[],
    signal?: AbortSignal,
  ): Promise<T[]> {
    try {
      const response = await fetcher(`${LGD_API_ORIGIN}${path}`, {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
          : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new LgdServiceError(
          "Location data is temporarily unavailable. Please try again.",
          response.status === 429 ? 503 : 502,
        );
      }

      return parse(await response.json());
    } catch (error) {
      if (error instanceof LgdServiceError) {
        throw error;
      }
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new LgdServiceError(
          "Location data is taking too long to load. Please try again.",
          504,
        );
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new LgdServiceError(
          "Location request was cancelled. Please try again.",
          503,
        );
      }
      throw new LgdServiceError(
        "Location data is temporarily unavailable. Please try again.",
        502,
      );
    }
  }

  return {
    states: (signal?: AbortSignal) =>
      getEntities("/v1/states", parseStates, signal),
    districts: (state: string, signal?: AbortSignal) =>
      getEntities(
        `/v1/districts?state=${encodeURIComponent(state)}`,
        (payload) => parseDistricts(payload, state),
        signal,
      ),
    subdistricts: (district: string, signal?: AbortSignal) =>
      getEntities(
        `/v1/subdistricts?district=${encodeURIComponent(district)}`,
        parseSubdistricts,
        signal,
      ),
    blocks: (district: string, signal?: AbortSignal) =>
      getEntities(
        `/v1/blocks?district=${encodeURIComponent(district)}`,
        parseBlocks,
        signal,
      ),
  };
}

export const lgdService = createLgdService();
