# MANDREL — Jewelry Builder Feature Specification

*A parametric jewelry design and configuration platform.*

---

## 0. Naming

**Primary: MANDREL**

A mandrel is the tapered steel rod a jeweler slides a ring onto to size it, form it, and true it up. It is literally the ring-sizing instrument — the exact feature you named first — and metaphorically it is the thing everything else is formed around. Short, real trade vocabulary, industrial, unclaimed in software.

**Alternates:**

| Name | Origin | Why it works | Risk |
|---|---|---|---|
| **CULET** | The tiny facet at the bottom point of a brilliant cut | Insider term, two syllables, zero software collisions | Nobody outside the trade knows the word |
| **LOUPE** | The jeweler's magnifier | Implies close inspection and precision; instantly visual | Adobe uses "Loupe view"; some photo tools |
| **SCINTILLA** | From *scintillation*, the sparkle a moving stone throws | Elegant, feminine-leaning, luxury-adjacent | Longer; slightly precious |
| **FLASK** | The steel cylinder a wax model is invested in for casting | Punchy, production-side, memorable | Reads chemistry before jewelry |

Product naming inside Mandrel:
- **Mandrel Studio** — the full CAD/parametric designer
- **Mandrel Counter** — the retail-floor configurator a sales associate drives in front of a client
- **Mandrel Bench** — the production/manufacturing side (BOM, casting, QC)

---

## 1. Sizing and fit

### Rings
- Size scales: US, UK/AU, EU/ISO, Japan, China, India, Switzerland — live conversion between all
- Half and quarter sizes
- Direct entry by inside diameter (mm) or inside circumference (mm)
- **Band-width compensation.** A 2 mm band and an 8 mm band do not fit the same. Auto-suggest a size bump at ≥6 mm width and show the recommendation, not just apply it silently
- **Fit profile:** standard (flat interior) vs comfort fit (domed interior) vs euro shank (flattened bottom, resists spinning)
- Knuckle allowance field for clients whose knuckle is larger than the base of the finger
- Downloadable printable paper sizer, calibrated with a credit-card scale check
- Physical sizer request — mail a plastic ring sizer, credit the cost against the order
- **Resizability flag.** Eternity bands, full-pavé shanks and tension settings cannot be resized. Surface this at design time, not after casting
- Sizing range warning: most designs resize ±2 sizes before the shank distorts

### Bracelets and bangles
- Wrist circumference input, plus fit preference (snug / standard / loose) mapping to a mm allowance
- **Bangles size off hand width, not wrist.** A rigid bangle has to pass the knuckles of a compressed hand. Separate measurement flow, separate diagram
- Round vs oval bangle inner dimension (oval fits smaller, looks larger)
- Clasp allowance — box clasps, lobsters and toggles each eat different lengths
- Tennis bracelet link-count calculator: total length driven by stone size × link count
- Cuff opening gap and spring-back allowance

### Necklaces and chains
- Standard lengths (14 / 16 / 18 / 20 / 22 / 24 / 30 in) with a body-silhouette preview showing where each falls
- Choker / princess / matinee / opera / rope labeling
- Pendant bail sizing vs chain gauge — flag when the chain won't pass the bail
- Layering mode: preview 2–3 chains together at different lengths
- Extender chain option

### Earrings
- Post length and gauge
- Back type: friction, screw-back, la pousette, latch-back, leverage
- Hoop inner diameter with an ear-scale preview
- Weight warning for drops — grams at which a lobe starts to stretch

---

## 2. Stone selection

### Stone type
Diamond (natural / lab-grown), moissanite, white sapphire, sapphire (all colors), ruby, emerald, aquamarine, morganite, alexandrite, tanzanite, tourmaline, spinel, garnet, amethyst, citrine, peridot, topaz, opal, turquoise, onyx, lapis, malachite, pearl (akoya / freshwater / Tahitian / South Sea).

Each stone carries:
- **Mohs hardness** with a wearability warning. Opal at 5.5 in a daily-wear ring is a bad idea and the builder should say so
- Toughness and cleavage notes (emerald chips, tanzanite is fragile)
- Birthstone month tagging
- Typical price band per carat so the client isn't shocked at quote time
- **Treatment disclosure** — heated, diffused, oiled, irradiated, fracture-filled, dyed, stabilized. Not optional; FTC requires disclosure

