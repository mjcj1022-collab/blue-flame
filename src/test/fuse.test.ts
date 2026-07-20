import { describe, it, expect, beforeEach } from 'vitest'
import { useModeler, type SculptObject } from '../state/modeler'

const s = () => useModeler.getState()
const box = (over: Partial<SculptObject>): Omit<SculptObject, 'id' | 'name'> => ({
  kind: 'box', size: 6, material: 'metal', color: 0xffffff,
  position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], ...over
})

describe('fuseMetal', () => {
  beforeEach(() => useModeler.setState({ objects: [], selectedId: null, past: [], future: [] }))

  it('unions overlapping metal parts into a single mesh', () => {
    s().addObjects([box({ position: [0, 0, 0] }), box({ position: [3, 0, 0] })])
    expect(s().objects.filter(o => o.material === 'metal')).toHaveLength(2)

    const n = s().fuseMetal()
    expect(n).toBe(2)
    const objs = s().objects
    expect(objs).toHaveLength(1)
    expect(objs[0].kind).toBe('mesh')
    expect(objs[0].material).toBe('metal')
    expect(objs[0].vertices!.length % 9).toBe(0)
    expect(objs[0].vertices!.length).toBeGreaterThan(0)
  })

  it('leaves gems out of the fuse', () => {
    s().addObjects([
      box({ position: [0, 0, 0] }),
      box({ position: [3, 0, 0] }),
      box({ kind: 'gem', material: 'gem', position: [0, 10, 0], params: { shapeId: 'rd', carat: 1 } })
    ])
    s().fuseMetal()
    const objs = s().objects
    expect(objs).toHaveLength(2)                       // one fused metal + the gem
    expect(objs.filter(o => o.material === 'gem')).toHaveLength(1)
  })

  it('is a no-op with fewer than two metal parts', () => {
    s().addObjects([box({ position: [0, 0, 0] })])
    expect(s().fuseMetal()).toBe(0)
    expect(s().objects).toHaveLength(1)
  })

  it('is undoable', () => {
    s().addObjects([box({ position: [0, 0, 0] }), box({ position: [3, 0, 0] })])
    s().fuseMetal()
    expect(s().objects).toHaveLength(1)
    s().undo()
    expect(s().objects).toHaveLength(2)
  })
})
