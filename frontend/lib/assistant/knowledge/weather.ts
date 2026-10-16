import { createKnowledgeEntry } from "./entry.ts";

export const weatherKnowledge = [
  createKnowledgeEntry({
    id: "weather.current",
    category: "weather",
    title: "Current weather",
    supportedPatterns: [
      "current weather",
      "weather right now",
      "temperature now",
      "what s the weather here",
      "what is the weather here",
      "weather here",
      "local weather",
    ],
    synonyms: ["today weather", "what is the weather"],
    keywords: ["temperature", "humidity", "weather"],
    answer:
      "I can only report current conditions when a weather context is supplied to this chat. Weather data is a forecast or observation from its named source, not a measurement from your field.",
    cropOrSoilCategory: null,
    followUpQuestions: ["What is tomorrow's forecast?", "How should I read the weather cards?"],
  }),
  createKnowledgeEntry({
    id: "weather.forecast",
    category: "weather",
    title: "Forecast, rainfall, and seven-day outlook",
    supportedPatterns: ["weather tomorrow", "weather forecast", "rain forecast", "rainfall forecast", "expected rainfall", "how much rain", "seven day forecast", "7 day weather", "will it rain", "forecast for tomorrow", "will it rain today", "will it rain tomorrow", "will it rain the day after tomorrow", "rain today", "rain tomorrow", "rain day after tomorrow", "rain on"],
    synonyms: ["rain prediction", "weekly weather", "expected rain", "tomorrows weather", "rain tonight"],
    keywords: ["forecast", "rainfall", "tomorrow", "rain", "weekly"],
    answer:
      "I can summarize forecast values only when forecast context is supplied. Rain forecasts are uncertain and do not confirm how much rain will reach a particular field.",
    cropOrSoilCategory: null,
    followUpQuestions: ["What crop and growth stage are you asking about?", "How should I consider rainfall before irrigation?"],
  }),
  createKnowledgeEntry({
    id: "weather.heat",
    category: "weather",
    title: "High-temperature precautions",
    supportedPatterns: ["heat precautions for crops", "protect crops from heat", "high temperature precautions", "heat stress in crops"],
    synonyms: ["hot weather crop care", "heat wave crops"],
    keywords: ["heat", "hot", "temperature", "crops"],
    answer:
      "During hot conditions, monitor crops and workers for heat stress, avoid unnecessary field work in the hottest part of the day, and follow local advisories. Irrigation timing depends on crop stage, soil moisture, water availability, and the local forecast; I cannot prescribe a schedule from temperature alone.",
    cropOrSoilCategory: null,
    followUpQuestions: ["What crop and growth stage do you have?", "Is a local heat warning in effect?"],
  }),
  createKnowledgeEntry({
    id: "weather.wind",
    category: "weather",
    title: "Strong-wind precautions",
    supportedPatterns: ["strong wind precautions", "strong winds", "protect crops from wind", "wind damage crops", "high wind crop safety"],
    synonyms: ["windy weather precautions", "storm wind crops"],
    keywords: ["wind", "gust", "storm"],
    answer:
      "Strong winds can increase lodging or damage risk for some crops and structures. Secure loose equipment where safe, avoid applying spray in unsuitable wind, and follow official severe-weather guidance. Risk depends on crop, growth stage, and local conditions.",
    cropOrSoilCategory: null,
    followUpQuestions: ["Which crop and growth stage are you concerned about?", "Is there an official local warning?"],
  }),
  createKnowledgeEntry({
    id: "weather.uncertainty",
    category: "weather",
    title: "Weather uncertainty",
    supportedPatterns: ["weather forecast uncertainty", "weather uncertainty", "how accurate is the forecast", "forecast confidence", "weather predictions reliable"],
    synonyms: ["forecast may change", "weather can change"],
    keywords: ["uncertain", "accuracy", "reliable", "confidence"],
    answer:
      "Forecasts are estimates, not guarantees. Uncertainty generally increases farther into the future and can vary by location and weather situation. Check updated forecasts and official local warnings before making high-impact field decisions.",
    cropOrSoilCategory: null,
    followUpQuestions: ["Would you like a general rainfall or irrigation overview?", "How do I understand the weather cards?"],
  }),
] as const;
