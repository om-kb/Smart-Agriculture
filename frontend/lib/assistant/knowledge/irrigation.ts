import { createKnowledgeEntry } from "./entry.ts";
import { PMKSY_PORTAL } from "./references.ts";

export const irrigationKnowledge = [
  createKnowledgeEntry({
    id: "irrigation.general",
    category: "irrigation",
    title: "General irrigation considerations",
    supportedPatterns: ["irrigation advice", "when should i irrigate", "how to decide irrigation", "should i water my crop", "should i irrigate", "irrigate tomorrow", "irrigation after rain", "rainfall before irrigation", "should i irrigate after rain", "should i consider irrigating tomorrow"],
    synonyms: ["watering advice", "water my field", "consider irrigation tomorrow"],
    keywords: ["irrigation", "irrigate", "water", "watering"],
    answer:
      "I cannot determine an irrigation need without field conditions. Consider the crop and growth stage, root-zone soil moisture, recent rain and a local forecast, soil drainage, and available water. Avoid relying on a fixed calendar alone; share those details for a more relevant general discussion.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["What crop and growth stage are you growing?", "What is the soil type and recent rainfall?", "Do you have a local rainfall forecast?"],
    references: [PMKSY_PORTAL],
    verificationStatus: "unverified-general-guidance",
  }),
  createKnowledgeEntry({
    id: "irrigation.overwatering",
    category: "irrigation",
    title: "Overwatering risks",
    supportedPatterns: ["signs of overwatering", "risks of too much irrigation", "can overwatering harm crops", "too much water in field"],
    synonyms: ["waterlogging from irrigation", "excess watering"],
    keywords: ["overwatering", "waterlogging", "excess", "too much water"],
    answer:
      "Excess water can leave some crop roots short of air and may increase waterlogging or disease pressure. Signs vary by crop and can resemble other stresses, so do not diagnose from a single symptom. Check soil and drainage, and ask a local extension expert if crop damage is progressing.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["What crop and symptoms are you seeing?", "Does water remain standing in the field?"],
  }),
  createKnowledgeEntry({
    id: "irrigation.drainage",
    category: "irrigation",
    title: "Field drainage",
    supportedPatterns: ["improve field drainage", "remove standing water from field", "drainage for farms", "water is standing in my field"],
    synonyms: ["field waterlogging", "poor drainage"],
    keywords: ["drainage", "standing water", "waterlogging"],
    answer:
      "First identify where and when water accumulates and whether there is a safe, permitted outlet. Keep field channels clear where appropriate, but avoid diverting water onto neighboring land or into restricted waterways. Persistent waterlogging needs locally suitable drainage advice based on soil, slope, and crop.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["What crop and soil type are involved?", "How long does water remain after rain?"],
  }),
  createKnowledgeEntry({
    id: "irrigation.methods",
    category: "irrigation",
    title: "Irrigation methods",
    supportedPatterns: ["irrigation methods for farms", "compare drip and sprinkler irrigation", "which irrigation method", "types of irrigation"],
    synonyms: ["micro irrigation", "drip versus sprinkler"],
    keywords: ["drip", "sprinkler", "method", "irrigation"],
    answer:
      "Surface, sprinkler, and drip systems have different costs, maintenance needs, water sources, field layouts, and crop suitability. Drip and sprinkler systems are promoted in government water-efficiency programs, but the best choice depends on a local technical and financial assessment.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["What crop, field size, and water source do you have?", "Would you like general water-conservation practices?"],
    references: [PMKSY_PORTAL],
    verificationStatus: "official-overview-linked",
  }),
  createKnowledgeEntry({
    id: "irrigation.soil-moisture",
    category: "irrigation",
    title: "Checking soil moisture",
    supportedPatterns: ["check soil moisture in field", "how to know soil needs water", "test field soil moisture", "soil moisture check"],
    synonyms: ["is my soil dry", "check if crop needs water"],
    keywords: ["moisture", "soil", "dry", "water"],
    answer:
      "Check moisture below the dry surface in the crop's active root area at more than one representative spot. Compare the feel and condition with the crop's stage and recent weather. This is only a field check, not a calibrated measurement, and it does not establish an exact irrigation amount.",
    cropOrSoilCategory: "general",
    followUpQuestions: ["What crop and growth stage are you checking?", "What soil type is in the field?"],
  }),
] as const;
