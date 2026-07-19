# MANDREL — Metal Weight & Gold Requirement Engine

`docs/metal-weight.md` — source of truth for every gram the system reports.

---

## The distinction that matters

"How much gold does this piece take" has **four different correct answers**, and shops lose money by conflating them.

| Number | What it is | Who needs it |
|---|---|---|
| **Cast weight** | What comes out of the flask, before cleanup | Caster, cost basis |
| **Finished weight** | What the client's ring actually weighs | Client, appraisal, insurance |
| **Metal to pour** | What you must have in the crucible — piece + sprue + button + loss | Purchasing, inventory |
| **Fine metal content** | Actual grams of Au/Ag/Pt inside the alloy | Spot pricing, refining, hallmark |

A 14K solitaire might read: 3.42 g cast, 3.11 g finished, 5.98 g to pour, 1.99 g fine gold. All four are true. Quote from the wrong one and the margin is gone.

---

## 1. Volume → cast weight

```
cast_weight_g = model_volume_mm³ / 1000 × alloy_density_g_per_cm³
```

The CAD volume must already have stone seats, drill holes and comfort-fit doming subtracted. If seats aren't cut in the model, subtract an allowance: roughly `0.35 × (stone_diameter_mm)³ × 0.001` cm³ per seated stone.

### Alloy density table

| Alloy | Density (g/cm³) | Fine content |
|---|---|---|
| 24K fine gold | 19.32 | 99.9% Au |
| 22K yellow | 17.80 | 91.6% Au |
| 18K yellow | 15.58 | 75.0% Au |
| 18K white (nickel) | 14.90 | 75.0% Au |
| 18K white (palladium) | 15.70 | 75.0% Au |
| 18K rose | 15.15 | 75.0% Au |
| 14K yellow | 13.07 | 58.3% Au |
| 14K white | 12.61 | 58.3% Au |
| 14K rose | 12.90 | 58.3% Au |
| 10K yellow | 11.57 | 41.7% Au |
| 10K white | 11.07 | 41.7% Au |
| 9K yellow (UK/EU) | 11.20 | 37.5% Au |
| Sterling .925 | 10.36 | 92.5% Ag |
| Argentium .935 | 10.20 | 93.5% Ag |
| Fine silver .999 | 10.49 | 99.9% Ag |
| Platinum 950/Ru | 20.90 | 95.0% Pt |
| Platinum 950/Ir | 21.50 | 95.0% Pt |
| Palladium 950 | 12.00 | 95.0% Pd |
| Titanium Gr.5 | 4.51 | — |
| Brass (prototype) | 8.50 | — |
| Bronze (prototype) | 8.80 | — |

Density varies by mill and by master alloy. Ask your caster for their figures and override the table — a 3% density error on a 15 g platinum piece is real money.

---

## 2. Wax or resin → metal

When there's no CAD volume, only a physical pattern:

```
metal_weight_g = pattern_weight_g × (alloy_density / pattern_density)
```

### Pattern densities

| Pattern material | Density (g/cm³) |
|---|---|
| Blue/green injection wax | 0.95 |
| Hard carving wax (Ferris file-a-wax) | 1.02 |
| Soft modeling wax | 0.90 |
| Castable photopolymer resin | 1.15 |
| FDM cast-friendly filament (Moldlay etc.) | 1.05 |

**This is the single most common mistake in a 3D-printed workflow.** Resin is ~21% denser than injection wax. A shop that keeps using the old wax multiplier on resin patterns under-orders metal on every job.

### Conversion factors (multiply pattern weight by this)

| Alloy | From wax (0.95) | From resin (1.15) |
|---|---|---|
| 14K yellow | 13.76 | 11.37 |
| 14K white | 13.27 | 10.97 |
| 18K yellow | 16.40 | 13.55 |
| 18K rose | 15.95 | 13.17 |
| Sterling | 10.91 | 9.01 |
| Platinum 950 | 22.00 | 18.17 |
| Palladium 950 | 12.63 | 10.43 |

### Metal-to-metal conversion

Cast a sterling sample first, then scale:

```
target_weight = known_weight × (target_density / known_density)
```

A 4.00 g sterling sample becomes 5.05 g in 14K yellow, 6.02 g in 18K yellow, 8.07 g in platinum.

---

## 3. Metal to pour

The crucible needs more than the piece.

```
sprue_volume_mm³   = π × (sprue_r_mm)² × sprue_length_mm × sprue_count
button_weight_g    = max(button_min_g, tree_weight_g × button_ratio)
pour_weight_g      = (piece_weight + sprue_weight + button_weight) × (1 + melt_loss)
```

### Working defaults

| Parameter | Default | Notes |
|---|---|---|
| Sprue diameter | 3.5 mm | 4–5 mm for heavy or chunky pieces |
| Sprue length | 12 mm | Per attachment point |
| Sprue count | 1 | 2+ for wide bands, cuffs, open forms |
| Button ratio | 0.40 | 40% of tree weight held in the reservoir |
| Button minimum | 8 g gold, 15 g platinum | Below this, shrinkage porosity |
| Melt loss | 2% gold, 4% silver, 1.5% platinum | Oxidation, crucible film, fines |

**Practical shop rule:** for a single piece on a small tree, order **1.7–2.0× the cast weight** in gold. The excess isn't gone — it comes back as sprue and button and gets remelted or refined.

