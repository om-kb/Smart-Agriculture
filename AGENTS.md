# Codex contribution rules
- Protect `main`; never push directly to it.
- Work on `feature/*` or `dev` as appropriate and use pull requests.
- Use Next.js App Router, React, strict TypeScript, and Tailwind CSS; keep backend functionality in Next.js Route Handlers.
- Keep route handlers focused and add tests for new behavior.
- Deploy through Netlify; do not add Python, FastAPI, a database, or LLM API integrations unless the project requirements change.
- Read configuration from environment variables when needed; never commit secrets.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` from `frontend`.
- Explain impact and migration before introducing breaking changes.
