import { describe, it, expect, beforeEach } from 'vitest'
import { useModeler } from '../state/modeler'
import { renderGeometry } from '../lib/sculpt'

const s = () => useModeler.getState()
const profile: [number, number][] = [[1, 0], [3, 0], [3, 3], [1, 3]]

describe('parametric sketch objects', () => {
  beforeEach(() => useModeler.setState({ objects: [], selectedId: null, past: [], future: [], sketching: false, sketchEditId: null }))

  it('addSketch creates a re-editable sketch object that renders geometry', () => {
    const id = s().addSketch({ points: profile, mode: 'revolve', depth: 3, segments: 32 })
    const o = s().objects.find(x => x.id === id)!
    expect(o.kind).toBe('sketch')
    expect(o.params?.sketch?.mode).toBe('revolve')
    const g = renderGeometry(o)
    expect(g.getAttribute('position').count).toBeGreaterThan(0)
  })

  it('setObjectSketch updates the profile without adding history', () => {
    const id = s().addSketch({ points: profile, mode: 'revolve', depth: 3, segments: 32 })
    const before = s().past.length
    s().setObjectSketch(id, { points: profile, mode: 'extrude', depth: 5, segments: 32 })
    expect(s().objects.find(x => x.id === id)!.params?.sketch?.mode).toBe('extrude')
    expect(s().past.length).toBe(before)   // live edits are not individual undo steps
  })

  it('switches an existing sketch between revolve and extrude, each rendering geometry', () => {
    const id = s().addSketch({ points: profile, mode: 'revolve', depth: 3, segments: 32 })
    const o1 = s().objects.find(x => x.id === id)!
    expect(renderGeometry(o1).getAttribute('position').count).toBeGreaterThan(0)
    // flip to extrude — same points, reinterpreted
    s().setObjectSketch(id, { ...o1.params!.sketch!, mode: 'extrude' })
    const o2 = s().objects.find(x => x.id === id)!
    expect(o2.params?.sketch?.mode).toBe('extrude')
    expect(renderGeometry(o2).getAttribute('position').count).toBeGreaterThan(0)
    // and back to revolve
    s().setObjectSketch(id, { ...o2.params!.sketch!, mode: 'revolve' })
    expect(s().objects.find(x => x.id === id)!.params?.sketch?.mode).toBe('revolve')
  })

  it('a sketch bakes to an editable mesh', () => {
    const id = s().addSketch({ points: profile, mode: 'extrude', depth: 4, segments: 24 })
    s().bakeToMesh(id)
    const o = s().objects.find(x => x.id === id)!
    expect(o.kind).toBe('mesh')
    expect(o.vertices!.length).toBeGreaterThan(9)
  })

  it('setSketching tracks an edit target', () => {
    s().setSketching(true, 'abc')
    expect(s().sketching).toBe(true)
    expect(s().sketchEditId).toBe('abc')
    s().setSketching(false)
    expect(s().sketchEditId).toBeNull()
  })
})
