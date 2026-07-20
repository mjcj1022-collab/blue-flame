import { describe, it, expect, beforeEach } from 'vitest'
import { sketchToVertices, bakedVertices } from '../lib/sculpt'
import { useModeler, type SculptObject } from '../state/modeler'

describe('free-draw sketch → geometry', () => {
  const profile: [number, number][] = [[1, 0], [3, 0], [3, 2], [1, 2]]

  it('revolve produces a valid triangle soup', () => {
    const v = sketchToVertices(profile, 'revolve', 3, 32)
    expect(v.length).toBeGreaterThan(0)
    expect(v.length % 9).toBe(0)          // whole triangles, 3 coords each
    expect(v.every(Number.isFinite)).toBe(true)
  })

  it('extrude produces a valid triangle soup with the requested depth', () => {
    const v = sketchToVertices(profile, 'extrude', 4)
    expect(v.length % 9).toBe(0)
    const zs = v.filter((_, i) => i % 3 === 2)
    // centred extrusion along Z of depth 4 → spans roughly [-2, 2]
    expect(Math.max(...zs)).toBeCloseTo(2, 1)
    expect(Math.min(...zs)).toBeCloseTo(-2, 1)
  })

  it('ignores degenerate input', () => {
    expect(sketchToVertices([[0, 0]], 'revolve')).toEqual([])
  })

  it('a partial revolve sweeps a smaller footprint than a full one', () => {
    const footprint = (arc: number) => {
      const v = sketchToVertices(profile, 'revolve', 3, 48, arc)
      const xs = v.filter((_, i) => i % 3 === 0), zs = v.filter((_, i) => i % 3 === 2)
      return (Math.max(...xs) - Math.min(...xs)) + (Math.max(...zs) - Math.min(...zs))
    }
    const full = sketchToVertices(profile, 'revolve', 3, 48, 360)
    const quarter = sketchToVertices(profile, 'revolve', 3, 48, 90)
    expect(quarter.length).toBe(full.length)   // same segment count
    expect(quarter).not.toEqual(full)          // but a different sweep
    expect(footprint(90)).toBeLessThan(footprint(360))
  })
})

describe('convert template → editable mesh', () => {
  beforeEach(() => useModeler.getState().clear())

  it('bakes a parametric shank into an identity-transform mesh with vertices', () => {
    const store = useModeler.getState()
    store.add('shank')
    const id = useModeler.getState().selectedId!
    store.bakeToMesh(id)
    const o = useModeler.getState().objects.find(x => x.id === id) as SculptObject
    expect(o.kind).toBe('mesh')
    expect(o.vertices!.length).toBeGreaterThan(9)
    expect(o.vertices!.length % 9).toBe(0)
    expect(o.position).toEqual([0, 0, 0])
    expect(o.rotation).toEqual([0, 0, 0])
    expect(o.scale).toEqual([1, 1, 1])
  })

  it('baked vertices match the object’s world geometry', () => {
    const obj: SculptObject = {
      id: 't', kind: 'box', name: 'b', position: [5, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      size: 4, material: 'metal', color: 0xffffff
    }
    const v = bakedVertices(obj)
    const xs = v.filter((_, i) => i % 3 === 0)
    // a size-4 box centred at x=5 spans x ∈ [3, 7]
    expect(Math.max(...xs)).toBeCloseTo(7, 3)
    expect(Math.min(...xs)).toBeCloseTo(3, 3)
  })
})
