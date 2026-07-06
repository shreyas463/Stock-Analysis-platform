# Deploying Basis

Basis is one self-contained Node process backed by an on-disk SQLite database.
That makes it a poor fit for serverless platforms (Vercel/Netlify), whose
filesystems are ephemeral and read-only — the database, sessions and trades
would not survive between requests. **Deploy it to a container host with a
persistent disk instead.** The repo ships a `Dockerfile` that every option
below builds for you.

The container runs, on boot: apply migrations → seed the demo account
(idempotent) → start the server on `$PORT`. `/api/health` reports readiness.

Set **`SESSION_SECRET`** in production or the app refuses to start (fail-closed).
Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`FINNHUB_API_KEY` is optional — without it the deploy runs in labeled demo mode.

---

## Option A — Railway (recommended: supports a persistent volume)

1. [railway.com](https://railway.com) → **New Project → Deploy from GitHub repo** →
   pick this repo. Railway detects `railway.json` + `Dockerfile` and builds.
2. **Variables** → add `SESSION_SECRET` (paste the generated value). Optionally
   add `FINNHUB_API_KEY` for live data.
3. **Volumes** → add a volume mounted at **`/app/data`** (this is where SQLite
   lives; without it data resets on redeploy).
4. Deploy. Railway assigns a URL and health-checks `/api/health`.

## Option B — Render (free tier; data is ephemeral)

1. [render.com](https://render.com) → **New → Blueprint** → connect this repo.
   Render reads `render.yaml`, builds the Dockerfile, and auto-generates
   `SESSION_SECRET`.
2. Deploy. You get a `*.onrender.com` URL.
3. The free plan has **no persistent disk**, so the database resets on each
   redeploy — fine for a public demo (the demo account re-seeds on boot). For
   durable data, set the service `plan` to `starter` and uncomment the `disk`
   block in `render.yaml`.

## Option C — Fly.io (persistent volume, global)

```bash
fly launch --no-deploy          # detects the Dockerfile; keep the app name
fly volume create basis_data --size 1
# In fly.toml add:  [mounts]  source="basis_data"  destination="/app/data"
fly secrets set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
fly deploy
```

## Local Docker (for parity testing)

```bash
docker build -t basis .
docker run -p 3000:3000 -v basis-data:/app/data \
  -e SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  basis
```

---

## Turning off the old Vercel deploys

The repository was previously wired to Vercel to build the old `frontend/`
subfolder, so every push now shows a **failed Vercel deployment** (and Vercel
keeps serving the last old build). Vercel cannot run this app — remove it:

- **Vercel dashboard → the project → Settings → Git → Disconnect**, or delete
  the project entirely; **or**
- Settings → Git → turn off "Automatically deploy" / add an Ignored Build Step.

Once disconnected, the red Vercel checks on GitHub stop. GitHub **Actions** CI
(lint, typecheck, tests, build, audit) is unaffected and continues to run.

## After deploying

- Visit `/` — the landing page. Sign in with `demo@basis.app` / `demo1234`.
- `GET /api/health` should return `{"status":"ok","db":"ok"}`.
- If you added `FINNHUB_API_KEY`, the "Demo mode" badge disappears and quotes go
  live; otherwise everything is clearly labeled synthetic.
