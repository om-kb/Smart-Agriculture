# Smart Agriculture Advisor

A farmer-friendly platform for Indian agriculture. This repository currently provides a minimal Next.js homepage and health endpoint as the foundation for future development.

## Stack and structure

- `frontend/`: Next.js App Router, React, strict TypeScript, Tailwind CSS, ESLint, and tests
- `netlify.toml`: Netlify build and Next.js runtime configuration
- `.github/`: pull-request CI; `docs/` and `scripts/`: supporting material

Backend functionality uses Next.js Route Handlers. There is no separate Python service, database, or LLM API integration.

## Prerequisites and setup

Install Git, Node.js 24+, and pnpm 11. Clone the repository and run `git switch dev`.

From the repository root:

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000.

The health endpoint is available at http://localhost:3000/api/health and returns:

```json
{"status":"ok","service":"smart-agriculture"}
```

## Location setup

Open `/setup` to select a state or union territory and district. Sub-district and development block selections are optional; selections are saved in this browser and shown on `/dashboard`.

The Next.js Route Handlers proxy the public, keyless [India LGD API](https://india-lgd-index-api.vercel.app/) and cache successful location data for one hour:

- `GET /api/locations/states`
- `GET /api/locations/districts?state={code}`
- `GET /api/locations/subdistricts?district={code}`
- `GET /api/locations/blocks?district={code}`

The upstream dataset is based on the Ministry of Panchayati Raj's Local Government Directory and is provided under GODL-India. The service keeps its attribution in the upstream response.

Run all project checks from `frontend`:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Deployment

Connect the repository to Netlify and deploy the `dev` branch (or a feature branch) for previews. `netlify.toml` configures the Next.js build and Netlify Next.js runtime; no database or API secrets are required for the current application.

## Git workflow and contributions

Branch from `dev` into `feature/<name>` and open feature pull requests into `dev`; promote `dev` to `main` only through a separate validated pull request. Never push directly to `main`. See [AGENTS.md](AGENTS.md) for contribution rules.
