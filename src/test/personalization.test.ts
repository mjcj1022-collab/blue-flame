import { describe, it, expect } from 'vitest'
import { DEFAULT_SPEC, type DesignSpec } from '../spec/types'
import { engraveCapacity, engraveFee } from '../lib/engrave'
import { computePrice } from '../lib/pricing'
import { finishById } from '../catalog'

const withEng = (text: string, over: Partial<DesignSpec['engraving']> = {}): DesignSpec =>
  ({ ...DEFAULT_SPEC, engraving: { ...DEFAULT_SPEC.engraving, text, ...over } })

describe('engraving', () => {
  it('a ring has a positive character capacity, larger inside than outside', () => {
    const inside = engraveCapacity(withEng('', { placement: 'inside' }))
    const outside = engraveCapacity(withEng('', { placement: 'outside' }))
    expect(inside).toBeGreaterThan(0)
    expect(inside).toBeGreaterThan(outside)
  })
  it('a wider font fits fewer characters', () => {
    const serif = engraveCapacity(withEng('', { font: 'Serif' }))
    const script = engraveCapacity(withEng('', { font: 'Script' }))
    expect(script).toBeLessThan(serif)
  })
  it('engraving fee scales with characters and flows into the quote', () => {
    expect(engraveFee(withEng(''))).toBe(0)
    const p0 = computePrice(withEng(''))
    const p1 = computePrice(withEng('Forever'))
    expect(p1.engraveFee).toBeGreaterThan(0)
    expect(p1.total).toBeGreaterThan(p0.total)
  })
})

describe('finishes', () => {
  it('a hand finish costs more than high polish and shows in the quote', () => {
    const polish = computePrice({ ...DEFAULT_SPEC, finish: 'polish' })
    const hammered = computePrice({ ...DEFAULT_SPEC, finish: 'hammered' })
    expect(polish.finishExtra).toBe(0)
    expect(hammered.finishExtra).toBeGreaterThan(0)
    expect(hammered.total).toBeGreaterThan(polish.total)
  })
  it('oxidised darkens the metal colour', () => {
    expect(finishById('oxidized').darken).toBeLessThan(1)
    expect(finishById('polish').darken).toBe(1)
  })
})
