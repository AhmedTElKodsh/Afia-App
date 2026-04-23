## Deployment checklist (Afia App)

### Secrets / credentials (must NOT be committed)
- **Worker (Cloudflare)**
  - **`SUPABASE_SERVICE_ROLE_KEY`**: set via `wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env <stage>`
  - **LLM keys** (as needed): `GEMINI_API_KEY`, `GEMINI_API_KEY2`, `GEMINI_API_KEY3`, `GROQ_API_KEY`, etc.
  - **Admin auth**: `ADMIN_PASSWORD` and preferably `ADMIN_JWT_SECRET` (or `ADMIN_JWT_SECRETS` for rotation)
  - **Anything in `worker/.dev.vars`** should stay local-only (ignored by git)

- **Frontend (Vite)**
  - This app primarily uses the Worker API; if you don’t need direct Supabase-from-browser, do **not** set `VITE_SUPABASE_*`.
  - If you do use browser Supabase later, only set **anon/public** keys (never service role).

### Files you should NOT deploy / should stay local
- **`.env`, `.env.local`**: local-only; confirm they are not committed.
- **`worker/.dev.vars`**: local-only; confirm it is not committed.

### Templates to edit for your project
- **`worker/wrangler.toml`**
  - Replace **`SUPABASE_URL = "https://your-project.supabase.co"`** with your real project URL (safe to commit).
  - Ensure each `[env.*].vars` also uses your real `SUPABASE_URL`.
  - Set `STAGE` to the correct environment name (e.g. `stage1`, `stage2`, `prod`).

- **`worker/.dev.vars.example`**
  - Keep as example only; do not put real secrets here.

### Mock / test mode hardening
- **E2E uses mock mode** via `X-Mock-Mode: true` and `ENABLE_MOCK_LLM=true`.
- **Production**
  - Ensure `ENABLE_MOCK_LLM` is **unset/false**.
  - Ensure your deployment environment does not set `__AFIA_TEST_MODE__` (this is only set by E2E / dev tooling).

### Sanity checks before deploy
- **`npm test`** (unit tests)
- **`npm run build`** (frontend build)
- **Worker**
  - `npm run type-check --prefix worker`
  - Deploy: `wrangler deploy --env <stage>`

