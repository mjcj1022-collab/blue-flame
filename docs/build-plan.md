# MANDREL — Phase Map & Build Structure

---

## Part 1 — The stack, decided

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| API | **Django 5 + DRF, PostgreSQL** | Multi-tenant with roles, a costing engine, inventory and orders are relational problems. Django admin gives you a catalog editor on day one instead of building CRUD screens. |
| Frontend | **React 18 + TypeScript + Vite** | Matches your existing stack. Vite because the 3D bundle is large and HMR matters when you're tuning geometry. |
| 3D | **React Three Fiber + drei** | The ring is a scene graph driven by state. R3F makes that declarative instead of an imperative rebuild on every slider tick. |
| Auth / storage | **Supabase** (auth + object storage) | Renders, cert PDFs, STL files. Don't build file infrastructure. |
| Payments | **Stripe** | Deposits, balance payments, Connect for retailer payouts in Phase 4. |
| Hosting | API on Fly.io or Render, frontend on Vercel | Postgres managed. No Kubernetes. |

### The one architectural decision that matters

**The design is a JSON document, not a mesh.**

```
DesignSpec {
  ring:    { size, width, thickness, fit, profile }
  metal:   { alloyId, components: { shank, head, prongs } }
  center:  { shapeId, stoneTypeId, carat, certId? }
  accents: [ { shapeId, stoneTypeId, mm, count, placement } ]
  setting: { typeId, prongCount, headStyle }
  finish:  { surface, milgrain, engraving }
}
```

Geometry, cost, weight and the tech sheet are all **derived** from this document. Nothing is ever stored as a mesh. That's what makes templates parametric, versioning cheap, and Phase 2 mostly data entry.

### The duplication problem, and how to handle it

Volume and price math has to run in two places: instantly in the browser as a slider moves, and authoritatively on the server when a quote is saved.

- **Client (TypeScript):** optimistic estimate, updates at 60 fps, clearly labeled "estimate"
- **Server (Python):** authoritative. Recomputes on save and overwrites the client number
- **Shared contract:** the formulas live in one markdown spec (`docs/costing.md`) with a golden-fixture test suite that both implementations run against. If they diverge by more than 0.5%, CI fails.

Do not skip the fixture suite. Divergent pricing math is how you quote a ring at $4,100 and cast it at $5,300.

---

## Part 2 — Repo structure

```
mandrel/
├── apps/
│   ├── api/                    Django project
│   │   ├── catalog/            metals, shapes, stone types, settings, templates
│   │   ├── design/             DesignSpec storage, versioning, validation
│   │   ├── costing/            weight + price engine (authoritative)
│   │   ├── manufacture/        DFM checks, BOM, tech sheet, STL export
│   │   ├── commerce/           quotes, orders, Stripe, approvals
│   │   ├── tenancy/            organizations, seats, roles, white-label config
│   │   └── core/               settings, auth, audit log
│   │
│   ├── studio/                 React — the CAD-side designer
│   │   ├── src/viewer/         R3F canvas, camera, environment, materials
│   │   ├── src/controls/       the configuration panel
│   │   ├── src/quote/          live estimate panel
│   │   └── src/state/          DesignSpec store (zustand)
│   │
│   └── counter/                React — retail floor configurator (Phase 4)
│
├── packages/
│   ├── spec/                   DesignSpec TypeScript types + JSON Schema
│   ├── geometry/               parametric builders: shank, head, prongs, stones
│   ├── costing-lite/           client-side estimate, mirrors apps/api/costing
│   └── ui/                     shared components, design tokens
│
├── fixtures/
│   └── costing/                golden test cases both engines must match
│
└── docs/
    ├── costing.md              the formulas, in prose, as source of truth
    ├── dfm-rules.md            manufacturability thresholds by metal
    └── sizing.md               size conversions, width compensation, fit profiles
```

**`packages/geometry` is the crown jewel.** Every builder takes a slice of the DesignSpec and returns a `BufferGeometry`. Pure functions, no React, no state. That makes them testable and reusable in a headless render worker later.

---

## Part 3 — Data model

**Catalog (seeded, editable in Django admin)**
`Alloy` · `StoneType` · `StoneShape` · `SettingType` · `FinishType` · `Template`

Every catalog row carries its own math: `Alloy.density`, `StoneShape.mm_factor`, `StoneShape.lw_ratio`, `StoneType.mohs`, `SettingType.fee_per_stone`. Adding a metal is a database row, never a deploy.

**Design**
`Design` (owner, tenant, title, current_version) → `DesignVersion` (spec JSON, thumbnail, created_by, created_at, note)

Immutable versions. A version is never edited, only superseded. This gives you free undo, free diffing, and a defensible record when a client says "that's not what I approved."

**Commerce**
`Quote` (design_version, line items, expiry, snapshot of metal spot price) → `Order` → `OrderEvent` (cast, set, finish, QC, ship)

The quote snapshots the spot price. Gold moves; a quote from Tuesday has to still mean something on Friday.

**Tenancy**
`Organization` → `Seat` (user + role) → roles: `client`, `associate`, `designer`, `production`, `admin`

Row-level scoping on every query from day one. Retrofitting multi-tenancy is a rewrite; building it in is an afternoon.

---

## Part 4 — The phase map

### Phase 1 — Solitaire, end to end
**Goal:** one category, done properly, sellable as-is.

