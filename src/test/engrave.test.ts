import { describe, it, expect, beforeEach } from 'vitest'
import { positionTextVertices } from '../lib/sculpt'
import { textVertices } from '../lib/text3d'
import { useModeler, type SculptObject } from '../state/modeler'

const s = () => useModeler.getState()

describe('positionTextVertices', () => {
  it('lays text flat on the part top, scaled to fit', () => {
    const raw = textVertices('AB', 'Block', 10, 1.2)
    const box: SculptObject = { id: 'b', kind: 'box', name: 'b', position: [0, 3, 0], rotation: [0, 0, 0], scale: [1, 1, 1], size: 6, material: 'metal', color: 0 }
    const placed = positionTextVertices(raw, box, 'cut')
    expect(placed.length).toBeGreaterThan(0)
    // straddles the top face (y = 6) of the box
    const ys = placed.filter((_, i) => i % 3 === 1)
    expect(Math.max(...ys)).toBeGreaterThan(6)
    expect(Math.min(...ys)).toBeLessThan(6)
    // scaled to fit within the box width (±3)
    const xs = placed.filter((_, i) => i % 3 === 0)
    expect(Math.max(...xs)).toBeLessThanOrEqual(3.5)
  })
})

describe('engraveOnPart', () => {
  beforeEach(() => useModeler.setState({ objects: [], selectedId: null, past: [], future: [] }))

  it('engraves text into a part, producing a mesh', () => {
    s().add('box')
    const id = s().selectedId!
    const ok = s().engraveOnPart(id, 'A', 'Block', 'cut')
    expect(ok).toBe(true)
    const o = s().objects.find(x => x.id === id)!
    expect(o.kind).toBe('mesh')
    expect(o.vertices!.length).toBeGreaterThan(9)
  })

  it('embosses text onto a part', () => {
    s().add('box')
    const id = s().selectedId!
    expect(s().engraveOnPart(id, 'A', 'Block', 'emboss')).toBe(true)
  })

  it('is a single undoable step', () => {
    s().add('box')
    const id = s().selectedId!
    s().engraveOnPart(id, 'A', 'Block', 'cut')
    s().undo()
    expect(s().objects.find(x => x.id === id)!.kind).toBe('box')
  })
})
