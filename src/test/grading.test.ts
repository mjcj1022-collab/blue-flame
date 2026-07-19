import { describe, it, expect } from 'vitest'
import { DEFAULT_SPEC, type DesignSpec } from '../spec/types'
import { gradeMultiplier, isGradeable, DEFAULT_GRADING } from '../catalog'
import { computePrice } from '../lib/pricing'

const grade = (over: Partial<DesignSpec['center']['grading']>): DesignSpec =>
  ({ ...DEFAULT_SPEC, center: { ...DEFAULT_SPEC.center, grading: { ...DEFAULT_SPEC.center.grading, ...over } } })

describe('diamond grading', () => {
  it('the G/VS2/Excellent baseline is ×1.0', () => {
    expect(gradeMultiplier(DEFAULT_GRADING)).toBeCloseTo(1.0, 2)
  })
  it('better colour and clarity cost more; worse cost less', () => {
    const top = gradeMultiplier({ cut: 'ex', color: 'D', clarity: 'fl', fluorescence: 'none' })
    const low = gradeMultiplier({ cut: 'gd', color: 'M', clarity: 'i2', fluorescence: 'strong' })
    expect(top).toBeGreaterThan(1.4)
    expect(low).toBeLessThan(0.3)
  })
  it('grade drives the stone price for diamonds', () => {
    const base = computePrice(grade({}))
    const better = computePrice(grade({ color: 'D', clarity: 'if' }))
    const worse = computePrice(grade({ color: 'K', clarity: 'si2' }))
    expect(better.stoneCost).toBeGreaterThan(base.stoneCost)
    expect(worse.stoneCost).toBeLessThan(base.stoneCost)
  })
  it('only colourless faceted stones are gradeable', () => {
    expect(isGradeable('dia')).toBe(true)
    expect(isGradeable('lab')).toBe(true)
    expect(isGradeable('sap')).toBe(false)
    expect(isGradeable('eme')).toBe(false)
  })
  it('grading does not affect a colored stone’s price', () => {
    const sapphire: DesignSpec = { ...DEFAULT_SPEC, center: { ...DEFAULT_SPEC.center, stoneTypeId: 'sap' } }
    const a = computePrice(sapphire).stoneCost
    const b = computePrice({ ...sapphire, center: { ...sapphire.center, grading: { ...sapphire.center.grading, color: 'D', clarity: 'fl' } } }).stoneCost
    expect(a).toBeCloseTo(b, 2)
  })
})
