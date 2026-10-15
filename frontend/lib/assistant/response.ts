import {
  classifyIntent,
  extractEntities,
  extractForecastTemporalIntent,
} from "./classifier.ts";
import { getKnowledgeEntry } from "./knowledge/index.ts";
import type {
  ChatRequest,
  ChatResponse,
  ConversationTurn,
  FarmContext,
  IntentClassification,
  TopicId,
  WeatherContext,
} from "./types.ts";

function cropName(context?: FarmContext): string | undefined {
  return context?.crop?.trim();
}

function latestRelevantIntent(
  turns: readonly ConversationTurn[] = [],
): IntentClassification | null {
  for (const turn of [...turns].reverse()) {
    if (turn.role !== "user") continue;
    const classification = classifyIntent(turn.content);
    if (classification.status === "supported") return classification;
  }
  return null;
}

function contextFollowUp(
  message: string,
  turns: readonly ConversationTurn[] | undefined,
): { topicId: TopicId; crop: string } | null {
  const crop = classifyIntent(message).entities.crops[0];
  if (!crop) return null;
  const previous = latestRelevantIntent(turns);
  if (previous?.intent?.startsWith("irrigation.")) {
    return { topicId: previous.intent, crop };
  }
  return null;
}

function localDateInTimezone(now: Date, timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value;
    const year = part("year");
    const month = part("month");
    const day = part("day");
    return year && month && day ? `${year}-${month}-${day}` : null;
  } catch {
    return null;
  }
}

function addCalendarDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function readableForecastDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

interface ForecastTarget {
  date: string | null;
  label: string;
  kind: "daily" | "tonight";
}

function forecastTarget(
  message: string,
  context: WeatherContext | undefined,
  now: Date,
): ForecastTarget {
  const intent = extractForecastTemporalIntent(message);
  if (intent.kind === "tonight") {
    const today = context?.timezone
      ? localDateInTimezone(now, context.timezone)
      : null;
    return {
      date: today,
      label: today ? `tonight (${readableForecastDate(today)})` : "tonight",
      kind: "tonight",
    };
  }

  if (intent.kind === "explicit-date") {
    const localToday = context?.timezone
      ? localDateInTimezone(now, context.timezone)
      : null;
    const year = intent.year ?? Number(localToday?.slice(0, 4));
    if (!year || !isValidCalendarDate(year, intent.month, intent.day)) {
      return { date: null, label: "that date", kind: "daily" };
    }
    const date = `${year}-${String(intent.month).padStart(2, "0")}-${String(intent.day).padStart(2, "0")}`;
    return {
      date,
      label: readableForecastDate(date),
      kind: "daily",
    };
  }

  const today = context?.timezone
    ? localDateInTimezone(now, context.timezone)
    : null;
  if (!today) {
    return {
      date: null,
      label: intent.kind === "unspecified" ? "tomorrow" : intent.kind,
      kind: "daily",
    };
  }
  const offset =
    intent.kind === "today"
      ? 0
      : intent.kind === "day-after-tomorrow"
        ? 2
        : 1;
  const date = addCalendarDays(today, offset);
  const label =
    intent.kind === "today"
      ? "today"
      : intent.kind === "day-after-tomorrow"
        ? "the day after tomorrow"
        : "tomorrow";
  return { date, label, kind: "daily" };
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function forecastForDate(
  context: WeatherContext | undefined,
  date: string | null,
): NonNullable<WeatherContext["dailyForecasts"]>[number] | undefined {
  return date
    ? context?.dailyForecasts?.find((forecast) => forecast.date === date)
    : undefined;
}

function formatWeatherNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(value);
}

function currentWeatherAnswer(
  request: ChatRequest,
  context?: WeatherContext,
): { answer: string; used: boolean } {
  if (!context) {
    return {
      answer: "I don't have current weather data for your location right now.",
      used: false,
    };
  }
  const values: string[] = [];
  if (context.currentTemperatureC !== undefined) {
    values.push(`${formatWeatherNumber(context.currentTemperatureC)} °C`);
  }
  if (context.currentHumidityPercent !== undefined) {
    values.push(`${formatWeatherNumber(context.currentHumidityPercent)}% humidity`);
  }
  if (context.currentWindSpeedKmh !== undefined) {
    values.push(`${formatWeatherNumber(context.currentWindSpeedKmh)} km/h wind`);
  }
  if (!values.length) {
    return {
      answer: "I don't have current weather measurements for your location right now.",
      used: false,
    };
  }
  const location =
    request.locationContext?.displayName ??
    request.locationContext?.district ??
    request.locationContext?.state ??
    "your selected area";
  const source = context.source ? ` (${context.source})` : "";
  return {
    answer: `Current weather for ${location}: ${values.join(", ")}${source}. These are regional estimates, not measurements at your field.`,
    used: true,
  };
}

