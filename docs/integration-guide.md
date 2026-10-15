# Phase 5 integration guide

## Branch integration

The integration branch was created from the latest `origin/dev`, then merged the three independent feature branches without changing their refs or pull requests.

| Conflict | Resolution |
| --- | --- |
| `frontend/app/setup/page.tsx` had two competing location flows. | Kept `/setup` as the single canonical page and replaced the competing components with `FarmLocationSetup`, combining cascading LGD selections, Open-Meteo coordinate resolution, manual correction, and explicit confirmation. |
| `frontend/app/dashboard/page.tsx` was a simple LGD summary on one branch and the weather/farm dashboard on another. | Kept the full weather dashboard, added the selected LGD area/codes, and linked the existing assistant. The obsolete LGD-only dashboard was not retained. |
| `frontend/app/page.tsx` had separate setup and assistant homepages. | Combined them into a single farmer-oriented entry point with setup as the primary action and an assistant link. |
| `frontend/package.json` had separate test selectors. | Combined the LGD, weather, farm, advisory, assistant, and integration-context tests into the existing `pnpm test` script; no dependencies were added. |
| `README.md` described separate, mutually exclusive features. | Replaced it with the integrated architecture, journey, service boundaries, limitations, checks, and deployment instructions. |

The duplicated location page components were removed only after `/setup` was switched to the combined component and their imports were confirmed unused. The Netlify configuration and all three original PRs/branches were left untouched.

## Location to forecast

`FarmLocationSetup` loads the LGD state list, then fetches districts for the selected state. Changing state clears district, sub-district, block, and coordinates. Changing district clears its child selections and coordinates; sub-district and development block remain distinct optional siblings filtered by district.

The selected district and state prefill the Open-Meteo Geocoding search. The result's reported state and district are normalized and compared with the selected LGD names. A known mismatch cannot be selected; a result with missing administrative details is marked ambiguous and requires the same explicit user confirmation as any other coordinate selection. The user may manually correct either coordinate or enter both coordinates directly. Coordinates must be geographically valid and confirmed before continuing.

The confirmed coordinates and the full LGD selection—including official codes—are stored together in the validated `smart-agriculture-weather-location` record. Existing LGD-only saved selections are read as a migration fallback, but new selections use this combined record. Codes are never used as coordinates. The dashboard displays the selected administrative area and coordinate precision; weather requests use only the confirmed latitude and longitude.

## Farm and weather state

`frontend/lib/location/validation.ts` validates coordinates and the optional embedded LGD area before `deserializeLocation` returns a value. `frontend/lib/farm/storage.ts` validates the complete farm profile before the dashboard or assistant uses it. Both browser stores notify same-tab subscribers through custom events and other tabs through the browser `storage` event.

The dashboard requests `GET /api/weather` for the confirmed coordinates. The route validates input, calls the Open-Meteo Forecast API through `frontend/lib/weather/service.ts`, normalizes units, retains unavailable readings as `null`, and applies bounded timeouts and shared caching. The dashboard validates the returned shape before rendering metrics, seven daily forecast cards, and deterministic advisory rules. An unavailable measurement displays as unavailable, never as a fabricated zero.

The advisory engine uses generic weather thresholds documented in the README. These are screening prompts, not validated crop-specific or field-measurement conclusions.

## Weather and farm context to assistant

The `/assistant` page independently reads the validated combined location and farm profile, then requests weather for the saved coordinates. `frontend/lib/assistant/integration-context.ts` maps only present values into the existing optional `locationContext`, `farmContext`, and `weatherContext` API fields:

- Location display name, state, and district come from the saved confirmed location/LGD area.
- Crop, soil, irrigation, growth stage, and farm size come from the validated farm profile.
- Current temperature, humidity, and wind come from the normalized current forecast when present.
- Rainfall and forecast date come from the first daily record after the provider's current local date; if that date/value is missing, the field is omitted rather than guessed.
- Provider name and fetch timestamp accompany supplied weather data.

`POST /api/assistant/chat` revalidates all request fields and retains the existing body/history bounds. The deterministic response generator uses supplied weather only, answers direct saved-crop/soil questions from farm context, preserves follow-ups and safe fallbacks, and reports when weather data was unavailable. The assistant does not query storage, LGD, Open-Meteo, or an LLM from the classifier/response modules.

## Extending the application safely

1. Keep API handlers thin; put upstream parsing, validation, timeouts, and safe error mapping in their service modules.
2. Extend the shared location and farm types with matching runtime validation and tests before using new persisted fields.
3. Keep sub-district and development-block identifiers independent; only use documented LGD relationships.
4. Do not derive coordinates from LGD codes or treat a geocoder label as a verified farm centroid. Keep explicit confirmation and manual correction.
5. Preserve missing values as `null`/omitted fields. Add tests that ensure incomplete provider responses do not generate values or advisories.
6. Pass validated context into the assistant API; keep rules and topic notes deterministic and conservative. Add a topic reachability test whenever the knowledge base changes.
7. Keep third-party data attribution visible and recheck service terms before materially changing request volume or use.
8. Preserve the Netlify Next.js runtime; do not configure static export while Route Handlers are required.

## Automated testing and manual checklist

`pnpm test` uses local fixtures and mocks and does not rely on live LGD or Open-Meteo availability. There is no Playwright dependency or browser E2E suite in this repository, so browser automation was not run. The browser-based checklist is:

- [ ] Open the homepage and follow the primary setup link.
- [ ] Choose a state; verify the district list loads. Change state and ensure all child selections and coordinates reset.
- [ ] Choose a district; verify sub-district and development-block lists load independently. Continue without either optional selection.
- [ ] Search using the prefilled district/state; verify matching results can be selected, a conflicting state/district cannot be selected, and an ambiguous result requires confirmation.
- [ ] Manually adjust a geocoded coordinate and confirm it; separately try invalid/out-of-range coordinates and ensure they cannot be saved.
- [ ] Continue to `/farm`; save a crop, soil, irrigation method, growth stage, and farm size, then reload and edit the profile.
- [ ] Open `/dashboard`; verify the LGD codes and coordinate precision, current weather, seven-day forecast, profile summary, source attribution, advisories, and unavailable/error states.
- [ ] Open `/assistant`; confirm it loads profile/location context and actual weather when available. Ask about current weather, tomorrow's rain, saved crop, saved soil, irrigation, and an unsupported question.
- [ ] Reload and verify location, farm profile, and conversation history persist. Clear assistant history and verify it is removed.
- [ ] Test with a malformed or unavailable localStorage value and with unavailable upstream APIs; ensure the UI fails safely without displaying fabricated weather.
- [ ] Visit `/api/health` and confirm the healthy response.
