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
2. **Location (`/setup`)** selects State/UT and district from the Indian Local Government Directory (LGD); sub-district and development block are optional and independent selections. State and district help form an Open-Meteo Geocoding query. Candidates that conflict with the selected state or district cannot be used; incomplete geocoding matches require explicit confirmation. Farmers can correct or enter coordinates manually and must confirm them.
3. **Farm profile (`/farm`)** optionally saves farm size, crop, soil type, irrigation method, growth stage, and sowing date.
4. **Weather dashboard (`/dashboard`)** fetches current weather and a seven-day forecast using the confirmed coordinates, shows the retained LGD codes, farm profile, and general deterministic weather advisories, and links to location/profile editing and the assistant.
5. **Assistant (`/assistant`)** receives only validated saved location/profile values and current weather fetched for the saved coordinates. It is deterministic, English-only, and does not call an LLM.

The shared navigation is available on every page. Location, confirmed coordinates, farm profile, and assistant history remain in the browser's localStorage. Only the place-name query and confirmed coordinates are sent to same-origin routes that call Open-Meteo; farm details and LGD codes are not sent to weather providers.

## Integrations and API routes

### Indian LGD

The Next.js routes proxy the keyless [India LGD API](https://india-lgd-index-api.vercel.app/) with typed response parsing, parameter validation, timeouts, friendly failures, and successful-response caching:

- `GET /api/locations/states`
- `GET /api/locations/districts?state={code}`
- `GET /api/locations/subdistricts?district={code}`
- `GET /api/locations/blocks?district={code}`

LGD codes are stored as administrative identifiers and are never interpreted as latitude or longitude. The chosen state, district, optional sub-district, and optional block are preserved with their official codes in the canonical weather-location record.

### Open-Meteo

- `GET /api/location-search?q={place}` validates the search query and proxies the [Geocoding API](https://open-meteo.com/en/docs/geocoding-api). Results are approximate. The setup page checks their reported state/district against the selected LGD area.
- `GET /api/weather?latitude={latitude}&longitude={longitude}` validates coordinates and proxies the [Forecast API](https://open-meteo.com/en/docs), returning normalized metric current conditions and up to seven daily forecasts. Shared cache lifetime is 30 minutes with stale-while-revalidate; provider requests time out after eight seconds.

Open-Meteo is credited in the dashboard. Review the provider's current [terms](https://open-meteo.com/en/terms) before changing usage. No API keys or environment variables are required.

### Rule-based farming assistant

`POST /api/assistant/chat` accepts a message (up to 500 characters), at most ten recent turns, and optional validated location, farm, and weather context. The streamed body is capped at 20 KB. Responses use rule classification and curated topic notes; successful responses are `Cache-Control: no-store`.

The assistant supports **35 topics** across weather, irrigation, eight crops, six soil types, farming practices, and application help. It asks clarifying questions for ambiguous or unsupported input and identifies missing context. When weather context is absent, it says that no validated weather data was available. When present, it reports only supplied measurements and identifies the provider and fetch time. Weather values are not field measurements, and contextual matching scores are not probabilities of agronomic correctness.

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

- Geocoding is approximate and administrative names may differ between the LGD and geocoder datasets. Conflicting matches are rejected; missing administrative data requires user confirmation, and manual coordinate entry remains available.
- Forecasts and generic advisory thresholds cannot measure field conditions, soil moisture, crop health, or irrigation needs; forecasts may be incomplete or unavailable.
- The assistant supports English only. Many agronomic notes are unverified general information; consult local agricultural extension staff and official warnings for high-impact decisions.
- Browser data is local to that browser/device and is not synchronized across devices. Avoid entering sensitive personal information.

## Contribution workflow

Develop in `feature/<name>` from `dev` and open a pull request targeting `dev`. Promote changes to `main` only through a separate validated pull request; never push directly to `main`. See [AGENTS.md](AGENTS.md).
