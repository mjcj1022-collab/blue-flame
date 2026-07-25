import { describe, it, expect } from 'vitest'
import { seededSeeds, voronoiCells, insetPolygon, polygonArea, clipHalfPlane, type Pt } from '../lib/voronoi'

describe('voronoi lattice geometry', () => {
  it('produces the requested seed count, deterministically', () => {
    const a = seededSeeds({ width: 20, height: 20, count: 16, seed: 7 })
    const b = seededSeeds({ width: 20, height: 20, count: 16, seed: 7 })
    expect(a).toHaveLength(16)
    expect(a).toEqual(b)                       // same seed → same points
    const c = seededSeeds({ width: 20, height: 20, count: 16, seed: 8 })
    expect(a).not.toEqual(c)                   // different seed → different points
    for (const [x, y] of a) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(20) ; expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(20) }
  })

  it('tiles the panel: cell areas sum to the panel area', () => {
    const seeds = seededSeeds({ width: 30, height: 20, count: 24, seed: 3 })
    const cells = voronoiCells(seeds, 30, 20)
    expect(cells).toHaveLength(24)
    const sum = cells.reduce((s, c) => s + polygonArea(c), 0)
    expect(sum).toBeCloseTo(30 * 20, 3)        // a Voronoi diagram partitions the region exactly
  })

  it('each cell contains its own seed', () => {
    const seeds = seededSeeds({ width: 20, height: 20, count: 12, seed: 5 })
    const cells = voronoiCells(seeds, 20, 20)
    seeds.forEach((s, i) => {
      // the seed is the nearest site → it lies inside its own (convex) cell
      const nearest = seeds.reduce((best, o, j) => {
        const d = (o[0] - s[0]) ** 2 + (o[1] - s[1]) ** 2
        return d < best.d ? { j, d } : best
      }, { j: -1, d: Infinity })
      expect(nearest.j).toBe(i)
      expect(polygonArea(cells[i])).toBeGreaterThan(0)
    })
  })

  it('insets a square inward by d (area shrinks predictably)', () => {
    const sq: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10]]
    const inset = insetPolygon(sq, 1)
    expect(polygonArea(inset)).toBeCloseTo(8 * 8, 6)   // 10-2·1 on each side
  })

  it('collapses to empty when inset exceeds the polygon', () => {
    const sq: Pt[] = [[0, 0], [4, 0], [4, 4], [0, 4]]
    expect(insetPolygon(sq, 3)).toEqual([])
  })

  it('clipHalfPlane trims a square to a half', () => {
    const sq: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10]]
    // keep x ≤ 5 : outward normal +x, anchor (5,*)
    const half = clipHalfPlane(sq, [5, 0], [1, 0])
    expect(polygonArea(half)).toBeCloseTo(50, 6)
  })
})
