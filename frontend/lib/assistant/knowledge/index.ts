import type { KnowledgeEntry, TopicId } from "../types.ts";
import { applicationKnowledge } from "./application.ts";
import { cropKnowledge } from "./crops.ts";
import { irrigationKnowledge } from "./irrigation.ts";
import { practiceKnowledge } from "./practices.ts";
import { soilKnowledge } from "./soil.ts";
import { weatherKnowledge } from "./weather.ts";

export const KNOWLEDGE_BASE = [
  ...weatherKnowledge,
  ...irrigationKnowledge,
  ...cropKnowledge,
  ...soilKnowledge,
  ...practiceKnowledge,
  ...applicationKnowledge,
] satisfies readonly KnowledgeEntry[];

const entriesById = new Map<TopicId, KnowledgeEntry>(
  KNOWLEDGE_BASE.map((entry) => [entry.id, entry]),
);

export function getKnowledgeEntry(topicId: TopicId): KnowledgeEntry {
  const entry = entriesById.get(topicId);
  if (!entry) {
    throw new Error(`Missing assistant knowledge topic: ${topicId}`);
  }
  return entry;
}
