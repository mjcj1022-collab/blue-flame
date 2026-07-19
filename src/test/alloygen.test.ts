import { describe, it, expect } from 'vitest'
import { composeAlloy, compositionToAlloy, RECIPES } from '../lib/alloygen'

describe('alloy composition', () => {
  it('14K yellow recipe is ~14 karat, 58.5% fine, gold family', () => {
    const c = composeAlloy({ au: 58.5, cu: 29, ag: 12.5 })
    expect(c.family).toBe('gold')
    expect(c.fineness).toBeCloseTo(0.585, 2)
    expect(c.karat!).toBeCloseTo(14.0, 1)
    expect(c.density).toBeGreaterThan(12.5)
    expect(c.density).toBeLessThan(14)
  })

  it('pure gold has gold density and 24 karat', () => {
    const c = composeAlloy({ au: 100 })
    expect(c.density).toBeCloseTo(19.32, 1)
    expect(c.karat!).toBeCloseTo(24, 1)
  })

  it('density follows the inverse rule of mixtures (volumes add)', () => {
    const c = composeAlloy({ au: 50, ag: 50 })
    const expected = 1 / (0.5 / 19.32 + 0.5 / 10.49)
    expect(c.density).toBeCloseTo(expected, 1)
  })

  it('sterling is silver family at 925 fine', () => {
    const c = composeAlloy({ ag: 92.5, cu: 7.5 })
    expect(c.family).toBe('silver')
    expect(c.perThousand).toBe(925)
  })

  it('platinum 950 is platinum family', () => {
    const c = composeAlloy({ pt: 95, co: 5 })
    expect(c.family).toBe('platinum')
    expect(c.perThousand).toBe(950)
  })

  it('adding copper raises karat is false; adding gold raises karat', () => {
    const less = composeAlloy({ au: 50, cu: 50 }).karat!
    const more = composeAlloy({ au: 75, cu: 25 }).karat!
    expect(more).toBeGreaterThan(less)
  })

  it('nickel white gold flags the allergen', () => {
    const c = composeAlloy({ au: 58.5, cu: 17, ni: 17, zn: 7.5 })
    expect(c.notes.some(n => /nickel/i.test(n))).toBe(true)
  })

  it('under 30% precious is a base alloy', () => {
    const c = composeAlloy({ au: 10, cu: 90 })
    expect(c.family).toBe('base')
  })

  it('every standard recipe composes without error', () => {
    for (const r of RECIPES) {
      const c = composeAlloy(r.mix)
      expect(c.totalMass).toBeGreaterThan(0)
      expect(c.density).toBeGreaterThan(0)
    }
  })

  it('converts to a design-usable alloy row', () => {
    const c = composeAlloy({ au: 75, ag: 15, cu: 10 })
    const alloy = compositionToAlloy(c, 'cst-1', 'My 18K')
    expect(alloy.fine).toBeCloseTo(0.75, 2)
    expect(alloy.symbol).toBe('Au')
    expect(alloy.density).toBeGreaterThan(14)
  })
})
