import { createKnowledgeEntry } from "./entry.ts";

export const cropKnowledge = [
  createKnowledgeEntry({
    id: "crop.rice",
    category: "crop",
    title: "Rice",
    supportedPatterns: ["grow rice", "rice crop information", "paddy farming", "rice cultivation basics"],
    synonyms: ["paddy"],
    keywords: ["rice", "paddy"],
    answer:
      "Rice management varies with variety, season, water availability, soil, and the local production system. Use locally recommended seed and planting practices, monitor water and crop condition, and seek regional guidance for sowing dates, nutrient needs, or pest issues. I cannot give a district-specific calendar or yield promise.",
    cropOrSoilCategory: "rice",
    followUpQuestions: ["Which rice season and growth stage are you asking about?", "What is your water source and soil type?"],
  }),
  createKnowledgeEntry({
    id: "crop.wheat",
    category: "crop",
    title: "Wheat",
    supportedPatterns: ["grow wheat", "wheat crop information", "wheat cultivation basics", "wheat farming"],
    synonyms: ["gehun"],
    keywords: ["wheat", "gehun"],
    answer:
      "Wheat choices and management depend on local climate, sowing window, variety, soil, and water access. Use seed and crop-care guidance from your state agricultural university or extension service. I cannot infer your local sowing date, fertilizer requirement, or expected yield without verified regional guidance.",
    cropOrSoilCategory: "wheat",
    followUpQuestions: ["What state and sowing period are you considering?", "What growth stage is the crop in?"],
  }),
  createKnowledgeEntry({
    id: "crop.maize",
    category: "crop",
    title: "Maize",
    supportedPatterns: ["grow maize", "maize crop information", "corn cultivation basics", "maize farming"],
    synonyms: ["corn"],
    keywords: ["maize", "corn"],
    answer:
      "Maize management depends on purpose, hybrid or variety, planting window, soil, rainfall, and growth stage. Use locally tested seed and regional extension guidance, especially for planting and nutrient decisions. I cannot predict yield or prescribe inputs from crop name alone.",
    cropOrSoilCategory: "maize",
    followUpQuestions: ["Is the maize for grain, fodder, or another use?", "What growth stage and soil type do you have?"],
  }),
  createKnowledgeEntry({
    id: "crop.cotton",
    category: "crop",
    title: "Cotton",
    supportedPatterns: ["grow cotton", "cotton crop information", "cotton cultivation basics", "cotton farming"],
    keywords: ["cotton", "boll"],
    answer:
      "Cotton variety and management depend on local conditions, planting time, soil, water, and pest pressure. Monitor the crop regularly and use integrated pest-management guidance from local agricultural extension. Follow product labels and local rules; I do not provide chemical dosages or diagnose pest damage from text.",
    cropOrSoilCategory: "cotton",
    followUpQuestions: ["What growth stage is the cotton in?", "Are you asking about general care or a specific observed problem?"],
  }),
  createKnowledgeEntry({
    id: "crop.sugarcane",
    category: "crop",
    title: "Sugarcane",
    supportedPatterns: ["grow sugarcane", "sugarcane crop information", "sugarcane cultivation basics", "sugarcane farming"],
    synonyms: ["sugar cane"],
    keywords: ["sugarcane", "cane"],
    answer:
      "Sugarcane management is long-duration and depends on variety, planting method, local climate, soil, water supply, and crop stage. Use regional recommendations for planting material, nutrient management, and harvest timing. I cannot prescribe an irrigation or input schedule without locally verified crop guidance.",
    cropOrSoilCategory: "sugarcane",
    followUpQuestions: ["Is this a new planting or ratoon crop?", "What growth stage and water source do you have?"],
  }),
  createKnowledgeEntry({
    id: "crop.groundnut",
    category: "crop",
    title: "Groundnut",
    supportedPatterns: ["grow groundnut", "groundnut crop information", "peanut cultivation basics", "groundnut farming"],
    synonyms: ["peanut"],
    keywords: ["groundnut", "peanut"],
    answer:
      "Groundnut performance depends on variety, soil structure and drainage, season, rainfall, and crop stage. Consult local guidance for sowing and nutrient decisions, and avoid waterlogging where possible. I cannot infer suitability or expected yield from crop name alone.",
    cropOrSoilCategory: "groundnut",
    followUpQuestions: ["What season and soil type are you considering?", "What growth stage is the crop in?"],
  }),
  createKnowledgeEntry({
    id: "crop.tomato",
    category: "crop",
    title: "Tomato",
    supportedPatterns: ["grow tomato", "tomato crop information", "tomato cultivation basics", "tomato farming"],
    synonyms: ["tomatoes"],
    keywords: ["tomato"],
    answer:
      "Tomato choices and care depend on variety, local season, soil, water, and growth stage. Use regionally appropriate seed and extension advice. Keep monitoring plants, but do not treat symptoms as a diagnosis; several causes can look alike. I do not provide pesticide dosages.",
    cropOrSoilCategory: "tomato",
    followUpQuestions: ["Are you planning a crop or caring for an existing one?", "What growth stage and soil type do you have?"],
  }),
  createKnowledgeEntry({
    id: "crop.potato",
    category: "crop",
    title: "Potato",
    supportedPatterns: ["grow potato", "potato crop information", "potato cultivation basics", "potato farming"],
    synonyms: ["potatoes"],
    keywords: ["potato"],
    answer:
      "Potato management depends on variety, season, seed-tuber quality, soil, drainage, and local disease pressure. Use certified or locally recommended planting material where available and seek regional advice for timing and crop protection. I cannot guarantee suitability or diagnose disease from text.",
    cropOrSoilCategory: "potato",
    followUpQuestions: ["What state and season are you considering?", "Are you planning planting or managing an existing crop?"],
  }),
  createKnowledgeEntry({
    id: "crop.suitability",
    category: "crop",
    title: "Crop suitability factors",
    supportedPatterns: ["which crop is suitable", "choose a crop for my farm", "crop suitability for my land", "what crop should i grow"],
    synonyms: ["best crop for my field", "crop selection"],
    keywords: ["suitable", "choose", "crop", "land"],
    answer:
      "Crop suitability depends on local climate and season, soil test and drainage, reliable water, seed availability, farm resources, market access, and risk tolerance. I cannot recommend a guaranteed best crop or infer district-specific suitability. A local agricultural extension office can compare options using your field details.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["What state or district, season, soil type, and water source are relevant?", "Which crops are you comparing?"],
  }),
] as const;
