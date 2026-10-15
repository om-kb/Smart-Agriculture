# Smart Agriculture Advisor

A farmer-friendly platform for Indian agriculture. This initial version establishes a tested development environment for future geographic, weather, crop advisory, and AI features.

## Stack and structure

- `frontend/`: Next.js App Router, React, strict TypeScript, Tailwind CSS, ESLint
- `backend/`: Python 3.12+, FastAPI, Uvicorn, Pydantic Settings, HTTPX, Pytest
- `.github/`: pull-request CI; `docs/` and `scripts/`: supporting material

## Prerequisites and setup

Install Git, Node.js 24+, pnpm 10+, and Python 3.12+. Clone the repository and run `git switch dev`.

Frontend:

```powershell
cd frontend
Copy-Item .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000.

Backend (PowerShell):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

On macOS/Linux, activate with `source .venv/bin/activate` and copy with `cp .env.example .env`. API docs are at http://localhost:8000/docs. Test health with `curl http://localhost:8000/api/v1/health`; the expected response is `{"status":"ok","service":"smart-agriculture-backend"}`.

Run checks with `pnpm lint` and `pnpm typecheck` from `frontend`, and `python -m pytest` from `backend`.

## Git workflow and contributions

Branch from `dev` into `feature/<name>` (including `feature/api`, `feature/backend`, or `feature/ui`). Open feature pull requests into `dev`; promote `dev` to `main` only through a separate validated pull request. Never push directly to `main`.

Keep HTTP integrations in backend service modules, read configuration from environment variables, test new backend behavior, update documentation when contracts change, and never commit secrets or real `.env` files. See [AGENTS.md](AGENTS.md).

## Windows troubleshooting

- If `python` opens Microsoft Store, install from python.org with **Add Python to PATH**, or use `py -3.12`.
- If PowerShell blocks activation, use `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` or call `.venv\Scripts\python.exe` directly.
- If `pnpm` is missing, run `corepack enable` and `corepack prepare pnpm@latest --activate`.
- For port conflicts, stop the process using 3000/8000; update the frontend API URL if the backend port changes.
- For CORS errors, ensure `BACKEND_CORS_ORIGINS` contains the exact frontend origin and restart.
- For long-path errors, run `git config --global core.longpaths true`.
