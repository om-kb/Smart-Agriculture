# Architecture

The application is a Next.js App Router project using React, strict TypeScript, and Tailwind CSS. Server-side functionality is implemented as Next.js Route Handlers under `frontend/app/api/`; the health check is available at `/api/health`.

Netlify hosts the Next.js application using the configuration in `netlify.toml`. There is no separate Python/FastAPI backend, database, or LLM API integration. Keep future backend behavior in Route Handlers and add tests for its observable behavior.
