import { isTopicId } from "./classifier.ts";
import type {
  ChatResponse,
  StoredChatMessage,
} from "./types.ts";
import { ENGLISH_ASSISTANT_COPY as copy } from "./copy.ts";

export const CONVERSATION_STORAGE_KEY = "smart-agriculture-assistant-v1";
export const MAX_STORED_MESSAGES = 40;
const MAX_STORED_MESSAGE_LENGTH = 5_000;
const MAX_STORED_CONVERSATION_LENGTH = 1_000_000;
const EMPTY_MESSAGES: StoredChatMessage[] = [];

export interface ConversationSnapshot {
  messages: StoredChatMessage[];
  error: string | null;
}

const EMPTY_SNAPSHOT: ConversationSnapshot = {
  messages: EMPTY_MESSAGES,
  error: null,
};
const STORAGE_UNAVAILABLE_SNAPSHOT: ConversationSnapshot = {
  messages: EMPTY_MESSAGES,
  error: copy.storageUnavailable,
};

let snapshot = EMPTY_SNAPSHOT;
let cachedRaw: string | null | undefined;
let initialized = false;
let snapshotOverridden = false;

function isResponse(value: unknown): value is ChatResponse {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  return (
    typeof response.answer === "string" &&
    response.answer.length <= MAX_STORED_MESSAGE_LENGTH &&
    (response.matchedIntent === null ||
      (typeof response.matchedIntent === "string" &&
        isTopicId(response.matchedIntent))) &&
    typeof response.confidence === "number" &&
    Number.isFinite(response.confidence) &&
    response.confidence >= 0 &&
    response.confidence <= 1 &&
    (response.confidenceLabel === "high" ||
      response.confidenceLabel === "moderate" ||
      response.confidenceLabel === "low") &&
    (response.topicId === null ||
      (typeof response.topicId === "string" && isTopicId(response.topicId))) &&
    (response.verificationStatus === null ||
      response.verificationStatus === "official-overview-linked" ||
      response.verificationStatus === "unverified-general-guidance") &&
    Array.isArray(response.sources) &&
    response.sources.length <= 10 &&
    response.sources.every(
      (source) =>
        typeof source === "object" &&
        source !== null &&
        "label" in source &&
        typeof source.label === "string" &&
        source.label.length <= 200 &&
        (!("url" in source) ||
          source.url === undefined ||
          (typeof source.url === "string" &&
            source.url.startsWith("https://"))) &&
        "note" in source &&
        typeof source.note === "string" &&
        source.note.length <= 500,
    ) &&
    Array.isArray(response.suggestedFollowUps) &&
    response.suggestedFollowUps.length <= 10 &&
    response.suggestedFollowUps.every(
      (question) =>
        typeof question === "string" && question.length <= 500,
    ) &&
    Array.isArray(response.missingInformation) &&
    response.missingInformation.length <= 10 &&
    response.missingInformation.every(
      (item) => typeof item === "string" && item.length <= 200,
    ) &&
    (response.basis === "general-guidance" ||
      response.basis === "weather-context" ||
      response.basis === "contextual-follow-up" ||
      response.basis === "clarification" ||
      response.basis === "fallback")
  );
}

function isStoredMessage(value: unknown): value is StoredChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    Object.keys(message).every((key) =>
      ["id", "role", "content", "response", "createdAt"].includes(key),
    ) &&
    typeof message.id === "string" &&
    message.id.length > 0 &&
    message.id.length <= 100 &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.length > 0 &&
    message.content.length <= MAX_STORED_MESSAGE_LENGTH &&
    typeof message.createdAt === "string" &&
    !Number.isNaN(Date.parse(message.createdAt)) &&
    (message.response === undefined || isResponse(message.response))
  );
}

export function parseStoredConversation(raw: string | null): {
  messages: StoredChatMessage[];
  invalid: boolean;
} {
  if (raw === null) return { messages: [], invalid: false };
  if (raw.length > MAX_STORED_CONVERSATION_LENGTH) {
    return { messages: [], invalid: true };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      parsed.length > MAX_STORED_MESSAGES ||
      !parsed.every(isStoredMessage)
    ) {
      return { messages: [], invalid: true };
    }
    return { messages: parsed, invalid: false };
  } catch {
    return { messages: [], invalid: true };
  }
}

function notifySubscribers(callbacks: Set<() => void>): void {
  for (const callback of callbacks) callback();
}

const subscribers = new Set<() => void>();

function refreshSnapshot(): void {
  if (typeof window === "undefined") return;
  snapshotOverridden = false;
  try {
    const raw = window.localStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (initialized && raw === cachedRaw) return;
    cachedRaw = raw;
    initialized = true;
    const parsed = parseStoredConversation(raw);
    snapshot = {
      messages: parsed.messages,
      error: parsed.invalid
        ? copy.invalidSavedConversation
        : null,
    };
  } catch {
    initialized = true;
    cachedRaw = undefined;
    snapshot = STORAGE_UNAVAILABLE_SNAPSHOT;
  }
}

export function getConversationSnapshot(): ConversationSnapshot {
  if (!snapshotOverridden) refreshSnapshot();
  return snapshot;
}

export function getServerConversationSnapshot(): ConversationSnapshot {
  return EMPTY_SNAPSHOT;
}

export function subscribeToConversation(
  callback: () => void,
): () => void {
  subscribers.add(callback);
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === CONVERSATION_STORAGE_KEY) {
      initialized = false;
      refreshSnapshot();
      notifySubscribers(subscribers);
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    subscribers.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function saveConversation(
  messages: readonly StoredChatMessage[],
): void {
  const retained = messages.slice(-MAX_STORED_MESSAGES);
  const serialized = JSON.stringify(retained);
  try {
    window.localStorage.setItem(CONVERSATION_STORAGE_KEY, serialized);
    cachedRaw = serialized;
    initialized = true;
    snapshotOverridden = false;
    snapshot = { messages: retained, error: null };
  } catch {
    snapshotOverridden = true;
    snapshot = {
      messages: retained,
      error: copy.storageSaveFailed,
    };
  }
  notifySubscribers(subscribers);
}

export function clearSavedConversation(): void {
  try {
    window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    cachedRaw = null;
    initialized = true;
    snapshotOverridden = false;
    snapshot = EMPTY_SNAPSHOT;
  } catch {
    snapshotOverridden = true;
    snapshot = {
      messages: EMPTY_MESSAGES,
      error: copy.storageClearFailed,
    };
  }
  notifySubscribers(subscribers);
}