function forecastWeatherAnswer(
  request: ChatRequest,
  context: WeatherContext | undefined,
  now: Date,
): { answer: string; used: boolean } {
  const location =
    request.locationContext?.district ??
    request.locationContext?.displayName ??
    request.locationContext?.state ??
    "your selected area";
  const target = forecastTarget(request.message, context, now);
  const source = context?.source ? ` Source: ${context.source}.` : "";
  if (target.kind === "tonight") {
    return {
      answer: `I don't have an hourly forecast for ${location} ${target.label}. Daily forecasts cannot show whether rain will fall specifically tonight.${source}`,
      used: false,
    };
  }
  if (!target.date) {
    return {
      answer: `I can't determine the requested local forecast date for ${location} because its timezone or date is unavailable.${source}`,
      used: false,
    };
  }

  const forecast = forecastForDate(context, target.date);
  if (!forecast) {
    const dates = context?.dailyForecasts?.map((item) => item.date) ?? [];
    const firstDate = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
    const lastDate = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
    const range =
      firstDate && lastDate
        ? ` The available daily forecast covers ${readableForecastDate(firstDate)} to ${readableForecastDate(lastDate)}.`
        : "";
    return {
      answer: `I don't have a forecast for ${location} on ${readableForecastDate(target.date)}.${range} Check the latest local forecast before making irrigation decisions.${source}`,
      used: false,
    };
  }

  const readableDate = readableForecastDate(target.date);
  if (
    forecast.precipitationMm === undefined &&
    forecast.precipitationProbabilityPercent === undefined
  ) {
    return {
      answer: `Rainfall details are not available for ${location} on ${readableDate}; I can't estimate them.${source}`,
      used: false,
    };
  }
  let answer: string;
  if (forecast.precipitationMm !== undefined) {
    const probability =
      forecast.precipitationProbabilityPercent === undefined
        ? ""
        : ` with ${formatWeatherNumber(forecast.precipitationProbabilityPercent)}% probability`;
    answer = `For ${location} on ${readableDate}, the forecast indicates approximately ${formatWeatherNumber(forecast.precipitationMm)} mm of rain${probability}. Actual rainfall at your farm may differ.`;
  } else if (forecast.precipitationProbabilityPercent !== undefined) {
    answer = `For ${location} on ${readableDate}, the forecast gives a ${formatWeatherNumber(forecast.precipitationProbabilityPercent)}% chance of rain. Actual rainfall at your farm may differ.`;
  } else {
    answer = `Rainfall details are not available for ${location} on ${readableDate}; I can't estimate them.`;
  }
  return { answer: `${answer}${source}`, used: true };
}

function confidenceLabel(
  classification: IntentClassification,
): ChatResponse["confidenceLabel"] {
  return classification.confidenceLabel;
}

function missingForTopic(
  topicId: TopicId,
  request: ChatRequest,
  now: Date,
): string[] {
  const missing: string[] = [];
  const target = forecastTarget(request.message, request.weatherContext, now);
  const requestedForecast = forecastForDate(
    request.weatherContext,
    target.date,
  );
  if (topicId.startsWith("irrigation.")) {
    if (!request.farmContext?.crop) missing.push("crop");
    if (!request.farmContext?.growthStage) missing.push("growth stage");
    if (
      requestedForecast?.precipitationMm === undefined
    ) {
      missing.push("recent rainfall or a local rainfall forecast");
    }
    if (topicId === "irrigation.general" || topicId === "irrigation.soil-moisture") {
      if (!request.farmContext?.soilType) missing.push("soil type");
    }
  }
  if (topicId.startsWith("crop.") && topicId !== "crop.suitability") {
    if (!request.farmContext?.growthStage) missing.push("growth stage");
  }
  if (
    topicId === "weather.current" &&
    request.weatherContext?.currentTemperatureC === undefined &&
    request.weatherContext?.currentHumidityPercent === undefined &&
    request.weatherContext?.currentWindSpeedKmh === undefined
  ) {
    missing.push("current weather data from a connected weather source");
  }
  if (
    topicId === "weather.forecast" &&
    (target.kind === "tonight" ||
      requestedForecast?.precipitationMm === undefined &&
        requestedForecast?.precipitationProbabilityPercent === undefined)
  ) {
    missing.push(
      target.kind === "tonight"
        ? "an hourly forecast for tonight"
        : `rainfall forecast for ${target.date ? readableForecastDate(target.date) : target.label}`,
    );
  }
  if (
    topicId === "crop.suitability" &&
    !request.locationContext?.displayName &&
    !request.locationContext?.state &&
    !request.locationContext?.district &&
    !request.farmContext?.location
  ) {
    missing.push("state or district");
  }
  return missing;
}

