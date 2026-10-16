# Smart Agriculture Advisor

A farmer-friendly web application that combines official Indian administrative-area selection, confirmed forecast coordinates, a browser-stored farm profile, Open-Meteo weather and general advisories, and a deterministic English farming assistant.

## Architecture

- Next.js App Router, React, strict TypeScript, and Tailwind CSS
- Next.js Route Handlers for LGD, geocoding, weather, health, and assistant functionality
- Netlify hosting using the Next.js runtime configured in `netlify.toml`
- pnpm, ESLint, TypeScript, and Node's built-in test runner
- No Python, FastAPI, database, authentication, LLM API, or paid inference dependency

## Farmer journey

1. **Homepage (`/`)** links into setup and the assistant.
2. **Location (`/setup`)** selects State/UT and district from the Indian Local Government Directory (LGD); sub-district and development block are optional and independent selections. The selected state and district qualify a place-name search through OpenStreetMap Nominatim. Only exact state/district matches can be selected; farmers can instead enter coordinates manually and must confirm them.
3. **Farm profile (`/farm`)** optionally saves farm size, crop, soil type, irrigation method, growth stage, and sowing date.
4. **Weather dashboard (`/dashboard`)** fetches current weather and a seven-day forecast using the confirmed coordinates, shows the retained LGD codes, farm profile, and general deterministic weather advisories, and links to location/profile editing and the assistant.
5. **Assistant (`/assistant`)** receives only validated saved location/profile values and current weather fetched for the saved coordinates. It is deterministic, English-only, and does not call an LLM.

The shared navigation is available on every page. Location, confirmed coordinates, farm profile, and assistant history remain in the browser's localStorage. The area-qualified place-name query is sent to the same-origin Nominatim proxy; confirmed coordinates are sent to the Open-Meteo weather route. Farm details and LGD codes are not sent to external providers.

## Integrations and API routes

### Indian LGD

The Next.js routes proxy the keyless [India LGD API](https://india-lgd-index-api.vercel.app/) with typed response parsing, parameter validation, timeouts, friendly failures, and successful-response caching:

- `GET /api/locations/states`
- `GET /api/locations/districts?state={code}`
- `GET /api/locations/subdistricts?district={code}`
- `GET /api/locations/blocks?district={code}`

LGD codes are stored as administrative identifiers and are never interpreted as latitude or longitude. The chosen state, district, optional sub-district, and optional block are preserved with their official codes in the canonical weather-location record.

### Location search and Open-Meteo

- `GET /api/location-search?q={place}&district={district}&state={state}` validates the area-qualified query and proxies [OpenStreetMap Nominatim](https://nominatim.org/release-docs/latest/api/Search/). Results are filtered against the selected administrative area; only exact state/district matches are returned. Responses and upstream fetches are not cached, and requests are spaced by at least one second per warm service instance. The setup page provides visible [OpenStreetMap attribution](https://www.openstreetmap.org/copyright).
- `GET /api/weather?latitude={latitude}&longitude={longitude}` validates coordinates and proxies the [Forecast API](https://open-meteo.com/en/docs), returning normalized metric current conditions and up to seven daily forecasts. Shared cache lifetime is 30 minutes with stale-while-revalidate; provider requests time out after eight seconds.

Open-Meteo is credited in the dashboard. Review the providers' current [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) and [Open-Meteo terms](https://open-meteo.com/en/terms) before changing usage. No API keys or environment variables are required.

### Rule-based farming assistant

`POST /api/assistant/chat` accepts a message (up to 500 characters), at most ten recent turns, and optional validated location, farm, and weather context. The streamed body is capped at 20 KB. Responses use rule classification and curated topic notes; successful responses are `Cache-Control: no-store`.

The assistant supports **35 topics** across weather, irrigation, eight crops, six soil types, farming practices, and application help. It asks clarifying questions for ambiguous or unsupported input and identifies missing context. When weather context is absent, it says that no validated weather data was available. When present, it reports only supplied observations or the daily forecast for the requested local date, identifies the provider, and distinguishes forecast values from field measurements. Contextual matching scores are not probabilities of agronomic correctness.

Agronomic guidance is conservative and mostly marked unverified; official portal links do not mean each answer was independently verified. The assistant does not diagnose diseases or prescribe pesticide/fertilizer dosages, irrigation quantities, or crop-specific scientific conclusions.

## Local development and checks

Requirements: Git, Node.js 24+, and pnpm 11.

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. Run the automated checks from `frontend/`:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Tests use deterministic fixtures/mocks and do not depend on live external APIs. Playwright is not installed; see [the integration guide](docs/integration-guide.md) for a manual end-to-end checklist.

## Netlify deployment

Connect the repository to Netlify and deploy the intended branch. `netlify.toml` configures the frontend base directory and Next.js runtime. Do not enable static export: Next.js Route Handlers require server execution. No secrets or account-level deployment changes are required for the current integrations.

## Known limitations

- Geocoding is approximate and administrative names may differ between the LGD and geocoder datasets. Conflicting or ambiguous matches cannot be selected. Manual coordinates are checked against a broad India geographic envelope and require confirmation, but this does not prove they lie inside the selected district.
- Nominatim requests are not cached and are rate-spaced per warm service instance. Netlify serverless instances do not share an application-wide rate limiter; keep place-name searches user-triggered and low-volume in accordance with the public service policy.
- Forecasts and generic advisory thresholds cannot measure field conditions, soil moisture, crop health, or irrigation needs; forecasts may be incomplete or unavailable.
- The assistant supports English only. Many agronomic notes are unverified general information; consult local agricultural extension staff and official warnings for high-impact decisions.
- Browser data is local to that browser/device and is not synchronized across devices. Avoid entering sensitive personal information.

## Contribution workflow

Develop in `feature/<name>` from `dev` and open a pull request targeting `dev`. Promote changes to `main` only through a separate validated pull request; never push directly to `main`. See [AGENTS.md](AGENTS.md).
