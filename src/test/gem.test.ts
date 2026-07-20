import { describe, it, expect } from 'vitest'
import { brilliantGeometry } from '../lib/gem'

describe('brilliantGeometry', () => {
  it('builds a valid flat-facet triangle soup', () => {
    const g = brilliantGeometry(6.5, 16)
    const pos = g.getAttribute('position')
    expect(pos.count).toBeGreaterThan(0)
    expect((pos.array as Float32Array).length % 9).toBe(0)   // whole triangles
    // 6 triangles per side × 16 = 96 triangles → 288 vertices
    expect(pos.count).toBe(96 * 3)
    expect([...pos.array as Float32Array].every(Number.isFinite)).toBe(true)
  })

  it('spans the girdle diameter and sits between crown and culet', () => {
    const w = 8
    const g = brilliantGeometry(w, 16)
    g.computeBoundingBox()
    const b = g.boundingBox!
    // widest point is the girdle; an N-gon sits just inside the girdle radius
    const maxR = Math.max(b.max.x, b.max.z)
    expect(maxR).toBeLessThanOrEqual(w / 2 + 1e-3)
    expect(maxR).toBeGreaterThan(w / 2 * 0.9)
    // table at +0.16w, culet at -0.43w
    expect(b.max.y).toBeCloseTo(w * 0.16, 2)
    expect(b.min.y).toBeCloseTo(-w * 0.43, 2)
  })

  it('scales facet count with the shape (princess=4, trillion=3)', () => {
    expect(brilliantGeometry(5, 4).getAttribute('position').count).toBe(6 * 4 * 3)
    expect(brilliantGeometry(5, 3).getAttribute('position').count).toBe(6 * 3 * 3)
  })
})
