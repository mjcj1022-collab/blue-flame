import { describe, it, expect } from 'vitest'
import { DEFAULT_SPEC, type DesignSpec } from '../spec/types'
import { computeMetal, convertWeight, patternToMetal, PATTERN_DENSITY } from '../lib/metal'
import { alloyById } from '../catalog'
import { sizeToDiameter } from '../lib/sizing'

const spec = (over: Partial<DesignSpec['ring']> & { alloy?: string; carat?: number; setting?: string }): DesignSpec => ({
  ...DEFAULT_SPEC,
  ring: { ...DEFAULT_SPEC.ring, ...over },
  metal: { alloyId: over.alloy ?? '14ky' },
  center: { ...DEFAULT_SPEC.center, carat: over.carat ?? DEFAULT_SPEC.center.carat },
  setting: { typeId: over.setting ?? DEFAULT_SPEC.setting.typeId }
})

// Trade reference ranges. If a result falls outside these, the volume model is
// wrong — not the density. See docs/metal-weight.md
const cases: [string, DesignSpec, number, number][] = [
  ['2 mm plain band, size 7, 14KY',      spec({ size:7,  width:2, thickness:1.6, carat:0.001 }), 1.8, 2.6],
  ['4 mm comfort band, size 10, 14KY',   spec({ size:10, width:4, thickness:1.7, fit:'comfort', carat:0.001 }), 4.8, 6.0],
  ['6 mm comfort band, size 10, 14KY',   spec({ size:10, width:6, thickness:1.8, fit:'comfort', carat:0.001 }), 7.5, 9.5],
  ['8 mm mens band, size 11, 14KY',      spec({ size:11, width:8, thickness:2.0, fit:'comfort', carat:0.001 }), 11, 14],
  ['1 ct solitaire 4-prong, 14KY',       spec({ carat:1 }), 2.4, 4.0],
  ['1 ct solitaire bezel, 14KY',         spec({ carat:1, setting:'bz' }), 2.6, 4.5],
  ['1 ct solitaire, platinum',           spec({ carat:1, alloy:'pt95' }), 4.0, 6.5],
  ['3 ct solitaire 6-prong, 14KY',       spec({ size:7, width:2.4, thickness:2.0, carat:3, setting:'p6' }), 4.0, 6.5],
  ['2 mm band, size 7, sterling',        spec({ size:7, width:2, thickness:1.6, alloy:'ss92', carat:0.001 }), 1.4, 2.0],
  ['1 ct solitaire, 18KY',               spec({ carat:1, alloy:'18ky' }), 3.0, 4.8]
]

describe('cast weight against trade reference ranges', () => {
  for (const [name, s, lo, hi] of cases) {
    it(name, () => {
      const g = computeMetal(s).cast
      expect(g).toBeGreaterThanOrEqual(lo)
      expect(g).toBeLessThanOrEqual(hi)
    })
  }
})

describe('the four weights are ordered correctly', () => {
  it('finished < cast < pour', () => {
    const m = computeMetal(spec({ carat: 1 }))
    expect(m.finished).toBeLessThan(m.cast)
    expect(m.cast).toBeLessThan(m.pour)
  })
  it('pour is 1.5x to 4x cast for a single piece', () => {
    const m = computeMetal(spec({ carat: 1 }))
    expect(m.pourRatio).toBeGreaterThan(1.5)
    expect(m.pourRatio).toBeLessThan(4.5)
  })
  it('fine content matches the karat fraction', () => {
    const m = computeMetal(spec({ carat: 1 }))
    expect(m.fineGrams / m.finished).toBeCloseTo(0.583, 3)
  })
})

describe('density scaling', () => {
  it('platinum is 1.599x the weight of 14KY for identical geometry', () => {
    const a = computeMetal(spec({ carat: 1 })).cast
    const b = computeMetal(spec({ carat: 1, alloy: 'pt95' })).cast
    expect(b / a).toBeCloseTo(20.9 / 13.07, 3)
  })
  it('metal-to-metal conversion matches density ratio', () => {
    const g = convertWeight(4.0, alloyById('ss92'), alloyById('14ky'))
    expect(g).toBeCloseTo(5.05, 1)
  })
})

describe('pattern conversion', () => {
  it('resin yields more metal than wax for the same pattern weight', () => {
    const wax = patternToMetal(1, PATTERN_DENSITY.injectionWax, alloyById('14ky'))
    const resin = patternToMetal(1, PATTERN_DENSITY.castableResin, alloyById('14ky'))
    expect(wax).toBeCloseTo(13.76, 1)
    expect(resin).toBeCloseTo(11.37, 1)
    expect(wax).toBeGreaterThan(resin)
  })
})

describe('sizing', () => {
  it('size 7 is 17.32 mm inside diameter', () => {
    expect(sizeToDiameter(7)).toBeCloseTo(17.32, 2)
  })
  it('a larger size uses more metal', () => {
    const a = computeMetal(spec({ size: 5, carat: 1 })).cast
    const b = computeMetal(spec({ size: 11, carat: 1 })).cast
    expect(b).toBeGreaterThan(a)
  })
})

describe('comfort fit removes metal', () => {
  it('comfort weighs less than standard at the same dimensions', () => {
    const std = computeMetal(spec({ width: 6, thickness: 1.8, carat: 1 })).cast
    const cf = computeMetal(spec({ width: 6, thickness: 1.8, fit: 'comfort', carat: 1 })).cast
    expect(cf).toBeLessThan(std)
  })
})