### Cut / shape
Round brilliant, oval, cushion (brilliant and antique), princess, emerald, asscher, radiant, pear, marquise, heart, trillion, baguette (straight and tapered), rose cut, old European, old mine, briolette, cabochon, freeform.

- **mm ↔ carat conversion is shape-dependent.** A 6.5 mm round is ~1.00 ct; a 6.5 mm oval is not. Per-shape conversion table, not one formula
- Length-to-width ratio slider for elongated shapes, with a "classic range" band marked
- Depth and table percentage for the technically inclined
- Faceting pattern rendered accurately per cut — this is what makes the preview believable

### Grading
- **Diamonds:** cut grade (Excellent → Poor), color D–Z, clarity FL → I3, carat, fluorescence, polish, symmetry
- Certification: GIA, IGI, AGS, GCAL — with certificate number lookup and PDF attach
- **Colored stones:** hue / tone / saturation, origin (Kashmir, Burma, Mozambique, Colombia, Zambia), with origin-report attach
- Visual clarity simulator — show what SI2 actually looks like at that size instead of making people guess

### Melee and accents
- Specified separately from the center: size in mm, count, total carat weight, matched quality tier
- Auto-calculate count when stones flow along a curve
- Melee quality tiers (e.g. G-H/VS vs I-J/SI) with the price delta shown

### Inventory
- Link to live stone inventory so the client picks a stone that exists, with cert and photo
- "Reserve this stone" hold with expiry
- Fallback to generic spec when no inventory is connected

---

## 3. Setting styles

- **Prong:** 4-prong, 6-prong, compass (N/S/E/W), claw, talon, double-claw, V-prong for pointed shapes
- **Bezel:** full, half, partial, floating
- **Pavé:** standard, micro, French, fishtail/V-cut, shared-prong, bright-cut
- **Channel**, **bar**, **flush/gypsy**, **burnish**, **tension**, **bead**, **cluster**
- **Halo:** single, double, hidden/peekaboo, floral, cushion-halo-on-round
- **Head style:** basket, cathedral, trellis, crown, low-profile, under-gallery
- Prong metal independent of band metal — white prongs on a yellow band is the most-requested combination in the trade
- Stone seat depth and girdle protection modeled, not faked
- Setting-fee-per-stone feeding the quote automatically

---

## 4. Metals

- **Gold:** 10K, 14K, 18K, 22K, 24K in yellow, white, rose, green
- **Silver:** sterling .925, Argentium, fine .999
- **Platinum** 950, **palladium** 950
- **Alternative:** titanium, tungsten, cobalt, stainless, zirconium, damascus
- **Prototype:** brass, bronze, nickel silver
- Two-tone and tri-tone with per-component metal assignment (shank / head / prongs / halo / gallery)
- **Rhodium plating toggle** — white gold is plated and the plating wears. Show the maintenance reality and re-plating interval
- Nickel-free / hypoallergenic filter for sensitive clients
- **Live metal weight** from actual model volume × alloy density
- **Live spot-price cost** pulling current gold/silver/platinum, with a manual override and a lock-price-for-N-days function
- Metal density table driving all weight math (this is one table and it powers half the quote)

---

## 5. Templates and starting points

### Ring templates
Solitaire, three-stone, halo, hidden halo, vintage/milgrain, art deco, east-west, toi et moi, cluster, signet, eternity, half-eternity, stacking, chevron/nesting, tension, bypass, bombé, cocktail, men's band, wedding band (flat / dome / knife-edge / beveled / milgrain).

### Non-ring templates
Pendants (solitaire, halo, bezel, cluster, locket, bar, initial), studs (martini, basket, bezel), hoops (huggie, endless, inside-out), drops, ear cuffs, climbers, cuffs, bangles (solid / hinged / cuff), tennis bracelets, charm bracelets, chain bracelets, brooches, cufflinks, tie bars, nose studs and rings, belly bars, anklets.

### Template mechanics
- **Every template is parametric, not a frozen mesh.** Changing the center stone from 1 ct round to 2 ct oval reflows the head, prongs, halo and shank
- Start from a photo — client uploads inspiration, designer starts from the nearest template
- Save any design as a private or shared template
- Fork/clone with attribution
- Version history per design with visual diff and rollback
- Template marketplace: designers publish, retailers license

---

## 6. Personalization

