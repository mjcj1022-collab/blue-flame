import { describe, it, expect } from 'vitest'
import { textVertices, TEXT_FONT_NAMES } from '../lib/text3d'

describe('textVertices', () => {
  it('builds an extruded solid for text', () => {
    const v = textVertices('AB', 'Block', 4, 1.2)
    expect(v.length).toBeGreaterThan(0)
    expect(v.length % 9).toBe(0)                 // whole triangles
    expect(v.every(Number.isFinite)).toBe(true)
    // extruded ±depth/2 in z → spans about 1.2mm
    const zs = v.filter((_, i) => i % 3 === 2)
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(1.2, 1)
  })

  it('returns nothing for empty / whitespace', () => {
    expect(textVertices('', 'Block')).toEqual([])
    expect(textVertices('   ', 'Block')).toEqual([])
  })

  it('exposes the bundled font names', () => {
    expect(TEXT_FONT_NAMES.length).toBeGreaterThanOrEqual(3)
    expect(TEXT_FONT_NAMES).toContain('Block')
  })

  it('a longer string produces more geometry', () => {
    expect(textVertices('LONGER', 'Sans').length).toBeGreaterThan(textVertices('X', 'Sans').length)
  })
})
