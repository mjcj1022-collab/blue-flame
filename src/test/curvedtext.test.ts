import { describe, it, expect, beforeEach } from 'vitest'
import { curvedTextVertices } from '../lib/text3d'
import { useModeler } from '../state/modeler'

const s = () => useModeler.getState()

describe('curvedTextVertices', () => {
  it('wraps text around a circle at the given radius', () => {
    const v = curvedTextVertices('ABC', 'Block', 12, 2, 1.2, true)
    expect(v.length).toBeGreaterThan(0)
    expect(v.length % 9).toBe(0)
    // every vertex sits near the band radius (12mm) in the XY plane
    for (let i = 0; i < v.length; i += 3) {
      const r = Math.hypot(v[i], v[i + 1])
      expect(r).toBeGreaterThan(8)
      expect(r).toBeLessThan(16)
    }
  })
  it('a bigger radius spreads the text over a wider span', () => {
    const near = curvedTextVertices('ABCDEF', 'Block', 6)
    const far = curvedTextVertices('ABCDEF', 'Block', 24)
    const zSpanX = (v: number[]) => { const xs = v.filter((_, i) => i % 3 === 0); return Math.max(...xs) - Math.min(...xs) }
    expect(zSpanX(far)).toBeGreaterThan(zSpanX(near))
  })
  it('is empty for blank text', () => {
    expect(curvedTextVertices('  ', 'Block', 10)).toEqual([])
  })
})

describe('wrapTextOnBand', () => {
  beforeEach(() => useModeler.setState({ objects: [], selectedId: null, past: [], future: [] }))

  it('engraves wrapped text into a torus band', () => {
    s().add('torus')                     // ring-like, in the XY plane
    const id = s().selectedId!
    const ok = s().wrapTextOnBand(id, 'AB', 'Block', 'cut')
    expect(ok).toBe(true)
    const o = s().objects.find(x => x.id === id)!
    expect(o.kind).toBe('mesh')
    expect(o.vertices!.length).toBeGreaterThan(9)
  })

  it('is undoable', () => {
    s().add('torus')
    const id = s().selectedId!
    s().wrapTextOnBand(id, 'AB', 'Block', 'cut')
    s().undo()
    expect(s().objects.find(x => x.id === id)!.kind).toBe('torus')
  })
})
