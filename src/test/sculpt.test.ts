import { describe, it, expect } from 'vitest'
import { primitiveGeometry, booleanOp, modelerToStl } from '../lib/sculpt'
import type { SculptObject, PrimitiveKind } from '../state/modeler'

const obj = (over: Partial<SculptObject> & { kind: SculptObject['kind'] }): SculptObject => ({
  id: 'x', name: 'o', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  size: 6, material: 'metal', color: 0xffffff, ...over
})

describe('sculpt geometry', () => {
  const kinds: PrimitiveKind[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'tube']
  for (const k of kinds) {
    it(`${k} builds a geometry with positions`, () => {
      const g = primitiveGeometry(k, 6)
      expect(g.getAttribute('position').count).toBeGreaterThan(0)
    })
  }

  it('exports STL for a scene of primitives', () => {
    const stl = modelerToStl([obj({ kind: 'box' }), obj({ kind: 'sphere', position: [10, 0, 0] })])
    expect(stl.startsWith('solid')).toBe(true)
    expect(stl).toContain('facet normal')
  })
})

describe('boolean operations', () => {
  const a = obj({ kind: 'box', size: 8 })
  const b = obj({ kind: 'sphere', size: 8, position: [4, 0, 0] })

  it('subtract produces result geometry', () => {
    const verts = booleanOp(a, b, 'subtract')
    expect(verts.length).toBeGreaterThan(0)
    expect(verts.length % 9).toBe(0)   // triangles = 3 verts × 3 coords
  })
  it('union of overlapping solids yields more geometry than intersect', () => {
    const union = booleanOp(a, b, 'union')
    const intersect = booleanOp(a, b, 'intersect')
    expect(union.length).toBeGreaterThan(0)
    expect(intersect.length).toBeGreaterThan(0)
    expect(union.length).toBeGreaterThan(intersect.length)
  })
})