function generalResponse(
  topicId: TopicId,
  request: ChatRequest,
  confidence: number,
  confidenceRating: ChatResponse["confidenceLabel"],
  basis: ChatResponse["basis"],
  cropOverride?: string,
  now = new Date(),
): ChatResponse {
  const entry = getKnowledgeEntry(topicId);
  let answer = entry.answer;
  let usedWeather = false;

  if (topicId === "weather.current") {
    const current = currentWeatherAnswer(request, request.weatherContext);
    answer = current.answer;
    usedWeather = current.used;
  } else if (topicId === "weather.forecast") {
    const forecast = forecastWeatherAnswer(request, request.weatherContext, now);
    answer = forecast.answer;
    usedWeather = forecast.used;
  } else if (
    topicId === "irrigation.general" ||
    topicId === "irrigation.soil-moisture"
  ) {
    const forecast = forecastWeatherAnswer(request, request.weatherContext, now);
    if (request.weatherContext) {
      answer = `${answer} ${forecast.answer}`;
      usedWeather = forecast.used;
    }
  }

  const explicitCrops = extractEntities(request.message).crops;
  const savedCrop = cropName(request.farmContext);
  const crop = cropOverride ?? savedCrop;
  if (
    crop &&
    (!explicitCrops.length ||
      explicitCrops.some(
        (explicitCrop) =>
          explicitCrop.toLocaleLowerCase("en") === crop.toLocaleLowerCase("en"),
      )) &&
    (topicId.startsWith("irrigation.") || topicId.startsWith("crop."))
  ) {
    answer += ` You mentioned ${crop} as your crop; the guidance still depends on its growth stage and local field conditions.`;
  } else if (savedCrop && explicitCrops.length > 0) {
    answer += ` Your farm context lists ${savedCrop}, while this question mentions ${explicitCrops.join(" and ")}; please confirm which crop you mean.`;
  }

  const location =
    request.locationContext?.displayName ??
    request.locationContext?.district ??
    request.locationContext?.state ??
    request.farmContext?.location;
  if (location && topicId === "crop.suitability") {
    answer += ` You provided ${location} as location context, but I do not have verified district-specific crop data for it.`;
  }

  const missingInformation = missingForTopic(topicId, request, now);
  const suggestedFollowUps = [...entry.followUpQuestions];
  if (missingInformation.length > 0 && topicId.startsWith("irrigation.")) {
    suggestedFollowUps.unshift(
      "What crop, growth stage, soil type, and recent rainfall should I consider?",
    );
  }

  return {
    answer,
    matchedIntent: topicId,
    confidence,
    confidenceLabel: confidenceRating,
    topicId,
    verificationStatus: entry.verificationStatus,
    sources: entry.references.map((reference) => ({ ...reference })),
    suggestedFollowUps: [...new Set(suggestedFollowUps)].slice(0, 4),
    missingInformation: [...new Set(missingInformation)],
    basis: usedWeather ? "weather-context" : basis,
  };
}

function fallbackResponse(
  classification: IntentClassification,
): ChatResponse {
  if (classification.status === "empty") {
    return {
      answer: "Enter an agricultural or app-help question to get started.",
      matchedIntent: null,
      confidence: 0,
      confidenceLabel: "low",
      topicId: null,
      verificationStatus: null,
      sources: [],
      suggestedFollowUps: ["How should I decide whether to irrigate?", "How do I test my soil?"],
      missingInformation: [],
      basis: "fallback",
    };
  }

  if (classification.status === "too_long") {
    return {
      answer: "Please shorten your question to under 1,000 characters and ask one farming question at a time.",
      matchedIntent: null,
      confidence: 0,
      confidenceLabel: "low",
      topicId: null,
      verificationStatus: null,
      sources: [],
      suggestedFollowUps: [],
      missingInformation: [],
      basis: "fallback",
    };
  }

  if (classification.status === "ambiguous") {
    const options = classification.candidates
      .map((topicId) => getKnowledgeEntry(topicId).title.toLocaleLowerCase("en"))
      .join(" or ");
    return {
      answer: `I may have misunderstood. Are you asking about ${options}? Please add a little more detail.`,
      matchedIntent: null,
      confidence: classification.confidence,
      confidenceLabel: classification.confidenceLabel,
      topicId: null,
      verificationStatus: null,
      sources: [],
      suggestedFollowUps: classification.candidates
        .map((topicId) => getKnowledgeEntry(topicId).followUpQuestions[0])
        .filter((question): question is string => Boolean(question))
        .slice(0, 3),
      missingInformation: [],
      basis: "clarification",
    };
  }

  return {
    answer:
      "I couldn't match that to a supported topic. I am a rule-based guide, not a generative AI system, and I cannot answer arbitrary questions, diagnose crop disease, or prescribe chemical doses. Try asking about weather, irrigation, a supported crop or soil type, farm practices, or using this app. For high-impact decisions, contact a local agricultural extension expert.",
    matchedIntent: null,
    confidence: 0,
    confidenceLabel: "low",
    topicId: null,
    verificationStatus: null,
    sources: [],
    suggestedFollowUps: [
      "How should I decide whether to irrigate?",
      "What should I consider before choosing a crop?",
      "How do I test my soil?",
    ],
    missingInformation: [],
    basis: "fallback",
  };
}

