# Mandrel

Parametric jewelry design and configuration platform.

A *mandrel* is the tapered steel rod a jeweler slides a ring onto to size it,
form it, and true it up. It is the ring-sizing instrument, and the thing
everything else is formed around.

**Phase 1 — solitaire rings, end to end.** Live 3D configurator with real
sizing math, real casting weights, and a per-alloy metal requirement engine.

---

## What it does

- **Ring sizer** — US 3–13 in quarter sizes, converting through the trade
  formula `ID = 11.6307 + 0.8128 × size`. Live inside diameter and circumference.
- **Band-width compensation** — a wide band reads smaller than a narrow one at
  the same nominal size. Crossing 4.5 mm suggests a quarter size up; 6 mm
  suggests a half, with a one-click apply.
- **10 stone shapes, 12 stone types, 12 alloys, 4 settings** — geometry rebuilds
  parametrically on every change.
- **Millimetre sizing is shape-dependent.** A 1 ct round reads 6.47 mm; a 1 ct
  emerald reads 7.00 × 5.00. One formula does not work.
- **Wearability guardrails** — Mohs hardness warnings, ultrasonic-cleaning
  cautions, prong-count advice, top-heavy shank detection.
- **Full metal requirement engine** — see below.

## The four weights

"How much gold does this piece take" has four different correct answers, and
shops lose money conflating them.

| Number | What it is | Who needs it |
|---|---|---|
| **Cast weight** | What comes out of the flask | The caster |
| **Finished weight** | After 7–13% disappears into filing and polishing | The client, the appraisal |
| **Metal to pour** | Piece + sprue + button + melt loss. Usually 1.7–2.0× cast | Purchasing |
| **Fine metal content** | Actual grams of Au/Ag/Pt inside the alloy | Spot pricing, refining |

Every design is also costed **across all twelve alloys simultaneously** —
identical geometry, different densities. Platinum weighs 1.60× what 14K yellow
does for the same model.

Grams and pennyweight both supported. Older jewelers think in dwt and will not
convert for you.

## Two things that are easy to get wrong

1. **A torus under-weighs a band by ~21%.** A torus has an elliptical
   cross-section; a real band is near-rectangular. The ratio is π/4. The shank
   is modelled as cross-section area × centreline circumference with a profile
   factor instead. See `src/lib/volume.ts`.
2. **Castable resin is ~21% denser than injection wax.** A shop that keeps
   using the old wax multiplier on 3D-printed patterns under-orders metal on
   every single job. See `PATTERN_DENSITY` in `src/lib/metal.ts`.

---

## Stack

React 18 · TypeScript · Vite · React Three Fiber · zustand · Vitest

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 19 golden fixtures against trade reference weights
npm run build
```

## Structure

```
src/
├── spec/types.ts        DesignSpec — the single source of truth.
│                        Geometry, weight and cost are all DERIVED from it.
│                        Nothing is ever stored as a mesh.
├── catalog/             alloys, shapes, stones, settings
│                        Every row carries its own math. Adding a metal is a
│                        data change, never a code change.
├── lib/
│   ├── sizing.ts        size conversions, band-width compensation
│   ├── volume.ts        parametric volume model
│   ├── metal.ts         the four weights, per-alloy comparison, pattern conversion
│   ├── pricing.ts       cost breakdown and wearability guardrails
│   └── units.ts         grams, pennyweight, troy ounces
├── viewer/              React Three Fiber scene
├── ui/                  controls, metal requirement, quote
└── test/weights.test.ts golden fixtures
```

## Before this touches a client

Three numbers are illustrative and must be replaced:

- `Alloy.spot` — wire to a live metal price feed
- `StoneType.rate` — replace with your supplier pricing
- `MARGIN` in `src/lib/pricing.ts` — currently 1.35, arbitrary

Densities, mm factors and DFM thresholds should be verified by a working
jeweler. Mills differ by around 3%, and a 3% density error on a 15 g platinum
piece is real money.

## Roadmap

See [`docs/build-plan.md`](docs/build-plan.md). Phase 2 adds templates and the
non-ring categories with their sizers; Phase 3 is the production layer; Phase 4
is commerce and multi-tenant.

## Docs

- [`docs/metal-weight.md`](docs/metal-weight.md) — every formula, with tables
- [`docs/build-plan.md`](docs/build-plan.md) — phase map and architecture
- [`docs/feature-spec.md`](docs/feature-spec.md) — full feature specification