---

## 4. Finishing loss

The finished piece is lighter than the casting. Metal disappears into filing, sanding, pre-polish and final polish.

| Design character | Loss (% of cast weight) |
|---|---|
| Plain band, simple solitaire | 5–7% |
| Standard ring with a head and gallery | 7–10% |
| Milgrain, engraving, textured surfaces | 10–13% |
| Pavé, filigree, open lacework | 12–16% |
| Heavy hand-finishing / hand-engraved | up to 20% |

```
finished_weight_g = cast_weight_g × (1 − finishing_loss)
```

Report the **finished** weight to the client and on the appraisal. Report the **cast** weight to the bench. They are not the same number and appraisers will catch it.

---

## 5. Fine metal content and spot pricing

```
fine_metal_g   = finished_weight_g × alloy_fine_fraction
fine_metal_ozt = fine_metal_g / 31.1035
metal_value    = fine_metal_ozt × spot_price_per_ozt
```

A 4.00 g 14K yellow ring holds 2.33 g fine gold = 0.0749 ozt. At $2,400/ozt spot that's about $180 of gold in a ring that might retail at $1,400.

**Buying metal costs more than spot.** Casting grain and sheet carry a fabrication premium:

| Form | Premium over spot |
|---|---|
| Casting grain, gold | 6–12% |
| Casting grain, platinum | 8–15% |
| Sheet and wire | 12–20% |
| Sterling grain | 15–25% (low base, high relative margin) |

```
metal_cost = fine_metal_ozt × spot × (1 + fabrication_premium)
```

Unit note: the trade quotes gold in **troy ounces** and **pennyweight**. 1 ozt = 31.1035 g = 20 dwt. 1 dwt = 1.5552 g. Display grams, but let the user toggle dwt — older jewelers think in pennyweight and will not convert for you.

---

## 6. Scrap recovery

Metal removed is not metal lost.

| Source | Recoverable | Refiner payout |
|---|---|---|
| Sprues and buttons (clean) | 100% | 95–98% of fine value |
| Filings and bench sweeps | 60–80% | 85–92% of fine value |
| Polishing sweeps | 40–60% | 70–85% of fine value |

```
scrap_credit = (sprue_g + button_g) × fine_fraction × spot × 0.965
             + finishing_loss_g × 0.70 × fine_fraction × spot × 0.88
```

**True metal cost = purchased metal − scrap credit.** A shop that ignores recovery over-prices by 15–25% on heavy pieces and loses the bid.

---

## 7. Multi-component pieces

Two-tone and tri-tone pieces need per-component weights, because the components use different alloys and are often cast separately and assembled.

```
for each component (shank, head, prongs, halo, gallery, bail):
    component_volume → component_weight using that component's alloy
total = Σ components
```

Report a per-component table on the tech sheet. The caster needs it; a single total is useless to them.

Solder allowance for assembled pieces: add 0.5–2% of joined component weight.

---

## 8. Reference ranges — sanity check

Verify the engine against these before trusting it. All 14K yellow.

| Piece | Typical cast weight |
|---|---|
| 2 mm plain band, size 7 | 1.8 – 2.4 g |
| 4 mm comfort-fit band, size 10 | 4.8 – 6.0 g |
| 6 mm comfort-fit band, size 10 | 7.5 – 9.5 g |
| 8 mm men's band, size 11 | 11 – 14 g |
| Solitaire, 1 ct center, 1.8 mm shank | 2.8 – 4.0 g |
| Halo engagement ring, 1 ct center | 4.0 – 5.5 g |
| Signet ring, size 9 | 8 – 15 g |
| Stud earrings, pair, 5 mm | 1.2 – 2.0 g |
| Small pendant, bezel set | 1.5 – 3.0 g |
| 7" tennis bracelet, 2 mm stones | 10 – 18 g |
| 18" cable chain, 1.5 mm | 3.5 – 5.5 g |

If the engine returns a number outside these ranges for a comparable design, the volume calc is wrong — not the density.

---

## 9. What the UI must show

Per design, always:

- Model volume (mm³)
- **Cast weight** (g and dwt)
- **Finished weight** (g and dwt) — labeled as the client-facing number
- **Fine metal content** (g and ozt) with the metal named
- **Metal to pour** including sprue and button
- Recoverable scrap and credit
- Wax and resin pattern weight equivalents
- Per-component breakdown for multi-metal pieces

Every one of those with the assumption visible and overridable. A jeweler who can't override your finishing-loss percentage will stop trusting the whole quote.

---

## 10. Test fixtures

`fixtures/costing/` must include at minimum:

1. Plain 2 mm band, size 7, 14KY — check against the reference range
2. Same band in platinum — check the density scaling
3. Same band as a resin pattern — check the pattern conversion
4. 6 mm comfort-fit — check the hollowing reduction
5. Solitaire with 1 ct round, 4-prong — check head volume
6. Same solitaire, bezel — check the bezel volume delta
7. Two-tone: white head on yellow shank — check per-component
8. Pavé eternity, 36 stones — check seat subtraction and high finishing loss
9. Heavy signet, 12 g class — check button minimum kicks in
10. Sterling version of #9 — check the higher melt loss and silver payout

Both the TypeScript and Python engines run all ten. Divergence over 0.5% fails CI.
