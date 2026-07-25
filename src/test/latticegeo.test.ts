import { describe, it, expect } from 'vitest'
import { voronoiLatticeVertices, latticeHoleCount } from '../lib/latticeGeo'

const OPTS = { width: 20, height: 14, thickness: 1.2, count: 24, strut: 0.9, seed: 11 }

describe('voronoi lattice geometry', () => {
  it('produces a valid, non-empty triangle soup', () => {
    const v = voronoiLatticeVertices(OPTS)
    expect(v.length).toBeGreaterThan(0)
    expect(v.length % 9).toBe(0)                 // whole triangles
  })

  it('pierces holes (soup is far denser than a plain slab)', () => {
    const holes = latticeHoleCount(OPTS)
    expect(holes).toBeGreaterThan(5)             // most of the 24 cells become holes
    const solid = voronoiLatticeVertices({ ...OPTS, count: 1, strut: 50 }) // effectively no holes
    const pierced = voronoiLatticeVertices(OPTS)
    expect(pierced.length).toBeGreaterThan(solid.length)
  })

  it('fits within the requested panel bounds', () => {
    const v = voronoiLatticeVertices(OPTS)
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (let i = 0; i < v.length; i += 3) {
      maxX = Math.max(maxX, Math.abs(v[i])); maxY = Math.max(maxY, Math.abs(v[i + 1])); maxZ = Math.max(maxZ, Math.abs(v[i + 2]))
    }
    expect(maxX).toBeLessThanOrEqual(OPTS.width / 2 + 1e-3)
    expect(maxZ).toBeLessThanOrEqual(OPTS.height / 2 + 1e-3)
    expect(maxY).toBeLessThanOrEqual(OPTS.thickness / 2 + 1e-3)   // laid flat, thin along Y
  })

  it('is deterministic for a given seed', () => {
    expect(voronoiLatticeVertices(OPTS)).toEqual(voronoiLatticeVertices(OPTS))
  })
})
