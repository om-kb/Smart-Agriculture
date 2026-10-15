import { KNOWLEDGE_BASE } from "./knowledge/index.ts";
import {
  TOPIC_IDS,
  type CropName,
  type ExtractedEntities,
  type IntentClassification,
  type KnowledgeEntry,
  type ForecastTemporalIntent,
  type SoilName,
  type TopicId,
} from "./types.ts";

export const MAX_CLASSIFIER_INPUT_LENGTH = 1_000;
export const INTENT_CONFIDENCE_THRESHOLD = 0.62;

const CROP_ALIASES: ReadonlyArray<readonly [CropName, readonly string[]]> = [
  ["rice", ["rice", "paddy"]],
  ["wheat", ["wheat"]],
  ["maize", ["maize", "corn"]],
  ["cotton", ["cotton"]],
  ["sugarcane", ["sugarcane", "sugar cane"]],
  ["groundnut", ["groundnut", "peanut"]],
  ["tomato", ["tomato", "tomatoes"]],
  ["potato", ["potato", "potatoes"]],
];

const SOIL_ALIASES: ReadonlyArray<readonly [SoilName, readonly string[]]> = [
  ["sandy", ["sandy soil"]],
  ["clay", ["clay soil", "clayey soil"]],
  ["loamy", ["loamy soil", "loam soil"]],
  ["black", ["black soil", "regur soil"]],
  ["red", ["red soil", "red earth"]],
  ["alluvial", ["alluvial soil"]],
];

const WEATHER_TERMS = [
  "temperature",
  "humidity",
  "rain",
  "rainfall",
  "forecast",
  "wind",
  "weather",
  "heat",
] as const;

const FUZZY_MATCH_STOPWORDS = new Set(["what"]);

export function normalizeQuestion(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function editDistanceAtMostOne(left: string, right: string): boolean {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (
      left.length === right.length &&
      left[leftIndex] === right[rightIndex + 1] &&
      left[leftIndex + 1] === right[rightIndex]
    ) {
      leftIndex += 2;
      rightIndex += 2;
    } else if (left.length > right.length) {
      leftIndex += 1;
    } else if (right.length > left.length) {
      rightIndex += 1;
    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) edits += 1;
  return edits <= 1;
}

function containsPhrase(question: string, phrase: string): boolean {
  return ` ${question} `.includes(` ${normalizeQuestion(phrase)} `);
}

function scoreEntry(question: string, entry: KnowledgeEntry): number {
  const matchedPattern = entry.supportedPatterns.some((pattern) =>
    containsPhrase(question, pattern),
  );
  const matchedSynonym = entry.synonyms.some((synonym) =>
    containsPhrase(question, synonym),
  );

  if (matchedPattern) return 0.9;
  if (matchedSynonym) return 0.82;

  const questionWords = new Set(question.split(" "));
  let exactKeywords = 0;
  let fuzzyKeyword = false;

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeQuestion(keyword);
    if (normalizedKeyword.includes(" ")) {
      if (containsPhrase(question, normalizedKeyword)) exactKeywords += 1;
      continue;
    }

    if (questionWords.has(normalizedKeyword)) {
      exactKeywords += 1;
      continue;
    }

    if (
      normalizedKeyword.length >= 5 &&
      [...questionWords].some(
        (word) =>
          word.length >= 4 &&
          !FUZZY_MATCH_STOPWORDS.has(word) &&
          word !== normalizedKeyword &&
          editDistanceAtMostOne(word, normalizedKeyword),
      )
    ) {
      fuzzyKeyword = true;
    }
  }

  if (exactKeywords > 0) {
    return Math.min(0.8, 0.34 + Math.max(0, exactKeywords - 1) * 0.24);
  }
  return fuzzyKeyword ? 0.65 : 0;
}

function matchesAlias(question: string, aliases: readonly string[]): boolean {
  if (aliases.some((alias) => containsPhrase(question, alias))) return true;

  const words = question.split(" ");
  return aliases.some((alias) => {
    const normalizedAlias = normalizeQuestion(alias);
    if (normalizedAlias.includes(" ") || normalizedAlias.length < 5) {
      return false;
    }
    return words.some(
      (word) =>
        word.length >= 4 &&
        !FUZZY_MATCH_STOPWORDS.has(word) &&
        word !== normalizedAlias &&
        editDistanceAtMostOne(word, normalizedAlias),
    );
  });
}

