import { createKnowledgeEntry } from "./entry.ts";
import { ICAR_PORTAL, PMKSY_PORTAL } from "./references.ts";

export const practiceKnowledge = [
  createKnowledgeEntry({
    id: "practice.sowing-season",
    category: "practice",
    title: "Sowing-season basics",
    supportedPatterns: ["when to sow crops", "sowing season basics", "best time to plant crops", "planting time for my crop"],
    synonyms: ["sowing calendar", "planting calendar"],
    keywords: ["sowing", "planting", "season", "calendar"],
    answer:
      "Sowing windows vary by crop, variety, state, season, rainfall onset, soil moisture, and local advisories. I do not have a verified district-specific calendar. Check your state agricultural university or extension service for the current local recommendation.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["Which crop, state or district, and season are you asking about?"],
  }),
  createKnowledgeEntry({
    id: "practice.crop-rotation",
    category: "practice",
    title: "Crop rotation",
    supportedPatterns: ["benefits of crop rotation", "how to rotate crops", "crop rotation plan", "why rotate crops"],
    synonyms: ["rotating crops", "crop sequence"],
    keywords: ["rotation", "rotate", "sequence"],
    answer:
      "Crop rotation plans should account for crop families, local pests and diseases, soil, water, market needs, and available seed. A planned sequence can diversify a farm, but the suitable sequence is location-specific; confirm choices with local extension guidance.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["Which crops have you grown in the last two seasons?", "What is your soil type and water source?"],
  }),
  createKnowledgeEntry({
    id: "practice.mulching",
    category: "practice",
    title: "Mulching",
    supportedPatterns: ["how to use mulch on farm", "benefits of mulching crops", "mulching practices", "mulch for soil moisture"],
    synonyms: ["soil cover", "crop residue cover"],
    keywords: ["mulch", "mulching", "cover"],
    answer:
      "Mulch can be organic or manufactured, and its suitability depends on crop, local pests, moisture, material availability, and safe handling. Use clean, suitable material and seek local advice about placement and timing. Do not burn crop residues where local rules prohibit it.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["Which crop and mulch material are you considering?"],
  }),
  createKnowledgeEntry({
    id: "practice.water-conservation",
    category: "practice",
    title: "Water conservation",
    supportedPatterns: ["save water on farm", "how can i save water on my farm", "water conservation practices", "reduce farm water use", "conserve irrigation water"],
    synonyms: ["water saving", "efficient water use"],
    keywords: ["conservation", "save water", "water use"],
    answer:
      "Water conservation options may include maintaining field channels, reducing avoidable leaks, matching irrigation to crop and field conditions, and assessing suitable micro-irrigation. Feasibility depends on the water source, soil, crop, energy, maintenance, and costs. Government of India's PMKSY portal describes water-management and micro-irrigation programs.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["What crop, water source, and irrigation system do you use?"],
    references: [PMKSY_PORTAL],
    verificationStatus: "official-overview-linked",
  }),
  createKnowledgeEntry({
    id: "practice.pest-prevention",
    category: "practice",
    title: "General pest prevention",
    supportedPatterns: ["prevent pests in crops", "general pest prevention", "integrated pest management basics", "reduce crop pest problems"],
    synonyms: ["pest control prevention", "crop pest prevention"],
    keywords: ["pest", "prevention", "integrated pest"],
    answer:
      "General prevention includes regular scouting, keeping field records, using locally recommended resistant varieties where available, and conserving beneficial organisms. Identify the pest before choosing control measures. I cannot diagnose crop damage from text or recommend chemical products or doses; consult local extension for a confirmed problem.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["Which crop and growth stage are involved?", "What did you observe, and has an extension expert identified the pest?"],
  }),
  createKnowledgeEntry({
    id: "practice.fertilizer-safety",
    category: "practice",
    title: "Fertilizer safety",
    supportedPatterns: ["fertilizer safety for farmers", "safe fertilizer handling", "how to use fertilizer safely", "fertilizer storage safety"],
    synonyms: ["safe use of fertilizers", "fertilizer precautions"],
    keywords: ["fertilizer", "safe", "handling", "storage"],
    answer:
      "Use only products permitted for the intended use, follow the label and local soil-test-based recommendation, wear the protective equipment stated on the label, and store products in their original labeled containers away from children, animals, food, and water. Never mix products unless the label or a qualified local adviser says it is safe. I do not prescribe fertilizer quantities.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["Do you have a soil-test recommendation?", "Are you asking about storage, handling, or a product label?"],
    references: [ICAR_PORTAL],
  }),
] as const;
