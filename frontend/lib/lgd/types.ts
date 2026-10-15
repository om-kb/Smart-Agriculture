export interface State {
  code: string;
  name: string;
  name_local?: string;
  type?: string;
  census_2001_code?: string;
  census_2011_code?: string;
}

export interface District {
  code: string;
  name: string;
  state_code: string;
}

export interface Subdistrict {
  code: string;
  name: string;
  state_code: string;
  district_code: string;
}

export interface Block {
  code: string;
  name: string;
  state_code: string;
  district_code: string;
}

export interface LocationSelection {
  state: Pick<State, "code" | "name">;
  district: Pick<District, "code" | "name">;
  subdistrict?: Pick<Subdistrict, "code" | "name">;
  block?: Pick<Block, "code" | "name">;
}

export function isState(value: unknown): value is State {
  return (
    isRecord(value) &&
    hasStrings(value, ["code", "name"]) &&
    ["name_local", "type", "census_2001_code", "census_2011_code"].every(
      (field) => value[field] === undefined || typeof value[field] === "string",
    )
  );
}

export function isDistrict(value: unknown): value is District {
  return isRecord(value) && hasStrings(value, ["code", "name", "state_code"]);
}

export function isSubdistrict(value: unknown): value is Subdistrict {
  return (
    isRecord(value) &&
    hasStrings(value, ["code", "name", "state_code", "district_code"])
  );
}

export function isBlock(value: unknown): value is Block {
  return (
    isRecord(value) &&
    hasStrings(value, ["code", "name", "state_code", "district_code"])
  );
}

function hasStrings(value: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => typeof value[field] === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
