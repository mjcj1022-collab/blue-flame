/**
 * A compact, exact 2-D Voronoi generator for jewelry lattices / filigree
 * piercing. Each cell is built by clipping the panel rectangle with the
 * perpendicular-bisector half-plane between its seed and every other seed
 * (O(n²), but jewelry uses tens of seeds, not thousands). Convex cells, no
 * external dependency — deterministic from a seed so a pattern is reproducible
 * and unit-testable. Downstream, each cell is inset to leave metal struts and
 * the insets become holes in an extruded panel.
 */

export type Pt = [number, number]

/** mulberry32 — small deterministic PRNG so the same seed gives the same lattice. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface SeedOpts { width: number; height: number; count: number; seed: number; jitter?: number }

/**
 * Jittered-grid seed points — spreads `count` seeds roughly evenly across the
 * panel (clumped random seeds make ugly slivers), then nudges each by `jitter`
 * (0..1 of a cell) for organic irregularity.
 */
export function seededSeeds({ width, height, count, seed, jitter = 0.7 }: SeedOpts): Pt[] {
  const n = Math.max(1, Math.floor(count))
  const cols = Math.max(1, Math.round(Math.sqrt(n * width / height)))
  const rows = Math.max(1, Math.ceil(n / cols))
  const r = rng(seed)
  const pts: Pt[] = []
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols && pts.length < n; gx++) {
      const cw = width / cols, ch = height / rows
      const x = (gx + 0.5) * cw + (r() - 0.5) * jitter * cw
      const y = (gy + 0.5) * ch + (r() - 0.5) * jitter * ch
      pts.push([Math.min(width, Math.max(0, x)), Math.min(height, Math.max(0, y))])
    }
  }
  return pts
}

/** Sutherland–Hodgman: clip `poly` to the half-plane {p : (p-anchor)·n ≤ 0}. */
export function clipHalfPlane(poly: Pt[], anchor: Pt, n: Pt): Pt[] {
  if (poly.length === 0) return poly
  const inside = (p: Pt) => (p[0] - anchor[0]) * n[0] + (p[1] - anchor[1]) * n[1] <= 1e-9
  const out: Pt[] = []
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length]
    const cIn = inside(cur), pIn = inside(prev)
    if (cIn) {
      if (!pIn) out.push(intersect(prev, cur, anchor, n))
      out.push(cur)
    } else if (pIn) {
      out.push(intersect(prev, cur, anchor, n))
    }
  }
  return out
}

function intersect(a: Pt, b: Pt, anchor: Pt, n: Pt): Pt {
  const da = (a[0] - anchor[0]) * n[0] + (a[1] - anchor[1]) * n[1]
  const db = (b[0] - anchor[0]) * n[0] + (b[1] - anchor[1]) * n[1]
  const t = da / (da - db)
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
}

/** Voronoi cell polygons (one per seed) clipped to the [0,w]×[0,h] rectangle. */
export function voronoiCells(seeds: Pt[], width: number, height: number): Pt[][] {
  const rect = (): Pt[] => [[0, 0], [width, 0], [width, height], [0, height]]
  return seeds.map((s, i) => {
    let cell = rect()
    for (let j = 0; j < seeds.length && cell.length; j++) {
      if (j === i) continue
      const o = seeds[j]
      const mid: Pt = [(s[0] + o[0]) / 2, (s[1] + o[1]) / 2]
      const nrm: Pt = [o[0] - s[0], o[1] - s[1]]   // keep the side closer to s
      cell = clipHalfPlane(cell, mid, nrm)
    }
    return cell
  })
}

export function polygonArea(poly: Pt[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return Math.abs(a) / 2
}

export function polygonCentroid(poly: Pt[]): Pt {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    const cross = p[0] * q[1] - q[0] * p[1]
    a += cross; cx += (p[0] + q[0]) * cross; cy += (p[1] + q[1]) * cross
  }
  if (Math.abs(a) < 1e-9) return poly[0] ?? [0, 0]
  return [cx / (3 * a), cy / (3 * a)]
}

/**
 * Inset a convex polygon inward by `d` (its edges become struts). Clips the
 * polygon by each edge shifted inward; returns [] if it collapses. Winding-safe.
 */
export function insetPolygon(poly: Pt[], d: number): Pt[] {
  if (poly.length < 3 || d <= 0) return poly.length < 3 ? [] : poly
  // signed area → winding; inward normal depends on it
  let signed = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    signed += p[0] * q[1] - q[0] * p[1]
  }
  const ccw = signed > 0
  let cell = poly.slice()
  for (let i = 0; i < poly.length && cell.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    const ex = q[0] - p[0], ey = q[1] - p[1]
    const len = Math.hypot(ex, ey) || 1
    // Outward normal of this edge (clipHalfPlane keeps the side where the
    // outward-dot ≤ 0, i.e. the interior). Shift the anchor inward by d so the
    // kept region is the polygon pulled in by d on this edge.
    const outward: Pt = ccw ? [ey / len, -ex / len] : [-ey / len, ex / len]
    const anchor: Pt = [p[0] - outward[0] * d, p[1] - outward[1] * d]
    cell = clipHalfPlane(cell, anchor, outward)
  }
  return cell.length >= 3 ? cell : []
}
