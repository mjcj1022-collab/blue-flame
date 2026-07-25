import { describe, it, expect } from 'vitest'
import { weightScaleFactor } from '../lib/sculpt'

describe('weightScaleFactor', () => {
  it('is the cube root of the weight ratio (volume ∝ scale³)', () => {
    // doubling weight → linear scale of 2^(1/3)
    expect(weightScaleFactor(10, 20)).toBeCloseTo(Math.cbrt(2), 6)
    // 8× weight → exactly 2× linear
    expect(weightScaleFactor(5, 40)).toBeCloseTo(2, 6)
    // 1/8 weight → 0.5× linear
    expect(weightScaleFactor(40, 5)).toBeCloseTo(0.5, 6)
  })

  it('returns 1 for a same-weight or invalid request', () => {
    expect(weightScaleFactor(12, 12)).toBe(1)
    expect(weightScaleFactor(0, 20)).toBe(1)
    expect(weightScaleFactor(10, 0)).toBe(1)
    expect(weightScaleFactor(10, -3)).toBe(1)
  })

  it('clamps to a sane range so a bad target cannot explode the piece', () => {
    expect(weightScaleFactor(1, 100000)).toBe(5)     // would be ~46× linear → clamped
    expect(weightScaleFactor(100000, 1)).toBe(0.2)   // would be ~0.02× → clamped
  })

  it('applied twice composes toward the target (cube law)', () => {
    // scaling by f multiplies weight by f³; applying the factor once should land on target
    const cur = 6.4, target = 9.1
    const f = weightScaleFactor(cur, target)
    expect(cur * f ** 3).toBeCloseTo(target, 4)
  })
})
