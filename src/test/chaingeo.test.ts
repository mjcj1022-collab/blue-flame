import { describe, it, expect } from 'vitest'
import { chainVertices, chainSpan } from '../lib/chainGeo'

const OPTS = { links: 6, radius: 3, wire: 0.7, segments: 16 }

const bbox = (v: number[]) => {
  let minX = Infinity, maxX = -Infinity, maxAbsY = 0, maxAbsZ = 0
  for (let i = 0; i < v.length; i += 3) {
    minX = Math.min(minX, v[i]); maxX = Math.max(maxX, v[i])
    maxAbsY = Math.max(maxAbsY, Math.abs(v[i + 1])); maxAbsZ = Math.max(maxAbsZ, Math.abs(v[i + 2]))
  }
  return { minX, maxX, maxAbsY, maxAbsZ }
}

describe('chain builder', () => {
  it('produces a valid non-empty triangle soup', () => {
    const v = chainVertices(OPTS)
    expect(v.length).toBeGreaterThan(0)
    expect(v.length % 9).toBe(0)
  })

  it('more links → more geometry', () => {
    expect(chainVertices({ ...OPTS, links: 12 }).length).toBeGreaterThan(chainVertices({ ...OPTS, links: 4 }).length)
  })

  it('runs along X, centered, and stays slim across the wire', () => {
    const v = chainVertices(OPTS)
    const b = bbox(v)
    expect(b.minX).toBeCloseTo(-b.maxX, 4)                       // centered on origin
    expect(b.maxX - b.minX).toBeGreaterThan(OPTS.radius * 3)     // spans several links along X
    // a link's out-of-plane thickness is ~ the wire radius (perpendicular links use Y or Z)
    expect(Math.min(b.maxAbsY, b.maxAbsZ)).toBeLessThan(OPTS.radius + OPTS.wire + 1e-6)
  })

  it('is deterministic', () => {
    expect(chainVertices(OPTS)).toEqual(chainVertices(OPTS))
  })

  it('estimates a sensible span', () => {
    expect(chainSpan(OPTS)).toBeGreaterThan(OPTS.links * OPTS.radius)
  })
})
