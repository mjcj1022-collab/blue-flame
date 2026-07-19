# Mandrel

Parametric jewelry design and configuration platform.

A *mandrel* is the tapered steel rod a jeweler slides a ring onto to size it,
form it, and true it up. It is the ring-sizing instrument, and the thing
everything else is formed around.

Live 3D configurator across five product categories with real sizing math, real
casting weights, a per-alloy metal requirement engine, a production layer that
exports print-ready STL, and an alloy-compounding Metal Lab.

---

## What it does

**Five product categories** — ring, pendant, earrings, bracelet, necklace. Each
derives its geometry, weight and cost from the spec; nothing is ever stored as a
mesh. Switch category and the whole model, sizing and quote rebuild.

- **17 templates** — solitaire variants, wedding & men's bands, studs, drops,
  tennis, bangle, cuff, chain, pendant necklace. One click to start; every
  template is parametric, not a frozen mesh.
- **Sizing per category** — rings (US 3–13 quarter sizes, live UK/EU/JP
  conversion, band-width compensation), bracelets (wrist + fit, tennis/bangle/
  cuff/chain), necklaces (length + silhouette), earrings (stud/drop, posts,
  backs).
- **26 stone types · 16 shapes · 25 metals · 12 settings.** Millimetre sizing is
  shape-dependent — a 1 ct round reads 6.47 mm; a 1 ct emerald reads 7.00 × 5.00.
- **Plain bands** — real "no stone" support; a wedding band prices on metal +
  finish alone.
- **Finishes & engraving** — 7 surface finishes drive the 3D material; engraving
  with a character limit computed from the real band circumference.
- **Wearability & compliance guardrails** — Mohs warnings, prong-count advice,
  top-heavy shank detection, nickel-content disclosure, non-resizable warnings.

## The Metal Lab

Compound an alloy from ten pure metals (Au, Ag, Cu, Zn, Ni, Pd, Pt, Co, Sn, Ge)
and watch it resolve live: karat, fineness, **density** (exact, inverse rule of
mixtures), approximate melt point, resulting **colour** (copper reddens, silver
pales, whiteners bleach to white gold), and hallmark — with disclosure notes
(nickel allergen, high-zinc brittleness, sub-10K). Nine standard recipes
included. "Use in design" makes the alloy the active metal and adds it to the
per-alloy comparison.

## The four weights

"How much gold does this piece take" has four different correct answers, and
shops lose money conflating them.

| Number | What it is | Who needs it |
|---|---|---|
| **Cast weight** | What comes out of the flask | The caster |
| **Finished weight** | After 7–13% disappears into filing and polishing | The client, the appraisal |
| **Metal to pour** | Piece + sprue + button + melt loss. Usually 1.7–2.0× cast | Purchasing |
| **Fine metal content** | Actual grams of Au/Ag/Pt inside the alloy | Spot pricing, refining |

Every design is also costed **across all alloys simultaneously** — identical
geometry, different densities. Platinum weighs 1.60× what 14K yellow does for the
same model. Precious metals price on fine troy ounces; contemporary metals
(titanium, tungsten, steel, …) price per gram. Grams and pennyweight both
supported.

## Production layer

- **Bill of materials** — metal, stones, findings, labor; reconciles to the penny
  with the quote.
- **Manufacturability checks** — minimum wall by metal, prong stock vs printer
  resolution, tennis stone spacing, bezel closed-void, wearable weight, with
  pass / warn / fail levels.
- **STL export** — metal-only, true-millimetre, print-ready for wax/resin casting.
- **Tech sheet** — dimensioned, category-aware, with full disclosure block.

## Save, version, share

- **Design library** — save, load, fork, full version history with rollback
  (localStorage).
- **Share links** — the entire design encodes into a URL; a `?d=` link opens the
  exact piece with no login.

## Two things that are easy to get wrong

1. **A torus under-weighs a band by ~21%.** A torus has an elliptical
   cross-section; a real band is near-rectangular. The ratio is π/4. The shank is
   modelled as cross-section area × centreline circumference. See
   `src/lib/volume.ts`.
2. **Castable resin is ~21% denser than injection wax.** A shop that keeps using
   the old wax multiplier on 3D-printed patterns under-orders metal on every job.
   See `PATTERN_DENSITY` in `src/lib/metal.ts`.

---

## Stack

React 18 · TypeScript · Vite · React Three Fiber · zustand · Vitest

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 68 tests across weights, library, production, alloys, personalization, share
npm run build
```

## Structure

```
src/
├── spec/types.ts        DesignSpec — the single source of truth (all categories).
│                        Geometry, weight and cost are DERIVED from it.
├── catalog/             alloys, elements, shapes, stones, settings, finishes,
│                        templates. Every row carries its own math.
├── lib/
│   ├── sizing.ts        size conversions, band-width compensation
│   ├── volume.ts        per-category parametric volume model
│   ├── metal.ts         the four weights, per-alloy comparison
│   ├── pricing.ts       cost breakdown + wearability/compliance guardrails
│   ├── alloygen.ts      Metal Lab compounding engine
│   ├── bom.ts           bill of materials
│   ├── manufacture.ts   manufacturability checks
│   ├── engrave.ts       engraving capacity + fee
│   ├── library.ts       save / fork / version / rollback
│   └── share.ts         URL encode/decode of a design
├── viewer/              React Three Fiber scene + per-category geometry + STL export
├── ui/                  controls, metal panel, quote, production, library, Metal Lab
└── test/                golden fixtures + engine tests
```

## Before this touches a client

Illustrative numbers to replace: `Alloy.spot` / `Alloy.perGram` (live feed),
`StoneType.rate` (supplier pricing), `MARGIN` in `src/lib/pricing.ts`. Densities,
mm factors and DFM thresholds should be verified by a working jeweler.

## Not yet built

The client-only app covers the spec's Phases 1–3 and much of 5. Still open, and
requiring backend infrastructure or heavy graphics work:

- **Commerce & multi-tenant** (Phase 4) — Stripe payments, accounts, hosted
  approval flow, order pipeline, REST/webhook API, white-label. Needs a server,
  a database, and third-party accounts.
- **Advanced visualization** — real faceted stone dispersion, hand/ear/wrist
  try-on models, AR via WebXR, lighting scenarios, 4-up compare.

## Docs

- [`docs/metal-weight.md`](docs/metal-weight.md) — every formula, with tables
- [`docs/build-plan.md`](docs/build-plan.md) — phase map and architecture
- [`docs/feature-spec.md`](docs/feature-spec.md) — full feature specification
