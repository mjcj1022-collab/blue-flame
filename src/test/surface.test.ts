import { describe, it, expect, beforeEach } from 'vitest'
import { strokeTubeVertices } from '../lib/sculpt'
import { useModeler } from '../state/modeler'

const s = () => useModeler.getState()

describe('strokeTubeVertices', () => {
  it('sweeps a valid tube along a path', () => {
    const v = strokeTubeVertices([[-2, 6, 0], [0, 6, 0], [2, 6, 0]], 0.5)
    expect(v.length).toBeGreaterThan(0)
    expect(v.length % 9).toBe(0)
    expect(v.every(Number.isFinite)).toBe(true)
  })
  it('ignores a path shorter than two points', () => {
    expect(strokeTubeVertices([[0, 0, 0]], 0.5)).toEqual([])
  })
})

describe('applySurfaceStroke (emboss / cut)', () => {
  beforeEach(() => useModeler.setState({ objects: [], selectedId: null, past: [], future: [] }))

  const box = () => { s().add('box'); return s().selectedId! }          // size 6 at [0,3,0]; top face y≈6
  const topStroke: [number, number, number][] = [[-2, 6, 0], [0, 6, 0], [2, 6, 0]]

  it('emboss unions a raised stroke onto the part (a mesh result)', () => {
    const id = box()
    s().applySurfaceStroke(id, topStroke, 'emboss', 0.5)
    const o = s().objects.find(x => x.id === id)!
    expect(o.kind).toBe('mesh')
    expect(o.vertices!.length).toBeGreaterThan(9)
  })

  it('cut subtracts a groove from the part', () => {
    const id = box()
    s().applySurfaceStroke(id, topStroke, 'cut', 0.5)
    const o = s().objects.find(x => x.id === id)!
    expect(o.kind).toBe('mesh')
    expect(o.vertices!.length).toBeGreaterThan(9)
  })

  it('is a single undoable step', () => {
    const id = box()
    const before = s().objects.find(x => x.id === id)!.kind
    s().applySurfaceStroke(id, topStroke, 'emboss', 0.5)
    s().undo()
    expect(s().objects.find(x => x.id === id)!.kind).toBe(before)   // back to the box
  })
})
