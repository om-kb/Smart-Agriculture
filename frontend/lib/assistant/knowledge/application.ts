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
      "Location setup is not connected to this assistant build yet. When the location selector is integrated, use its available search or administrative selection controls and verify the displayed place; place search results may be approximate.",
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
      "The farm-profile editor is not connected to this assistant build yet. When integrated, review optional crop, soil, irrigation, and growth-stage details before saving. Do not enter sensitive personal information.",
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
      "The weather dashboard is not connected to this assistant build yet. When integrated, weather cards should be read with their named provider, date, and units; they are not field measurements. Advisories are general screening prompts, not crop-specific instructions or official warnings.",
    cropOrSoilCategory: null,
    followUpQuestions: ["Which weather card or advisory are you looking at?", "Would you like a general forecast explanation?"],
  }),
] as const;
