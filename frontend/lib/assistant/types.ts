export const TOPIC_IDS = [
  "weather.current",
  "weather.forecast",
  "weather.heat",
  "weather.wind",
  "weather.uncertainty",
  "irrigation.general",
  "irrigation.overwatering",
  "irrigation.drainage",
  "irrigation.methods",
  "irrigation.soil-moisture",
  "crop.rice",
  "crop.wheat",
  "crop.maize",
  "crop.cotton",
  "crop.sugarcane",
  "crop.groundnut",
  "crop.tomato",
  "crop.potato",
  "crop.suitability",
  "soil.sandy",
  "soil.clay",
  "soil.loamy",
  "soil.black",
  "soil.red",
  "soil.alluvial",
  "soil.testing",
  "practice.sowing-season",
  "practice.crop-rotation",
  "practice.mulching",
  "practice.water-conservation",
  "practice.pest-prevention",
  "practice.fertilizer-safety",
  "help.location",
  "help.farm-profile",
  "help.weather-and-advisories",
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];
export type KnowledgeCategory =
  | "weather"
  | "irrigation"
  | "crop"
  | "soil"
  | "practice"
  | "application";
export type CropName =
  | "rice"
  | "wheat"
  | "maize"
  | "cotton"
  | "sugarcane"
  | "groundnut"
  | "tomato"
  | "potato";
export type SoilName =
  | "sandy"
  | "clay"
  | "loamy"
  | "black"
  | "red"
  | "alluvial";

export interface SourceReference {
  label: string;
  url?: string;
  note: string;
}

export interface KnowledgeEntry {
  id: TopicId;
  topicId: TopicId;
  category: KnowledgeCategory;
  title: string;
  supportedPatterns: readonly string[];
  synonyms: readonly string[];
  keywords: readonly string[];
  answer: string;
  cropOrSoilCategory: CropName | SoilName | "general" | null;
  followUpQuestions: readonly string[];
  references: readonly SourceReference[];
  verificationStatus:
    | "official-overview-linked"
    | "unverified-general-guidance";
  lastReviewed: "2026-10-15";
}

export interface ExtractedEntities {
  crops: CropName[];
  soilTypes: SoilName[];
  weatherConcepts: string[];
}

export interface IntentClassification {
  status: "supported" | "ambiguous" | "unsupported" | "empty" | "too_long";
  intent: TopicId | null;
  confidence: number;
  confidenceLabel: "high" | "moderate" | "low";
  candidates: TopicId[];
  entities: ExtractedEntities;
}

export interface FarmContext {
  crop?: string;
  soilType?: string;
  irrigationMethod?: string;
  growthStage?: string;
  farmSize?: number;
  location?: string;
}

export interface WeatherContext {
  temperatureC?: number;
  humidityPercent?: number;
  rainfallForecastMm?: number;
  windSpeedKmh?: number;
  forecastDate?: string;
  source?: string;
  fetchedAt?: string;
}

export interface LocationContext {
  displayName?: string;
  state?: string;
  district?: string;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  farmContext?: FarmContext;
  weatherContext?: WeatherContext;
  locationContext?: LocationContext;
  recentTurns?: ConversationTurn[];
}

export type ResponseBasis =
  | "general-guidance"
  | "weather-context"
  | "contextual-follow-up"
  | "clarification"
  | "fallback";

export interface ChatResponse {
  answer: string;
  matchedIntent: TopicId | null;
  confidence: number;
  confidenceLabel: "high" | "moderate" | "low";
  topicId: TopicId | null;
  verificationStatus: KnowledgeEntry["verificationStatus"] | null;
  sources: SourceReference[];
  suggestedFollowUps: string[];
  missingInformation: string[];
  basis: ResponseBasis;
}

export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
  createdAt: string;
}
