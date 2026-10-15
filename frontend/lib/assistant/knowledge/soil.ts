import { createKnowledgeEntry } from "./entry.ts";
import { SOIL_HEALTH_PORTAL } from "./references.ts";

export const soilKnowledge = [
  createKnowledgeEntry({
    id: "soil.sandy",
    category: "soil",
    title: "Sandy soil",
    supportedPatterns: ["sandy soil management", "crops for sandy soil", "sandy field soil"],
    synonyms: ["sandy land"],
    keywords: ["sandy", "soil"],
    answer:
      "Sandy soils often drain quickly, but actual water and nutrient behavior varies with organic matter and local conditions. Base crop and amendment decisions on a soil test, field observations, and regional advice rather than soil name alone.",
    cropOrSoilCategory: "sandy",
    followUpQuestions: ["Do you have a soil-test report?", "Which crop and water source are you considering?"],
  }),
  createKnowledgeEntry({
    id: "soil.clay",
    category: "soil",
    title: "Clay soil",
    supportedPatterns: ["clay soil management", "crops for clay soil", "clayey field soil"],
    synonyms: ["heavy soil"],
    keywords: ["clay", "clayey", "soil"],
    answer:
      "Clay-rich soils can hold water and may be difficult to work when very wet or very dry, but behavior depends on structure, slope, and organic matter. Avoid working saturated soil where it can damage structure; use a soil test and local advice for crop selection and amendments.",
    cropOrSoilCategory: "clay",
    followUpQuestions: ["Does water drain slowly in the field?", "Do you have a recent soil test?"],
  }),
  createKnowledgeEntry({
    id: "soil.loamy",
    category: "soil",
    title: "Loamy soil",
    supportedPatterns: ["loamy soil management", "crops for loamy soil", "what is loamy soil"],
    synonyms: ["loam soil"],
    keywords: ["loamy", "loam", "soil"],
    answer:
      "“Loam” is a broad texture description and does not by itself establish fertility, drainage, or crop suitability. Use a laboratory soil test and observe the field; make nutrient or amendment decisions from measured results and local recommendations.",
    cropOrSoilCategory: "loamy",
    followUpQuestions: ["What does your soil-test report show?", "Which crop are you planning?"],
  }),
  createKnowledgeEntry({
    id: "soil.black",
    category: "soil",
    title: "Black soil",
    supportedPatterns: ["black soil management", "crops for black soil", "black cotton soil farming"],
    synonyms: ["regur soil"],
    keywords: ["black soil", "regur"],
    answer:
      "“Black soil” covers varied local soils; the label alone does not tell us the field's drainage, nutrient status, or suitability. Check a soil test and local field conditions, especially drainage and seasonal workability, before choosing crops or inputs.",
    cropOrSoilCategory: "black",
    followUpQuestions: ["Which crop and season are you considering?", "Do you have a soil-test report?"],
  }),
  createKnowledgeEntry({
    id: "soil.red",
    category: "soil",
    title: "Red soil",
    supportedPatterns: ["red soil management", "crops for red soil", "red earth farming"],
    synonyms: ["red earth"],
    keywords: ["red soil", "red earth"],
    answer:
      "“Red soil” is a broad field description, not a soil-test result. Texture, depth, organic matter, drainage, and nutrient status can differ substantially. Test the soil and use local extension guidance before making crop or fertilizer decisions.",
    cropOrSoilCategory: "red",
    followUpQuestions: ["What does your soil test report?", "Which crop and water source are you considering?"],
  }),
  createKnowledgeEntry({
    id: "soil.alluvial",
    category: "soil",
    title: "Alluvial soil",
    supportedPatterns: ["alluvial soil management", "crops for alluvial soil", "alluvial land farming"],
    synonyms: ["river plain soil"],
    keywords: ["alluvial", "soil"],
    answer:
      "Alluvial soils vary with location, sediment, texture, drainage, and field history. The soil name alone cannot establish crop suitability or nutrient needs. Use a soil test and advice from your local agricultural extension service.",
    cropOrSoilCategory: "alluvial",
    followUpQuestions: ["Do you have a recent soil test?", "What crop and season are you planning?"],
  }),
  createKnowledgeEntry({
    id: "soil.testing",
    category: "soil",
    title: "Soil testing",
    supportedPatterns: ["how to test farm soil", "soil testing for farmers", "get soil health card", "where to test soil"],
    synonyms: ["soil health test", "test my soil"],
    keywords: ["soil test", "soil testing", "soil health card"],
    answer:
      "A representative soil sample sent through an accepted local laboratory is more useful than judging nutrients by appearance. Follow the laboratory or extension office's sampling instructions, identify the field and crop plan, and interpret results with the supplied regional recommendation. The Government of India's Soil Health Card portal provides information about its program.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["Would you like help understanding a soil-test result?", "Which crop are you planning for the field?"],
    references: [SOIL_HEALTH_PORTAL],
    verificationStatus: "official-overview-linked",
  }),
] as const;
