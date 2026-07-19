-- Blue Flame — multi-tenant commerce schema.
-- Every row is scoped to a tenant (a retailer/shop). Run via `npm run migrate`.

create table if not exists tenants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique not null,           -- white-label subdomain / path
  markup       numeric not null default 1.35,  -- shop margin
  created_at   timestamptz not null default now()
);

create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  email        text not null,
  password_hash text not null,
  role         text not null default 'associate',  -- client | associate | cad | production | admin
  created_at   timestamptz not null default now(),
  unique (tenant_id, email)
);

-- A design is the DesignSpec JSON straight from the client — nothing is a mesh.
create table if not exists designs (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  owner_id     uuid references users(id) on delete set null,
  name         text not null,
  spec         jsonb not null,
  parent_id    uuid references designs(id),        -- fork lineage
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists quotes (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  design_id    uuid not null references designs(id) on delete cascade,
  version      int not null default 1,
  total_cents  int not null,
  breakdown    jsonb not null,                     -- the PriceResult
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  design_id     uuid not null references designs(id),
  quote_id      uuid references quotes(id),
  stage         text not null default 'designed',  -- designed|approved|cast|set|finished|qc|shipped
  approved_at   timestamptz,                        -- client sign-off timestamp
  stripe_payment_intent text,
  deposit_cents int,
  balance_cents int,
  created_at    timestamptz not null default now()
);

create table if not exists audit_log (
  id          bigserial primary key,
  tenant_id   uuid not null,
  actor_id    uuid,
  action      text not null,
  target      text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
