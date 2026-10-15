# Smart Agriculture Advisor

A mobile-friendly agriculture dashboard for India, with location-based weather, a seven-day forecast, a private browser-stored farm profile, and transparent general weather advisories.

## Technology

- Next.js App Router, React, strict TypeScript, Tailwind CSS
- Next.js Route Handlers for server-side Open-Meteo requests
- Open-Meteo Forecast API and Geocoding API (no API key)
- pnpm, ESLint, TypeScript, Node test runner, GitHub Actions
- Netlify hosting

No Python, separate backend, database, authentication, paid API, or LLM is used.

## Features and user flow

1. **Location setup (`/setup`)**: Search a town, city, or village using Open-Meteo Geocoding, or enter coordinates manually. GPS is never requested. Geocoded coordinates are labeled approximate; manually entered coordinates require user confirmation.
2. **Farm profile (`/farm`)**: Optionally save farm name/size, crop, soil, irrigation, growth stage, and sowing date.
3. **Weather dashboard (`/dashboard`)**: View current weather, seven-day forecast, farm overview, and deterministic weather-based field notes. Location and farm profile are stored only in the browser's localStorage.

Homepage → location setup → farm profile → dashboard. A farm profile can be skipped or edited later, and location/profile data can be reset or changed.

## Project structure

```text
frontend/
  app/
    api/location-search/     Geocoding Route Handler
    api/weather/             Weather Route Handler
    dashboard/               Weather and farm dashboard
    farm/                    Farm profile page
    setup/                   Weather location setup
  components/
    farm-profile-form.tsx    Browser-stored farm profile
    location-setup.tsx       Coordinate and place-name setup
    weather/                 Weather presentation helpers
  lib/
    advisory/                Deterministic, tested weather rules
    farm/                    Profile types, validation, browser persistence
    location/                Coordinate/geocoder types, validation, persistence
    weather/                 Open-Meteo service, response types, route validation
netlify.toml                 Netlify Next.js runtime configuration
```

The independent LGD selector is not included on `dev` and is not duplicated here. When integrated, its selected administrative place can be adapted into the reusable `FarmLocation` shape (display name, coordinates, optional state/district, source, and confirmation status). Weather remains keyed by validated coordinates.

## Install and run

Requirements: Git, Node.js 24+, pnpm 11.
A farmer-friendly Next.js application for Indian agriculture. The `/assistant` page provides deterministic, rule-based English answers to common farming and application questions. It uses no generative AI, paid inference API, Python service, database, authentication, or secrets.

## Technology and setup

- Next.js App Router, React, strict TypeScript, and Tailwind CSS
- Next.js Route Handlers for backend functionality
- pnpm, ESLint, TypeScript, and Node's test runner
- Netlify hosting

Requirements: Git, Node.js 24+, and pnpm 11.

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. No API keys or environment variables are required for the current integrations.

## API endpoints

`GET /api/weather?latitude={latitude}&longitude={longitude}` validates coordinate ranges and returns normalized metric current conditions and up to seven daily forecasts. It calls Open-Meteo's [Forecast API](https://open-meteo.com/en/docs) with `timezone=auto`, temperature in Celsius, wind in km/h, and precipitation in mm. Successful forecasts use a 30-minute shared cache with stale-while-revalidate; upstream requests time out after eight seconds.