| Milestone | Deliverable |
|---|---|
| 1.1 | DesignSpec schema + `packages/spec` types + JSON Schema validation |
| 1.2 | `packages/geometry`: shank builder with width/thickness/fit, round-brilliant stone, 4/6-prong and bezel heads |
| 1.3 | R3F viewer: studio environment, PBR metals, gem transmission, orbit, turntable, top view |
| 1.4 | Control panel: sizer with width compensation, 6 shapes, 8 stone types, 6 alloys, 3 settings, carat |
| 1.5 | `costing-lite` + `apps/api/costing` + the golden fixture suite |
| 1.6 | Django catalog models, seeded, admin-editable |
| 1.7 | Save / load / version a design. Auth via Supabase |
| 1.8 | Tech sheet PDF and quote PDF |

**Exit criteria:** a jeweler configures a ring, saves it, and hands the tech sheet to a bench that can actually make it. Client and server prices agree within 0.5%.

**You already have 1.2–1.5 prototyped in the single-file configurator.** Port it, don't rewrite it.

---

### Phase 2 — Categories and templates
**Goal:** stop being a ring app.

| Milestone | Deliverable |
|---|---|
| 2.1 | Template system: parametric presets with locked and free parameters |
| 2.2 | Ring templates — three-stone, halo, hidden halo, cathedral, bypass, eternity, signet, plain bands |
| 2.3 | Accent stone engine: pavé flow along a curve, spacing solver, overlap detection, auto count |
| 2.4 | Pendants + bails, with chain-gauge compatibility check |
| 2.5 | Earrings: studs, hoops, drops. Post/back selection, lobe weight warning |
| 2.6 | Bracelet sizer + bangle sizer (hand-width flow, oval vs round inner dimension) |
| 2.7 | Necklace length picker with body-silhouette preview |
| 2.8 | Save-as-template, fork, version diff |

**Exit criteria:** every sizing flow in the spec exists, and a design can start from a template instead of a blank file.

---

### Phase 3 — Production layer
**Goal:** the part jewelers actually pay for.

| Milestone | Deliverable |
|---|---|
| 3.1 | DFM rule engine: wall thickness, prong thickness, unsupported spans, stone spacing, seat depth, closed voids, minimum feature vs printer resolution |
| 3.2 | Rules table per metal in `docs/dfm-rules.md`, enforced server-side, surfaced inline in the viewer |
| 3.3 | Full BOM: every stone by shape/size/count/TCW, findings, metal by component |
| 3.4 | Tech sheet with dimensioned drawing, stone map, setter instructions |
| 3.5 | STL / 3MF export, watertight, with orientation and sprue suggestion |
| 3.6 | Printer profiles — castable resin and your Ender 3 wax workflow |
| 3.7 | Live metal spot feed with lock-price-for-N-days |
| 3.8 | Insurance appraisal generation |

**Exit criteria:** a design goes from the browser to a printed wax without anyone opening Rhino.

---

### Phase 4 — Commerce and multi-tenant
**Goal:** other people's businesses run on it.

| Milestone | Deliverable |
|---|---|
| 4.1 | Organizations, seats, roles, row-level scoping |
| 4.2 | Associate mode — configure without seeing cost basis |
| 4.3 | Client share link, comment threads, **timestamped approval sign-off** |
| 4.4 | Stripe deposits + balance, order pipeline with client-visible status |
| 4.5 | White-label: logo, palette, markup rules, custom domain |
| 4.6 | Embeddable widget for a jeweler's existing site |
| 4.7 | Compliance layer: lab-grown disclosure, treatment disclosure, Kimberley attestation on every document |
| 4.8 | Audit log on every spec change |

**Exit criteria:** a retailer signs up, brands it, puts it on their site, and takes a deposit without you touching anything.

---

### Phase 5 — Everything else
AR try-on, hand model with skin tone, stone inventory integration, template marketplace, offline PWA, CRM, API + webhooks, engraving vectorization, handwriting and fingerprint capture, layering preview, lighting scenarios.

**None of this before Phase 4 ships.** Every item here is a reason to not finish Phase 3.

---

## Part 5 — What to build first

Not the whole of Phase 1. This week:

1. `packages/spec` — write the DesignSpec type. One file. It's the contract everything else depends on.
2. `docs/costing.md` — write the weight and price formulas in prose, with worked examples.
3. `fixtures/costing/*.json` — ten golden cases with hand-checked expected weights and prices.
4. Port the single-file configurator's geometry into `packages/geometry` as pure functions with tests against the fixtures.

Four days of work, and it makes every subsequent phase mechanical. Skip it and you'll be reconciling two costing engines by hand in month three.

---

## Part 6 — Honest risk list

**Scope.** This document describes maybe eighteen months of work. Phase 1 is six to eight weeks and is independently sellable. The failure mode here isn't technical — it's building Phase 2 and 3 features before Phase 1 has a paying user.

**IP.** Before commercializing anything adjacent to work done under a prior employment agreement, get an employment attorney to review the invention-assignment clause. This applies to Mandrel the same way it applies to REDLINE.

**Gem rendering.** Convincing diamond dispersion is genuinely hard in a browser. Budget real time for it, and accept that Phase 1 ships with approximated fire. Clients forgive an imperfect render; they don't forgive a wrong price.

**Domain accuracy.** Every number in the catalog — densities, mm factors, setting fees, DFM thresholds — needs a working jeweler to verify before a client sees it. Find that person in Phase 1, not Phase 4.
