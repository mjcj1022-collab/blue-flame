import { describe, it, expect } from 'vitest'
import { computeVolume } from '../lib/volume'
import { normalizeAiDesign, parseAiReply } from '../lib/aiAssistant'
import { DEFAULT_SPEC, type DesignSpec } from '../spec/types'

const necklace = (motif: 'none' | 'celtic'): DesignSpec => ({
  ...DEFAULT_SPEC,
  category: 'necklace',
  necklace: { ...DEFAULT_SPEC.necklace, motif },
})

describe('Celtic knot motif', () => {
  it('adds pendant volume to a plain chain', () => {
    const plain = computeVolume(necklace('none'))
    const knot = computeVolume(necklace('celtic'))
    expect(knot.head).toBeGreaterThan(0)          // the knot is the pendant mass
    expect(plain.head).toBe(0)
    expect(knot.total).toBeGreaterThan(plain.total)
  })

  it('AI patch accepts motif: celtic', () => {
    const d = normalizeAiDesign({ category: 'necklace', motif: 'celtic' })
    expect(d?.motif).toBe('celtic')
  })

  it('AI drops an unknown motif', () => {
    const d = normalizeAiDesign({ motif: 'paisley' })
    expect(d).toBeNull()
  })

  it('parses a Celtic-knot reply and labels it', () => {
    const text = JSON.stringify({ reply: 'A Celtic knot chain in silver.', design: { category: 'necklace', alloyId: 'ss', motif: 'celtic' } })
    const r = parseAiReply(text)
    expect(r.design?.motif).toBe('celtic')
    expect(r.matched).toContain('Celtic knot')
  })
})