`GET /api/location-search?q={place}` validates a 2–100 character search and calls the Open-Meteo [Geocoding API](https://open-meteo.com/en/docs/geocoding-api). Search results are approximate and are validated before they can be selected.

Quick checks while the development server is running:

```powershell
Invoke-RestMethod "http://localhost:3000/api/weather?latitude=19.99&longitude=73.78"
Invoke-RestMethod "http://localhost:3000/api/location-search?q=Nashik"
```

## Location setup

Open `/setup` to select a state or union territory and district. Sub-district and development block selections are optional; selections are saved in this browser and shown on `/dashboard`.

The Next.js Route Handlers proxy the public, keyless [India LGD API](https://india-lgd-index-api.vercel.app/) and cache successful location data for one hour:

- `GET /api/locations/states`
- `GET /api/locations/districts?state={code}`
- `GET /api/locations/subdistricts?district={code}`
- `GET /api/locations/blocks?district={code}`

The upstream dataset is based on the Ministry of Panchayati Raj's Local Government Directory and is provided under GODL-India. The service keeps its attribution in the upstream response.

Open-Meteo is credited in the dashboard. Weather and geocoding use Open-Meteo's free service and published attribution/licensing terms; do not use it for prohibited commercial workloads. Check the provider's current [terms](https://open-meteo.com/en/terms) before changing usage.

## Farm profile and privacy

Farm details and selected location are validated and serialized to localStorage; they are not sent to Open-Meteo. Only place-name searches and latitude/longitude forecast requests go to the respective Open-Meteo services through same-origin Next.js routes. Avoid entering personal or sensitive information in farm names.

## Weather advisory rules and limitations

The deterministic rules run locally from the fetched forecast. Current screening thresholds are: daily rain ≥50 mm (higher severity at ≥80 mm), forecast daily maximum temperature ≥38 °C, forecast daily maximum wind ≥40 km/h, complete seven-day forecast rainfall below 5 mm, and irrigation-awareness when current temperature is ≥30 °C with low forecast rain. Thresholds are configurable in `frontend/lib/advisory/engine.ts` and intentionally generic, not scientifically validated crop-specific limits. Low-rainfall advisories are withheld if any daily precipitation value is missing.

Advisories provide cautious precautions only. Forecasts are not field measurements, do not estimate soil moisture or exact irrigation needs, and do not diagnose crop health. They must not replace local agricultural experts or official warnings. Missing measurements remain unavailable rather than being presented as zero.

## Checks
Open http://localhost:3000, then select **Ask the farming assistant**. No API keys are required. The health endpoint is at `/api/health`.

## Assistant architecture

The chat page at `/assistant` sends a message and up to ten recent turns to `POST /api/assistant/chat`. The route validates message length, context types/ranges, history size, and request size, then calls pure TypeScript classification and response modules. Requests are not logged or forwarded to external AI services. The browser retains at most 40 validated conversation messages in localStorage; the user can clear them.

`frontend/lib/assistant/` contains:

- `copy.ts`: primary English interface labels and prompts, organized separately from topic content.
- `classifier.ts`: text normalization, phrase/synonym/weighted keyword matching, one-edit fuzzy matching, entity extraction, ambiguity handling, and deterministic match scores.
- `response.ts`: knowledge retrieval, missing-context prompts, contextual follow-ups, weather-context handling, and safe fallback answers.
- `validation.ts` and `route-handler.ts`: typed API validation and HTTP handling.
- `storage.ts`: conversation parsing, local persistence, and history limits.
- `knowledge/`: maintainable topic modules for weather, irrigation, crops, soil, farm practices, and application help.

There are **35 supported topics**: current weather; forecast/rainfall/seven-day outlook; heat; wind; forecast uncertainty; general irrigation; overwatering; drainage; methods; soil-moisture checks; rice; wheat; maize; cotton; sugarcane; groundnut; tomato; potato; crop-suitability factors; sandy, clay, loamy, black, red, and alluvial soil; soil testing; sowing-season basics; crop rotation; mulching; water conservation; pest prevention; fertilizer safety; location selection; farm profiles; and weather cards/advisories.

Example questions:

- “Should I irrigate tomorrow?”
- “What is the seven-day forecast?”
- “How do I check soil moisture?”
- “What should I consider before choosing a crop?”
- “How do I test my soil?”
- “How can I conserve water on my farm?”
- “How do I understand the weather cards?”

The supported crop topics are rice, wheat, maize, cotton, sugarcane, groundnut, tomato, and potato. English is supported; Hindi and other languages are not claimed as supported in this version.

## Intent matching and confidence

Inputs are Unicode-normalized, lowercased, and stripped of punctuation. Exact supported phrases score `0.90`, configured synonyms score `0.82`, distinctive fuzzy keyword matches score `0.65`, and keyword matches use deterministic weighted scores. The acceptance threshold is `0.62`; near-tied supported topics are presented as a clarification rather than guessed. Fuzzy matching permits one insertion, deletion, substitution, or adjacent transposition on sufficiently long words.

The returned score and `high` / `moderate` / `low` label describe **text-to-rule matching only**. They are not statistically calibrated probabilities and do not measure agronomic correctness.

## Knowledge, sources, and safety

Each typed knowledge entry contains its topic ID, supported patterns, answer, category, follow-up questions, source references, verification status, and review date. The ICAR, India Meteorological Department, Government of India Soil Health Card, and PMKSY portals are linked where relevant. Portal availability and high-level program descriptions were checked; most individual agronomic answer text is deliberately marked `unverified-general-guidance` because a topic-specific authoritative source has not been mapped and reviewed for each claim.

The assistant does not invent district-specific recommendations, diagnose crop disease, prescribe pesticide or fertilizer dosages, promise yields, or calculate irrigation quantities. It asks for missing crop, stage, soil, location, or weather context when relevant. Seek local agricultural extension guidance for high-impact decisions. This is general information, not a substitute for professional agronomy or official warnings.

### Weather and farm context contract

The endpoint accepts optional `weatherContext` fields for temperature (°C), humidity (%), forecast rainfall (mm), wind speed (km/h), forecast date, provider, and fetch time. The assistant reports only fields actually supplied, labels them as external context rather than field measurements, and says live weather is not connected when that context is absent.

Optional `farmContext` fields are crop, soil type, irrigation method, growth stage, farm size, and location. Optional `locationContext` fields are display name, state, and district. The assistant does not infer missing values. The LGD selector and weather/profile implementation are separate feature branches and are not duplicated here; after integration, pass validated selections through this contract from the application layer. Do not make the classifier call those services directly.

### Chat API example

Request:

```http
POST /api/assistant/chat
Content-Type: application/json
```

```json
{
  "message": "How do I test my soil?"
}
```

Response:

```json
{
  "answer": "A representative soil sample sent through an accepted local laboratory is more useful than judging nutrients by appearance. Follow the laboratory or extension office's sampling instructions, identify the field and crop plan, and interpret results with the supplied regional recommendation. The Government of India's Soil Health Card portal provides information about its program.",
  "matchedIntent": "soil.testing",
  "confidence": 0.82,
  "confidenceLabel": "moderate",
  "topicId": "soil.testing",
  "verificationStatus": "official-overview-linked",
  "sources": [
    {
      "label": "Government of India Soil Health Card portal",
      "url": "https://soilhealth.dac.gov.in/",
      "note": "Official soil-health resource; local laboratory procedures and recommendations may differ."
    }
  ],
  "suggestedFollowUps": [
    "Would you like help understanding a soil-test result?",
    "Which crop are you planning for the field?"
  ],
  "missingInformation": [],
  "basis": "general-guidance"
}
```

The exact answer, source list, and missing fields depend on the matched rule and supplied context. `verificationStatus` is either `unverified-general-guidance`, `official-overview-linked`, or `null` for a fallback; a linked portal does not imply every sentence is verified. Requests over 20 KB, messages over 500 characters, malformed JSON, invalid context, and histories over ten turns are rejected with safe client errors. Successful responses are `Cache-Control: no-store`.

## Checks and deployment

Run from `frontend/`:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Netlify deployment

Connect the GitHub repository to Netlify and deploy the desired branch. `netlify.toml` sets the frontend base directory and Next.js plugin. Do not enable static export: the weather and geocoding Route Handlers need the Netlify Next.js serverless runtime. No secrets are required for the current free APIs.

## Git workflow

Develop in `feature/<name>` and open pull requests into `dev`. Promote `dev` to `main` only through a separate validated pull request; never push directly to `main`. See [AGENTS.md](AGENTS.md).
