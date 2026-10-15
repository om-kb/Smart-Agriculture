# Codex contribution rules
- Protect `main`; never push directly to it.
- Work on `feature/*` or `dev` as appropriate and use pull requests.
- Follow the existing monorepo architecture.
- Keep API integrations in `backend/app/services/` and routes thin.
- Read configuration from environment variables; never commit secrets.
- Add tests for new backend functionality and run all relevant checks.
- Explain impact and migration before introducing breaking changes.
