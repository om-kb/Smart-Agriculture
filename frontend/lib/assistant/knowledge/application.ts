import { createKnowledgeEntry } from "./entry.ts";

export const applicationKnowledge = [
  createKnowledgeEntry({
    id: "help.location",
    category: "application",
    title: "Selecting a location",
    supportedPatterns: ["how to select my farm location", "choose location in app", "set farm location", "location setup help"],
    synonyms: ["change my location", "location picker"],
    keywords: ["location", "select", "setup"],
    answer:
      "Choose a state or union territory and district using the official LGD directory; sub-district and development block are optional and distinct. Then review the approximate forecast coordinates, confirm the administrative match, or enter a manual correction before continuing.",
    cropOrSoilCategory: null,
    followUpQuestions: ["Would you like help creating a farm profile?"],
  }),
  createKnowledgeEntry({
    id: "help.farm-profile",
    category: "application",
    title: "Creating a farm profile",
    supportedPatterns: ["create a farm profile", "how to add farm details", "edit my farm profile", "save crop details in app"],
    synonyms: ["farm profile help", "add my crop"],
    keywords: ["profile", "farm details", "save"],
    answer:
      "Open Farm profile to edit optional crop, soil, irrigation, growth-stage, farm-size, and sowing-date details. These values stay in this browser and are not sent to weather services; avoid entering sensitive personal information.",
    cropOrSoilCategory: null,
    followUpQuestions: ["How do I understand the weather cards?"],
  }),
  createKnowledgeEntry({
    id: "help.weather-and-advisories",
    category: "application",
    title: "Weather cards and agricultural advisories",
    supportedPatterns: ["understand weather cards", "interpret agricultural advisories", "what do dashboard weather cards mean", "how to read weather advisory"],
    synonyms: ["weather dashboard help", "advisory meaning"],
    keywords: ["cards", "dashboard", "advisory", "interpret"],
    answer:
      "Open Dashboard to review current conditions, the seven-day forecast, and general weather advisories. Read each card with its date and units; forecasts are not field measurements, and advisories are general screening prompts rather than crop-specific instructions or official warnings.",
    cropOrSoilCategory: null,
    followUpQuestions: ["Which weather card or advisory are you looking at?", "Would you like a general forecast explanation?"],
  }),
] as const;
