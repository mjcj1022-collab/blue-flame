import { describe, it, expect } from 'vitest'
import { solidCentroid, balanceReport } from '../lib/balance'

// Closed unit cube (0,0,0)-(1,1,1), consistent winding — reused from the repair suite.
const C: [number, number, number][] = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
]
const FACES: [number, number, number][] = [
  [0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1],
  [3, 2, 6], [3, 6, 7], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2],
]
const cube = (dx = 0, dz = 0): number[] => {
  const out: number[] = []
  for (const [a, b, c] of FACES) for (const i of [a, b, c]) out.push(C[i][0] + dx, C[i][1], C[i][2] + dz)
  return out
}

describe('solidCentroid', () => {
  it('finds the exact center and volume of a unit cube', () => {
    const c = solidCentroid(cube())
    expect(c.volume).toBeCloseTo(1, 6)
    expect(c.x).toBeCloseTo(0.5, 6)
    expect(c.y).toBeCloseTo(0.5, 6)
    expect(c.z).toBeCloseTo(0.5, 6)
  })

  it('tracks a translated solid', () => {
    const c = solidCentroid(cube(10, 0))
    expect(c.x).toBeCloseTo(10.5, 6)
    expect(c.z).toBeCloseTo(0.5, 6)
  })
})

describe('balanceReport', () => {
  it('flags a solid centered on the axis as balanced', () => {
    // cube spanning x,z in [-0.5,0.5] → COM on the Y axis
    const centered = cube(-0.5, -0.5)
    const r = balanceReport(centered)
    expect(r.radialOffset).toBeCloseTo(0, 6)
    expect(r.verdict).toBe('balanced')
  })

  it('flags an off-axis solid as top-heavy', () => {
    const off = cube(5, 0)   // COM far from the Y axis relative to its own size
    const r = balanceReport(off)
    expect(r.radialOffset).toBeGreaterThan(1)
    expect(r.verdict).toBe('topheavy')
  })

  it('handles empty input', () => {
    expect(balanceReport([]).verdict).toBe('empty')
  })

  it('measures offset about the chosen finger axis', () => {
    // Cube centered on the origin (all axes), then shifted purely along one axis.
    const centered = cube().map(c => c - 0.5)                        // spans ±0.5, COM at origin
    const shift = (v: number[], axis: number, d: number) => v.map((c, i) => (i % 3 === axis ? c + d : c))

    const alongZ = shift(centered, 2, 5)   // COM at (0,0,5)
    // About Y the Z-offset is radial → top-heavy; about Z it's *along* the finger → balanced.
    expect(balanceReport(alongZ, 'y').verdict).toBe('topheavy')
    expect(balanceReport(alongZ, 'z').radialOffset).toBeCloseTo(0, 6)
    expect(balanceReport(alongZ, 'z').verdict).toBe('balanced')

    const alongX = shift(centered, 0, 5)   // COM at (5,0,0) — in-plane for a Z finger axis
    expect(balanceReport(alongX, 'z').verdict).toBe('topheavy')
  })
})
