import type {
  KnowledgeCategory,
  KnowledgeEntry,
  TopicId,
} from "../types.ts";
import {
  APPLICATION_REFERENCE,
  ICAR_PORTAL,
  IMD_PORTAL,
} from "./references.ts";

interface EntryContent {
  id: TopicId;
  category: KnowledgeCategory;
  title: string;
  supportedPatterns: readonly string[];
  synonyms?: readonly string[];
  keywords?: readonly string[];
  answer: string;
  cropOrSoilCategory: KnowledgeEntry["cropOrSoilCategory"];
  followUpQuestions?: readonly string[];
  references?: KnowledgeEntry["references"];
  verificationStatus?: KnowledgeEntry["verificationStatus"];
}

export function createKnowledgeEntry(content: EntryContent): KnowledgeEntry {
  return {
    ...content,
    topicId: content.id,
    synonyms: content.synonyms ?? [],
    keywords: content.keywords ?? [],
    followUpQuestions: content.followUpQuestions ?? [],
    references:
      content.references ??
      (content.category === "application"
        ? [APPLICATION_REFERENCE]
        : content.category === "weather"
          ? [IMD_PORTAL]
          : [ICAR_PORTAL]),
    verificationStatus:
      content.verificationStatus ?? "unverified-general-guidance",
    lastReviewed: "2026-10-15",
  };
}
