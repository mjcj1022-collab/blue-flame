/**
 * Center-of-mass / balance analysis over a triangle soup (flat [x,y,z,...], 9
 * floats per triangle). Uses the signed-tetrahedron method (divergence theorem):
 * every triangle forms a tetra with the origin whose signed volume weights the
 * average of its corners, summed and divided by total volume. Exact for a closed
 * solid with consistent winding — no sampling.
 *
 * For a ring the telling number is how far the mass sits off the vertical finger
 * axis: a head much heavier than the shank pulls the center of mass sideways and
 * the ring rotates on the finger until the heavy part hangs down.
 */

export interface Centroid { volume: number; x: number; y: number; z: number }

export function solidCentroid(soup: number[]): Centroid {
  let vol = 0, cx = 0, cy = 0, cz = 0
  const tris = Math.floor(soup.length / 9)
  for (let t = 0; t < tris; t++) {
    const o = t * 9
    const ax = soup[o],     ay = soup[o + 1], az = soup[o + 2]
    const bx = soup[o + 3], by = soup[o + 4], bz = soup[o + 5]
    const cx3 = soup[o + 6], cy3 = soup[o + 7], cz3 = soup[o + 8]
    // signed volume of tetra (origin, a, b, c) = a · (b × c) / 6
    const crx = by * cz3 - bz * cy3
    const cry = bz * cx3 - bx * cz3
    const crz = bx * cy3 - by * cx3
    const v = (ax * crx + ay * cry + az * crz) / 6
    vol += v
    // tetra centroid = (a + b + c) / 4  (origin contributes 0)
    cx += v * (ax + bx + cx3) / 4
    cy += v * (ay + by + cy3) / 4
    cz += v * (az + bz + cz3) / 4
  }
  if (Math.abs(vol) < 1e-9) return { volume: 0, x: 0, y: 0, z: 0 }
  return { volume: Math.abs(vol), x: cx / vol, y: cy / vol, z: cz / vol }
}

export type BalanceVerdict = 'balanced' | 'slight' | 'topheavy' | 'empty'

export interface BalanceReport {
  volume: number
  com: [number, number, number]
  radialOffset: number   // mm, distance of the COM from the vertical (finger) axis
  bboxRadius: number     // mm, half the max horizontal span — the normalizer
  ratio: number          // radialOffset / bboxRadius
  verdict: BalanceVerdict
  note: string
}

export type FingerAxis = 'x' | 'y' | 'z'

/**
 * Analyze balance about the finger axis — the ring's hole axis, which the piece
 * rotates around on the finger. `fingerAxis` picks that axis (sculpt bands are
 * modeled in the XY plane, so their finger axis is 'z'; the default 'y' suits a
 * piece stood upright). The radial offset is the COM's distance from that axis
 * in the perpendicular plane — the moment arm that makes a top-heavy ring spin.
 */
export function balanceReport(soup: number[], fingerAxis: FingerAxis = 'y'): BalanceReport {
  if (soup.length < 9) return { volume: 0, com: [0, 0, 0], radialOffset: 0, bboxRadius: 0, ratio: 0, verdict: 'empty', note: 'Nothing to weigh.' }
  const c = solidCentroid(soup)
  const com = [c.x, c.y, c.z]
  const axis = fingerAxis === 'x' ? 0 : fingerAxis === 'y' ? 1 : 2
  const perp = [0, 1, 2].filter(k => k !== axis)
  // extent in the plane perpendicular to the finger axis, for normalization
  let min0 = Infinity, max0 = -Infinity, min1 = Infinity, max1 = -Infinity
  for (let i = 0; i < soup.length; i += 3) {
    const a = soup[i + perp[0]], b = soup[i + perp[1]]
    if (a < min0) min0 = a; if (a > max0) max0 = a
    if (b < min1) min1 = b; if (b > max1) max1 = b
  }
  const bboxRadius = Math.max(1e-6, Math.max(max0 - min0, max1 - min1) / 2)
  const radialOffset = Math.hypot(com[perp[0]], com[perp[1]])
  const ratio = radialOffset / bboxRadius

  let verdict: BalanceVerdict, note: string
  if (ratio < 0.12) { verdict = 'balanced'; note = 'Well balanced — the mass sits over the finger axis; it will stay put.' }
  else if (ratio < 0.30) { verdict = 'slight'; note = 'Slightly off-axis — it may drift on the finger; a marginally heavier or wider shank centers it.' }
  else { verdict = 'topheavy'; note = 'Top-heavy — the head outweighs the shank and the ring will rotate on the finger. Add a comfort/counter-weight shank or lighten the head.' }

  return { volume: c.volume, com: [c.x, c.y, c.z], radialOffset, bboxRadius, ratio, verdict, note }
}
