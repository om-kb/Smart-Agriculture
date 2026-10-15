import type {
  ChatResponse,
  ChatRequest,
  ConversationTurn,
  FarmContext,
  LocationContext,
  WeatherContext,
} from "./types.ts";
import {
  MAX_ASSISTANT_RESPONSE_LENGTH,
  TOPIC_IDS,
} from "./types.ts";

export const MAX_CHAT_MESSAGE_LENGTH = 500;
export const MAX_RECENT_TURNS = 10;
export const MAX_REQUEST_BODY_LENGTH = 20_000;

type ValidationResult =
  | { valid: true; value: ChatRequest }
  | { valid: false; error: string };

const REQUEST_KEYS = new Set([
  "message",
  "farmContext",
  "weatherContext",
  "locationContext",
  "recentTurns",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isTopicId(value: string): boolean {
  return (TOPIC_IDS as readonly string[]).includes(value);
}

function optionalString(
  value: unknown,
  maxLength: number,
  allowEmpty = false,
): value is string | undefined {
  return (
    value === undefined ||
    (typeof value === "string" &&
      value.length <= maxLength &&
      (allowEmpty || value.trim().length > 0))
  );
}

function optionalNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number | undefined {
  return (
    value === undefined ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= minimum &&
      value <= maximum)
  );
}

function validateFarmContext(value: unknown): value is FarmContext {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "crop",
      "soilType",
      "irrigationMethod",
      "growthStage",
      "farmSize",
      "location",
    ]) &&
    optionalString(value.crop, 80) &&
    optionalString(value.soilType, 80) &&
    optionalString(value.irrigationMethod, 80) &&
    optionalString(value.growthStage, 80) &&
    (value.farmSize === undefined ||
      (typeof value.farmSize === "number" &&
        Number.isFinite(value.farmSize) &&
        value.farmSize > 0 &&
        value.farmSize <= 1_000_000)) &&
    optionalString(value.location, 200)
  );
}

function validateWeatherContext(value: unknown): value is WeatherContext {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "temperatureC",
      "humidityPercent",
      "rainfallForecastMm",
      "windSpeedKmh",
      "forecastDate",
      "source",
      "fetchedAt",
    ]) &&
    optionalNumber(value.temperatureC, -100, 70) &&
    optionalNumber(value.humidityPercent, 0, 100) &&
    optionalNumber(value.rainfallForecastMm, 0, 10_000) &&
    optionalNumber(value.windSpeedKmh, 0, 500) &&
    optionalString(value.forecastDate, 10) &&
    (value.forecastDate === undefined || isIsoDate(value.forecastDate)) &&
    optionalString(value.source, 100) &&
    optionalString(value.fetchedAt, 40) &&
    (value.fetchedAt === undefined || !Number.isNaN(Date.parse(value.fetchedAt)))
  );
}

function validateLocationContext(value: unknown): value is LocationContext {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["displayName", "state", "district"]) &&
    optionalString(value.displayName, 200) &&
    optionalString(value.state, 160) &&
    optionalString(value.district, 160)
  );
}

function validateRecentTurns(value: unknown): value is ConversationTurn[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_RECENT_TURNS &&
    value.every(
      (turn) =>
        isRecord(turn) &&
        hasOnlyKeys(turn, ["role", "content"]) &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim().length > 0 &&
        turn.content.length <=
          (turn.role === "user"
            ? MAX_CHAT_MESSAGE_LENGTH
            : MAX_ASSISTANT_RESPONSE_LENGTH),
    )
  );
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateChatRequest(value: unknown): ValidationResult {
  if (!isRecord(value) || !hasOnlyKeys(value, [...REQUEST_KEYS])) {
    return {
      valid: false,
      error: "Send a JSON object with a message and optional context.",
    };
  }
  if (
    typeof value.message !== "string" ||
    value.message.trim().length === 0 ||
    value.message.length > MAX_CHAT_MESSAGE_LENGTH
  ) {
    return {
      valid: false,
      error: `Message must contain 1–${MAX_CHAT_MESSAGE_LENGTH} characters.`,
    };
  }
  const request: ChatRequest = { message: value.message };
  if (value.farmContext !== undefined) {
    if (!validateFarmContext(value.farmContext)) {
      return {
        valid: false,
        error: "One or more context fields are invalid or exceed their limits.",
      };
    }
    request.farmContext = value.farmContext;
  }
  if (value.weatherContext !== undefined) {
    if (!validateWeatherContext(value.weatherContext)) {
      return {
        valid: false,
        error: "One or more context fields are invalid or exceed their limits.",
      };
    }
    request.weatherContext = value.weatherContext;
  }
  if (value.locationContext !== undefined) {
    if (!validateLocationContext(value.locationContext)) {
      return {
        valid: false,
        error: "One or more context fields are invalid or exceed their limits.",
      };
    }
    request.locationContext = value.locationContext;
  }
  if (value.recentTurns !== undefined) {
    if (!validateRecentTurns(value.recentTurns)) {
      return {
        valid: false,
        error: "One or more context fields are invalid or exceed their limits.",
      };
    }
    request.recentTurns = value.recentTurns;
  }

  return { valid: true, value: request };
}

export function isChatResponse(value: unknown): value is ChatResponse {
  if (!isRecord(value)) return false;
  return (
    typeof value.answer === "string" &&
    value.answer.length <= MAX_ASSISTANT_RESPONSE_LENGTH &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    (value.confidenceLabel === "high" ||
      value.confidenceLabel === "moderate" ||
      value.confidenceLabel === "low") &&
    (value.matchedIntent === null ||
      (typeof value.matchedIntent === "string" &&
        isTopicId(value.matchedIntent))) &&
    (value.topicId === null ||
      (typeof value.topicId === "string" &&
        isTopicId(value.topicId))) &&
    (value.verificationStatus === null ||
      value.verificationStatus === "official-overview-linked" ||
      value.verificationStatus === "unverified-general-guidance") &&
    Array.isArray(value.sources) &&
    value.sources.length <= 10 &&
    value.sources.every(
      (source) =>
        isRecord(source) &&
        hasOnlyKeys(source, ["label", "url", "note"]) &&
        typeof source.label === "string" &&
        source.label.trim().length > 0 &&
        source.label.length <= 200 &&
        (source.url === undefined ||
          (typeof source.url === "string" &&
            source.url.length <= 500 &&
            source.url.startsWith("https://"))) &&
        typeof source.note === "string" &&
        source.note.length <= 500,
    ) &&
    Array.isArray(value.suggestedFollowUps) &&
    value.suggestedFollowUps.length <= 10 &&
    value.suggestedFollowUps.every(
      (question) =>
        typeof question === "string" &&
        question.length > 0 &&
        question.length <= MAX_CHAT_MESSAGE_LENGTH,
    ) &&
    Array.isArray(value.missingInformation) &&
    value.missingInformation.length <= 10 &&
    value.missingInformation.every(
      (item) => typeof item === "string" && item.length > 0 && item.length <= 200,
    ) &&
    (value.basis === "general-guidance" ||
      value.basis === "weather-context" ||
      value.basis === "contextual-follow-up" ||
      value.basis === "clarification" ||
      value.basis === "fallback")
  );
}
