# Blue Flame — backend

Commerce, accounts, orders and the multi-tenant API for Blue Flame. This is a
**scaffold**: the code and schema are here, but it does not run until you
provision the three things below. The client app works standalone without it —
the backend is what turns saved designs into paid orders across multiple shops.

## What you provision

1. **A Postgres database** — Neon, Supabase, Railway, or RDS all work. Put its
   connection string in `DATABASE_URL`.
2. **A Stripe account** — from the dashboard, copy the secret key into
   `STRIPE_SECRET_KEY` and the webhook signing secret into
   `STRIPE_WEBHOOK_SECRET`. Use **test** keys first.
3. **A host for this server** — Render, Railway, Fly.io, or a VPS. Set
   `CLIENT_ORIGIN` to where the client is served for CORS.

Claude does not handle your keys — you paste them into `.env` yourself.

## Run it

```bash
cd server
cp .env.example .env      # then fill in the values
npm install
npm run migrate           # applies schema.sql
npm run dev               # http://localhost:8787/api/health
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/health` | liveness |
| POST | `/api/auth/register` · `/login` | accounts (JWT) — **stubbed**, add password hashing |
| GET/POST | `/api/designs` | save/list designs (the DesignSpec JSON) |
| GET  | `/api/designs/:id` | load a design |
| POST | `/api/quotes` | versioned quote with expiry |
| POST | `/api/orders` | open an order |
| PATCH| `/api/orders/:id/stage` | advance the pipeline (records approval timestamp) |
| POST | `/api/checkout` | Stripe payment intent → `clientSecret` |
| POST | `/api/stripe/webhook` | mark orders paid — **stubbed**, verify signature |

## Still to implement (marked `TODO` in the code)

- Real password hashing (argon2/bcrypt) in `auth` register/login
- Stripe webhook signature verification in `/api/stripe/webhook`
- Wiring the client: point the app at `API_BASE`, send the JWT, and replace the
  localStorage library/orders with these endpoints. The DesignSpec already
  serializes cleanly (it's what `share.ts` encodes), so the client sends it as-is.

## Multi-tenant model

Every row is scoped to a `tenant` (a shop). Roles — client / associate / cad /
production / admin — gate access via `requireRole(...)`. White-label uses
`tenants.slug`. See `schema.sql`.
