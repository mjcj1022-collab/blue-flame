import { describe, it, expect } from 'vitest'
import { sculptWarnings, MIN_WALL_MM } from '../lib/sculpt'
import type { SculptObject } from '../state/modeler'

const obj = (over: Partial<SculptObject> & { kind: SculptObject['kind'] }): SculptObject => ({
  id: 'x', name: 'Part', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  size: 6, material: 'metal', color: 0xffffff, ...over
})

describe('sculptWarnings', () => {
  it('flags a metal part with a section below the minimum wall', () => {
    // a 6mm box squashed to ~0.3mm on Z
    const thin = obj({ kind: 'box', size: 6, scale: [1, 1, 0.05] })
    const warns = sculptWarnings([thin])
    expect(warns).toHaveLength(1)
    expect(warns[0].part).toBe('Part')
    expect(warns[0].text).toContain('thin section')
  })

  it('passes a normally-proportioned part', () => {
    expect(sculptWarnings([obj({ kind: 'box', size: 6 })])).toHaveLength(0)
  })

  it('ignores gems (only metal is cast)', () => {
    const thinGem = obj({ kind: 'gem', material: 'gem', size: 6, scale: [1, 1, 0.05], params: { carat: 1 } })
    expect(sculptWarnings([thinGem])).toHaveLength(0)
  })

  it('exposes a sane minimum wall constant', () => {
    expect(MIN_WALL_MM).toBeGreaterThan(0)
    expect(MIN_WALL_MM).toBeLessThan(2)
  })
})
