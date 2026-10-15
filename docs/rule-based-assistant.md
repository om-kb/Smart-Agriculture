# Rule-based assistant: technical guide

## Request path

`POST /api/assistant/chat` validates a JSON request before calling the independent TypeScript modules in `frontend/lib/assistant/`. The API has no database or inference provider. It accepts a message up to 500 characters, no more than ten recent user/assistant turns, and optional farm, location, and weather contexts. The full request body is capped at 20 KB. Chat content is not logged by the route.

The classifier normalizes Unicode and punctuation, compares supported phrases and synonyms, scores configured keywords, then applies a small one-edit matcher to longer tokens. Exact phrases score 0.90, synonyms 0.82, one-edit fuzzy matches 0.65, and keyword evidence scores from 0.34 upward. A score of 0.62 is required; close competing intents trigger a clarification. Scores are deterministic match-strength indicators, not probabilities.

## Follow-up behavior

The API accepts up to ten recent turns as role/content pairs. If a farmer replies with a supported crop name after an irrigation question, the engine associates the crop with the last supported irrigation intent and continues with general factors. It still requests rainfall, growth-stage, and field-condition details instead of deciding that irrigation is required. Ambiguous or unsupported messages receive a clear clarification or bounded-topic fallback. `verificationStatus` in each response distinguishes unverified general guidance from entries that link an official overview.

## Adding a knowledge topic

1. Add the topic ID to `TOPIC_IDS` in `types.ts`.
2. Add an entry in the appropriate `knowledge/*.ts` module via `createKnowledgeEntry`.
3. Provide narrow supported question patterns, synonyms, useful keywords, cautious answer text, category, follow-ups, source metadata, verification status, and review date.
4. Keep unverified general statements marked `unverified-general-guidance`. Only set `official-overview-linked` when an official source was checked and is actually relevant; include a note when a portal-level reference does not verify every claim.
5. Add classifier, retrieval, response, and safety tests. Check that similar topics clarify rather than overmatch, and that the answer does not invent context.

Do not add pesticide/fertilizer dosages, unsupported yield claims, disease diagnoses, or precise irrigation quantities. Prefer a clarification and local extension referral when evidence is insufficient.

## Context integration after feature merges

The classifier and response engine do not fetch weather or read profile storage. An application layer may validate the user's saved selections and pass them to the route:

- `farmContext`: `crop`, `soilType`, `irrigationMethod`, `growthStage`, `farmSize`, `location`.
- `locationContext`: `displayName`, `state`, `district`.
- `weatherContext`: `temperatureC`, `humidityPercent`, `rainfallForecastMm`, `windSpeedKmh`, `forecastDate`, `source`, `fetchedAt`.

Only pass values the user selected or the connected weather API returned. A weather provider and timestamp should accompany readings when available. The assistant identifies supplied values as context, not direct field measurements. If data is missing, stale, or unavailable, omit it and let the response explain the limitation. LGD administrative codes should remain in the location integration layer unless a future feature explicitly requires them here.

## Storage and localization

The browser stores at most 40 validated messages in localStorage. Invalid history is not restored. A user can clear the saved conversation. No chat transcript is sent to an external service. English is the only supported language in this release; add translated agricultural copy only after independent translation and topic verification.

Primary interface labels and prompts are collected in `copy.ts`; storage and API error messages remain with their respective modules. Agricultural answer text and matching vocabulary are grouped in the corresponding `knowledge/*.ts` modules. A future locale can provide parallel interface copy and separately reviewed knowledge entries without changing the classifier contract.