export function extractEntities(question: string): ExtractedEntities {
  const normalized = normalizeQuestion(question);
  return {
    crops: CROP_ALIASES.filter(([, aliases]) =>
      matchesAlias(normalized, aliases),
    ).map(([crop]) => crop),
    soilTypes: SOIL_ALIASES.filter(([, aliases]) =>
      matchesAlias(normalized, aliases),
    ).map(([soil]) => soil),
    weatherConcepts: WEATHER_TERMS.filter((term) =>
      containsPhrase(normalized, term),
    ),
  };
}

const MONTHS: Readonly<Record<string, number>> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export function extractForecastTemporalIntent(
  message: string,
): ForecastTemporalIntent {
  const normalized = normalizeQuestion(message);
  const isoDate = message.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoDate) {
    return {
      kind: "explicit-date",
      year: Number(isoDate[1]),
      month: Number(isoDate[2]),
      day: Number(isoDate[3]),
    };
  }

  const monthDate = message.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/i,
  );
  const dayMonth = message.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?\b/i,
  );
  const explicit = monthDate
    ? {
        day: Number(monthDate[2]),
        month: MONTHS[monthDate[1].toLocaleLowerCase("en")],
        year: monthDate[3] ? Number(monthDate[3]) : undefined,
      }
    : dayMonth
      ? {
          day: Number(dayMonth[1]),
          month: MONTHS[dayMonth[2].toLocaleLowerCase("en")],
          year: dayMonth[3] ? Number(dayMonth[3]) : undefined,
        }
      : null;
  if (explicit && explicit.month) {
    return { kind: "explicit-date", ...explicit };
  }

  if (/\btonight\b/.test(normalized)) return { kind: "tonight" };
  if (/\bday after tomorrow\b/.test(normalized)) {
    return { kind: "day-after-tomorrow" };
  }
  if (/\btoday\b/.test(normalized)) return { kind: "today" };
  if (/\btomorrow\b/.test(normalized)) return { kind: "tomorrow" };
  return { kind: "unspecified" };
}

function labelForConfidence(
  score: number,
): IntentClassification["confidenceLabel"] {
  if (score >= 0.85) return "high";
  if (score >= 0.7) return "moderate";
  return "low";
}

function result(
  status: IntentClassification["status"],
  intent: TopicId | null,
  confidence: number,
  candidates: TopicId[],
  entities: ExtractedEntities,
): IntentClassification {
  return {
    status,
    intent,
    confidence,
    confidenceLabel: labelForConfidence(confidence),
    candidates,
    entities,
  };
}

export function classifyIntent(input: string): IntentClassification {
  if (input.length > MAX_CLASSIFIER_INPUT_LENGTH) {
    return result("too_long", null, 0, [], {
      crops: [],
      soilTypes: [],
      weatherConcepts: [],
    });
  }
  const normalized = normalizeQuestion(input);
  const entities = extractEntities(normalized);
  if (!normalized) return result("empty", null, 0, [], entities);

  const ranked = KNOWLEDGE_BASE.map((entry) => ({
    id: entry.id,
    score: scoreEntry(normalized, entry),
  }))
    .filter(({ score }) => score >= INTENT_CONFIDENCE_THRESHOLD)
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];

  if (!best) return result("unsupported", null, 0, [], entities);

  const plausible = ranked.filter(
    (candidate) => best.score - candidate.score <= 0.08,
  );
  if (plausible.length > 1) {
    return result(
      "ambiguous",
      null,
      Number(best.score.toFixed(2)),
      plausible.map(({ id }) => id),
      entities,
    );
  }

  return result(
    "supported",
    best.id,
    Number(best.score.toFixed(2)),
    [best.id],
    entities,
  );
}

export function isTopicId(value: string): value is TopicId {
  return (TOPIC_IDS as readonly string[]).includes(value);
}
