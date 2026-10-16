export const ENGLISH_ASSISTANT_COPY = {
  brandName: "Smart Agriculture Advisor",
  appSubtitle: "Farming assistant",
  languageBadge: "Rule-based · English",
  clearConversation: "Clear chat",
  sectionEyebrow: "Practical, careful guidance",
  heading: "Ask your farming question",
  intro:
    "Answers come from transparent rules and curated topic notes—not generative AI. Local conditions matter; the assistant will ask when key details are missing.",
  welcomeTitle: "Namaste! I can help with common farming topics.",
  welcomeDescription:
    "I cover weather concepts, irrigation, selected crops and soils, farming practices, and help using this app. When available, I use your saved location, farm profile, and forecast; I do not infer missing details.",
  safetyNotice:
    "General information only. For crop diagnosis, chemical use, or important field decisions, contact your local agricultural extension expert.",
  starterHeading: "Try asking",
  starterQuestions: [
    "Should I irrigate tomorrow?",
    "How do I test my soil?",
    "What should I consider before choosing a crop?",
    "How can I conserve water on my farm?",
  ],
  safeFallback: "Safe fallback",
  clarificationNeeded: "Clarification needed",
  ruleMatch: (label: string) => `Rule-based · ${label} match`,
  unverifiedGuidance: "Unverified general guidance",
  officialOverview: "Official overview linked",
  loading: "Checking the supported guidance…",
  inputLabel: "Your question",
  inputPlaceholder: "For example: How do I check soil moisture?",
  keyboardHint: "Enter to send · Shift+Enter for a new line",
  charactersRemaining: (count: number) => `${count} characters left`,
  sending: "Sending…",
  send: "Send",
  privacy:
    "Saved history stays in this browser. Messages are processed by this app and are not sent to external AI services.",
  apiFailure: "The assistant could not process this request. Please try again.",
  invalidResponse:
    "The assistant returned an unexpected response. Please try again.",
  networkFailure:
    "The assistant is temporarily unavailable. Your question remains in this conversation; please try again.",
  storageUnavailable:
    "Browser storage is unavailable; this conversation will not persist.",
  invalidSavedConversation:
    "Saved conversation data was invalid and was not restored.",
  storageSaveFailed:
    "This conversation is available until you leave this page, but browser storage could not save it.",
  storageClearFailed:
    "The visible conversation was cleared, but the browser could not confirm removal of saved data.",
} as const;