function savedProfileAnswer(request: ChatRequest): ChatResponse | null {
  const message = request.message
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const asksCrop =
    /\bwhat crop am i (?:currently )?(?:growing|planting)\b/.test(message) ||
    /\bwhich crop did i (?:select|save|choose)\b/.test(message) ||
    /\b(?:my|our) saved crop\b/.test(message);
  const asksSoil =
    /\bwhat soil type did i (?:select|save|choose)\b/.test(message) ||
    /\bwhich soil type did i (?:select|save|choose)\b/.test(message) ||
    /\bwhat soil type is in my (?:farm )?profile\b/.test(message);
  if (!asksCrop && !asksSoil) return null;

  const field = asksCrop ? "crop" : "soilType";
  const value = request.farmContext?.[field]?.trim();
  const label = asksCrop ? "crop" : "soil type";
  const answer = value
    ? `Your saved farm profile lists ${value} as your ${label}.`
    : request.farmContext
      ? `Your saved farm profile does not list a ${label} yet. You can add it in Farm profile.`
      : `No saved farm profile context was available, so I cannot confirm your ${label}. Add or review it in Farm profile.`;
  return {
    answer,
    matchedIntent: null,
    confidence: 0.9,
    confidenceLabel: "high",
    topicId: null,
    verificationStatus: null,
    sources: [],
    suggestedFollowUps: [
      asksCrop ? "What soil type did I select?" : "What crop am I growing?",
      "How do I edit my farm profile?",
    ],
    missingInformation: value ? [] : [`saved ${label}`],
    basis: "contextual-follow-up",
  };
}

export function generateChatResponse(
  request: ChatRequest,
  now = new Date(),
): ChatResponse {
  const profileAnswer = savedProfileAnswer(request);
  if (profileAnswer) return profileAnswer;

  const classification = classifyIntent(request.message);
  if (classification.status !== "supported" || !classification.intent) {
    const continuation = contextFollowUp(request.message, request.recentTurns);
    if (continuation) {
      const response = generalResponse(
        continuation.topicId,
        request,
        0.8,
        "moderate",
        "contextual-follow-up",
        continuation.crop,
        now,
      );
      response.answer = `Thanks for sharing that you grow ${continuation.crop}. ${response.answer} To discuss irrigation factors further, I would still need your local rainfall information, crop growth stage, and field soil condition.`;
      response.missingInformation = [
        ...new Set([
          ...response.missingInformation,
          "local rainfall information",
          "crop growth stage",
          "field soil condition",
        ]),
      ];
      return response;
    }
    if (
      classification.status === "unsupported" &&
      classification.entities.crops.length > 0
    ) {
      const crop = classification.entities.crops[0];
      return {
        answer: `I recognized ${crop} as a crop, but need to know what you want to learn about it. I can share general crop information, discuss suitability factors, or explain a supported farming practice.`,
        matchedIntent: null,
        confidence: classification.confidence,
        confidenceLabel: classification.confidenceLabel,
        topicId: null,
        verificationStatus: null,
        sources: [],
        suggestedFollowUps: [
          `What should I know about growing ${crop}?`,
          `Is ${crop} suitable for my conditions?`,
        ],
        missingInformation: ["the question or topic you want to discuss"],
        basis: "clarification",
      };
    }
    return fallbackResponse(classification);
  }

  return generalResponse(
    classification.intent,
    request,
    classification.confidence,
    confidenceLabel(classification),
    "general-guidance",
    undefined,
    now,
  );
}
