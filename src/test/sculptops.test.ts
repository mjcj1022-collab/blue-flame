import { describe, it, expect } from 'vitest'
import { subdivideSoup, smoothSoup } from '../lib/sculpt'

// one triangle in the XY plane
const tri = [0, 0, 0, 2, 0, 0, 0, 2, 0]

describe('subdivideSoup', () => {
  it('turns each triangle into four (×4 vertices)', () => {
    const out = subdivideSoup(tri)
    expect(out.length).toBe(tri.length * 4)   // 9 → 36
    expect(out.length % 9).toBe(0)
    expect(out.every(Number.isFinite)).toBe(true)
  })

  it('keeps every point within the original triangle bounds', () => {
    const out = subdivideSoup(tri)
    for (let i = 0; i < out.length; i += 3) {
      expect(out[i]).toBeGreaterThanOrEqual(-1e-9)
      expect(out[i + 1]).toBeGreaterThanOrEqual(-1e-9)
      expect(out[i]).toBeLessThanOrEqual(2 + 1e-9)
      expect(out[i + 1]).toBeLessThanOrEqual(2 + 1e-9)
    }
  })
})

describe('smoothSoup', () => {
  it('pulls an outlier vertex toward its neighbours', () => {
    // three coincident-ish points near origin + one spike at y=10
    const verts = [0, 0, 0, 0.1, 0, 0, -0.1, 0, 0, 0, 10, 0]
    const out = smoothSoup(verts, 100, 0.5)   // big radius → averages all four
    // the spike (index 3, y at [10]) should move down toward the group mean (~2.5)
    expect(out[10]).toBeLessThan(10)
    expect(out[10]).toBeGreaterThan(2)
    expect(out.length).toBe(verts.length)
  })

  it('leaves an already-uniform cluster essentially unchanged', () => {
    const verts = [0, 0, 0, 1, 0, 0, 0, 1, 0]
    const out = smoothSoup(verts, 0.01, 0.5)   // tiny radius → each vertex only sees itself
    for (let i = 0; i < verts.length; i++) expect(out[i]).toBeCloseTo(verts[i], 6)
  })
})
