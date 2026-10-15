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

Open-Meteo is credited in the dashboard. Weather and geocoding use Open-Meteo's free service and published attribution/licensing terms; do not use it for prohibited commercial workloads. Check the provider's current [terms](https://open-meteo.com/en/terms) before changing usage.

## Farm profile and privacy

Farm details and selected location are validated and serialized to localStorage; they are not sent to Open-Meteo. Only place-name searches and latitude/longitude forecast requests go to the respective Open-Meteo services through same-origin Next.js routes. Avoid entering personal or sensitive information in farm names.

## Weather advisory rules and limitations

The deterministic rules run locally from the fetched forecast. Current screening thresholds are: daily rain ≥50 mm (higher severity at ≥80 mm), forecast daily maximum temperature ≥38 °C, forecast daily maximum wind ≥40 km/h, complete seven-day forecast rainfall below 5 mm, and irrigation-awareness when current temperature is ≥30 °C with low forecast rain. Thresholds are configurable in `frontend/lib/advisory/engine.ts` and intentionally generic, not scientifically validated crop-specific limits. Low-rainfall advisories are withheld if any daily precipitation value is missing.

Advisories provide cautious precautions only. Forecasts are not field measurements, do not estimate soil moisture or exact irrigation needs, and do not diagnose crop health. They must not replace local agricultural experts or official warnings. Missing measurements remain unavailable rather than being presented as zero.

## Checks

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
