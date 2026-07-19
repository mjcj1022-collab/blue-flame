import { describe, it, expect, beforeEach } from 'vitest'
import { useDesign } from '../state/design'
import { DEFAULT_SPEC } from '../spec/types'

const s = () => useDesign.getState()

describe('design undo / redo', () => {
  beforeEach(() => useDesign.setState({ spec: DEFAULT_SPEC, past: [], future: [] }))

  it('records spec mutations and steps back and forward', () => {
    s().setCarat(1.5)
    s().setCarat(2.0)
    expect(s().spec.center.carat).toBe(2.0)

    s().undo()
    expect(s().spec.center.carat).toBe(1.5)
    s().undo()
    expect(s().spec.center.carat).toBe(DEFAULT_SPEC.center.carat)

    s().redo()
    expect(s().spec.center.carat).toBe(1.5)
    s().redo()
    expect(s().spec.center.carat).toBe(2.0)
  })

  it('spans different fields', () => {
    s().setCarat(3)
    s().setRing({ size: 9 })
    expect(s().spec.ring.size).toBe(9)
    s().undo()
    expect(s().spec.ring.size).toBe(DEFAULT_SPEC.ring.size)
    expect(s().spec.center.carat).toBe(3)
  })

  it('a new edit after undo clears the redo stack', () => {
    s().setCarat(1.1)
    s().setCarat(1.2)
    s().undo()
    expect(s().future).toHaveLength(1)
    s().setCarat(1.9)
    expect(s().future).toHaveLength(0)
  })

  it('does not record view-only toggles', () => {
    const before = s().past.length
    s().toggleUnit()
    s().toggleCompare()
    expect(s().past.length).toBe(before)
  })
})
