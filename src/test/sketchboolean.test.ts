import { describe, it, expect, beforeEach } from 'vitest'
import { booleanOp, type SketchMode } from '../lib/sculpt'
import { useModeler, type SculptObject } from '../state/modeler'

const s = () => useModeler.getState()

/** A sketch object with a simple box-ish profile, at a given position. */
const sketch = (mode: SketchMode, pos: [number, number, number], points: [number, number][]): SculptObject => ({
  id: `${mode}-${pos.join(',')}`, name: 's', kind: 'sketch', position: pos, rotation: [0, 0, 0], scale: [1, 1, 1],
  size: 0, material: 'metal', color: 0xffffff,
  params: { sketch: { points, mode, depth: 6, segments: 40, arc: 360 } },
})

const CLOSED: [number, number][] = [[0, 0], [4, 0], [4, 6], [0, 6]]   // closed, touches the axis
const OPEN: [number, number][] = [[2, 0], [6, 3], [7, 6], [4, 9]]     // hand-drawn open stroke

describe('boolean-combining two sketches (lib)', () => {
  for (const [label, pts] of [['closed', CLOSED], ['open', OPEN]] as const) {
    for (const mode of ['revolve', 'extrude'] as const) {
      for (const op of ['union', 'subtract', 'intersect'] as const) {
        it(`${mode} ${label} profile · ${op} yields geometry`, () => {
          const v = booleanOp(sketch(mode, [0, 0, 0], pts), sketch(mode, [3, 0, 0], pts), op)
          expect(v.length).toBeGreaterThan(0)
          expect(v.length % 9).toBe(0)   // whole triangles (3 verts × 3 coords)
        })
      }
    }
  }
})

describe('combine-two-sketches flow (store)', () => {
  beforeEach(() => useModeler.setState({ objects: [], selectedId: null, past: [], future: [] }))

  it('unions two live sketches into a single baked mesh and drops the sources', () => {
    const a = s().addSketch({ points: CLOSED, mode: 'revolve', depth: 6, segments: 32 })
    const b = s().addSketch({ points: CLOSED, mode: 'revolve', depth: 6, segments: 32 })
    s().update(b, { position: [3, 0, 0] })   // overlap the two vessels

    const objA = s().objects.find(o => o.id === a)!, objB = s().objects.find(o => o.id === b)!
    const vertices = booleanOp(objA, objB, 'union')     // same call doBoolean makes
    expect(vertices.length).toBeGreaterThan(0)

    s().addMesh({ kind: 'mesh', vertices, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], size: 0, material: 'metal', color: 0xffffff, name: 'union result' })
    s().remove(a); s().remove(b)

    const result = s().objects.find(o => o.name === 'union result')!
    expect(result.kind).toBe('mesh')
    expect(result.vertices!.length).toBeGreaterThan(9)
    expect(s().objects.filter(o => o.kind === 'sketch').length).toBe(0)   // both sources consumed
  })
})
