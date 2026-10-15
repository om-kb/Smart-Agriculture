import { classifyIntent, extractEntities } from "./classifier.ts";
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

function weatherSummary(context: WeatherContext): string[] {
  const values: string[] = [];
  if (context.temperatureC !== undefined) {
    values.push(`${context.temperatureC} °C`);
  }
  if (context.humidityPercent !== undefined) {
    values.push(`${context.humidityPercent}% humidity`);
  }
  if (context.rainfallForecastMm !== undefined) {
    values.push(`${context.rainfallForecastMm} mm forecast rainfall`);
  }
  if (context.windSpeedKmh !== undefined) {
    values.push(`${context.windSpeedKmh} km/h wind`);
  }
  return values;
}

function appendWeatherContext(
  answer: string,
  context?: WeatherContext,
): { answer: string; used: boolean } {
  if (!context) {
    return {
      answer: `${answer} No validated live weather data was available for this reply, so I cannot say what conditions apply at your farm.`,
      used: false,
    };
  }

  const summary = weatherSummary(context);
  const source = context.source ? ` from ${context.source}` : "";
  const forDate = context.forecastDate ? ` for ${context.forecastDate}` : "";
  const fetchedAt = context.fetchedAt
    ? `, supplied at ${context.fetchedAt}`
    : "";
  const details = summary.length
    ? summary.join(", ")
    : "no numeric weather measurements";
  return {
    answer: `${answer} The supplied weather context${source}${forDate}${fetchedAt} reports ${details}. These values are not field measurements.`,
    used: true,
  };
}

function confidenceLabel(
  classification: IntentClassification,
): ChatResponse["confidenceLabel"] {
  return classification.confidenceLabel;
}

function missingForTopic(
  topicId: TopicId,
  request: ChatRequest,
): string[] {
  const missing: string[] = [];
  if (topicId.startsWith("irrigation.")) {
    if (!request.farmContext?.crop) missing.push("crop");
    if (!request.farmContext?.growthStage) missing.push("growth stage");
    if (request.weatherContext?.rainfallForecastMm === undefined) {
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
    (topicId === "weather.current" || topicId === "weather.forecast") &&
    !request.weatherContext
  ) {
    missing.push("weather data from a connected weather source");
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
): ChatResponse {
  const entry = getKnowledgeEntry(topicId);
  let answer = entry.answer;
  let usedWeather = false;

  if (
    topicId.startsWith("weather.") ||
    (topicId.startsWith("irrigation.") &&
      (topicId === "irrigation.general" || topicId === "irrigation.soil-moisture"))
  ) {
    const withContext = appendWeatherContext(answer, request.weatherContext);
    answer = withContext.answer;
    usedWeather = withContext.used;
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
  if (location && usedWeather) {
    answer += ` The selected forecast location is ${location}.`;
  }

  const missingInformation = missingForTopic(topicId, request);
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

export function generateChatResponse(request: ChatRequest): ChatResponse {
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
  );
}
