# Deploy the Blue Flame backend (Render) and connect the live site

The app runs standalone today. This turns on the **backend** so the live site
gets real accounts, cloud-synced designs, orders and (optionally) payments.
~15 minutes. You do the account steps — Claude never handles your keys.

---

## 1. Push the code (already done)

The backend lives in `server/` and includes a `render.yaml` blueprint.

## 2. Create the service on Render

1. Sign in at **https://render.com** (free tier is fine).
2. **New → Blueprint** → connect the `blue-flame` GitHub repo → Render reads
   `server/render.yaml` and proposes the **blue-flame-api** web service.
3. Click **Apply**. Render runs `npm install`, seeds the shop + `mike`/`liliya`,
   and starts the API. `JWT_SECRET` is generated for you; a 1 GB disk keeps the
   SQLite file across restarts.
4. When it's live, copy the URL, e.g. `https://blue-flame-api.onrender.com`.
   Check `…/api/health` returns `{ ok: true }`.

> Free web services sleep after ~15 min idle and cold-start in a few seconds —
> fine for a shop tool. Drop the `disk:` block for a pure-ephemeral test
> instance, or swap to Render Postgres later for scale.

## 3. Point the live site at it

1. GitHub → the repo → **Settings → Secrets and variables → Actions →
   Variables → New repository variable**.
2. Name **`VITE_API_URL`**, value your Render URL (no trailing slash):
   `https://blue-flame-api.onrender.com`
3. Re-run the deploy: **Actions → Deploy to GitHub Pages → Run workflow** (or
   just push any commit). The client rebuilds pointed at the backend.

Now the live login authenticates against the server and the library
cloud-syncs. Leaving `VITE_API_URL` unset keeps the app standalone.

## 4. (Optional) Payments with Stripe

1. Create a **Stripe** account → Developers → API keys → copy the **test**
   secret key.
2. In Render → blue-flame-api → **Environment**, add `STRIPE_SECRET_KEY`.
3. In `server/`, add the dep once: `npm i stripe` and commit.
4. `/api/checkout` now returns a real client secret. Wire Stripe Elements on the
   client checkout screen (not built yet — client stays quote-only until then).

## Test users

`mike` / `mike123` (admin) and `liliya` / `liliya123` (associate) — seeded on
first boot. Change or add users via `/api/auth/register`, or edit
`server/src/seed.ts`.

## Local run (no hosting)

```bash
cd server && npm install && npm run seed && npm run start   # :8787
# then, from the repo root:
VITE_API_URL=http://localhost:8787 npm run dev              # :5173
```