- **Engraving:** inside and outside, font library, character limit computed from actual band circumference and width, live preview at true scale
- Handwriting upload — trace a signature or a note into a vector path
- Fingerprint capture and emboss
- Soundwave engraving from an audio clip
- Coordinates, dates in multiple formats, Roman numerals
- **Finishes:** high polish, satin/brushed, matte, sandblast, hammered, florentine, Damascus pattern, oxidized/antiqued recesses
- Milgrain (per-edge, adjustable bead size)
- Filigree and gallery cutouts
- Hidden birthstone under the center stone
- Required stamping: karat mark, maker's mark, country of origin, with legal placement rules

---

## 7. Visualization

- **Real-time 3D viewer** — React Three Fiber, PBR materials, HDRI environment lighting
- Stone rendering with dispersion (fire), internal reflection and scintillation on rotation — this is what sells the piece
- Metal shaders that read correctly per alloy; 18K yellow and 14K yellow are visibly different
- **Hand model try-on** — scale-accurate, with skin tone selection and finger size matched to the chosen ring size
- Ear, wrist and neck models for the other categories
- **AR try-on** via WebXR / device camera with hand tracking
- 360° turntable export as video or GIF for the client to share
- Side-by-side comparison of up to four variants
- Scale reference overlay: mm ruler, coin, or hand
- Lighting scenarios — daylight, jewelry-case spotlighting, candlelight, office fluorescent. Stones behave differently and clients should see it before, not after
- Shareable link with no login required for the client to view and comment

---

## 8. Manufacturing and production readiness

### Automated checks (run on every save)
- Minimum wall thickness by metal (silver tolerates less than gold)
- Prong thickness and height vs stone size
- Unsupported spans and cantilevers
- Stone-to-stone spacing — too tight to set
- Seat depth vs pavilion depth
- Closed voids that trap investment
- Sharp internal corners that won't cast
- Total weight vs practical wearability
- Feature size vs printer resolution

### Output
- Live BOM: metal type and weight, every stone by shape/size/quantity/total carat weight, findings
- **Tech sheet PDF** matching what actually gets cast — dimensioned drawing, stone map, setting instructions for the setter
- STL / 3MF / OBJ / 3DM export
- Support-ready orientation with sprue placement suggestion
- Wax and castable-resin printer profiles
- Casting flask layout for multi-piece trees
- Send-to-caster handoff with the tech sheet attached

### Cost engine
Metal (live spot × weight × alloy factor) + stones + labor hours + setting fee per stone by type and size + casting + finishing + plating + shipping + margin. Every line visible and overridable. Quote PDF with an expiry date.

---

## 9. Commerce and workflow

- Quote generation with versioning and expiry
- Deposit + balance payments (Stripe)
- **Client approval flow** — send the 3D view, client comments on specific parts, approves with a timestamped sign-off before anything is cast. This single feature prevents most custom-order disputes
- Order pipeline: designed → approved → cast → set → finished → QC → shipped, with client-visible status
- **Insurance appraisal document** auto-generated from the BOM and cert data
- Retailer white-label mode: their logo, their markup, their domain
- Sales associate mode with guardrails — can configure, cannot see cost basis
- Embeddable widget for a jeweler's existing site
- CRM notes per client: sizes, preferences, anniversaries, past pieces

---

## 10. Compliance and disclosure

- **Lab-grown disclosure** — FTC requires clear identification; bake it into every render, quote and appraisal
- Treatment disclosure per stone
- Kimberley Process / conflict-free attestation with supplier chain
- Recycled metal certification
- Metal content stamping law compliance by market
- Nickel Directive compliance flag for EU sales
- Return and resize policy surfaced at the point the client picks a non-resizable design

---

## 11. Platform

- Multi-tenant: retailer accounts, seat-based users
- Roles: client, sales associate, CAD designer, production, admin
- Design library scoped per tenant and per client
- Offline-capable PWA — trade shows and shop floors have bad wifi
- REST + webhook API for POS and inventory integration
- Audit log on every design change (matters for disputes and for insurance)

---

## Build order

Do not build this list. Build these four, in order, and ship each one:

1. **Ring configurator, solitaire only.** Ring sizer with band-width compensation, 6 stone shapes, 4 metals, 3 setting types, live 3D, live weight and price. This alone is a sellable product.
2. **Template library + non-ring categories.** Adds pendants, studs, bands, bracelets with their sizers.
3. **Production layer.** BOM, tech sheet, manufacturability checks, STL export. This is what turns a toy into a tool jewelers pay for.
4. **Commerce and multi-tenant.** Quotes, approval flow, white-label, retailer accounts.

Everything else in this document is phase five or later.
