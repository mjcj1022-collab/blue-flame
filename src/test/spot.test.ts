import { describe, it, expect, afterEach } from 'vitest'
import { applyLiveSpot, SYMBOL_TO_SPOT } from '../lib/spot'
import { ALLOYS } from '../catalog'

// applyLiveSpot mutates the shared catalog; snapshot and restore around each test.
const snapshot = ALLOYS.map(a => a.spot)
afterEach(() => { ALLOYS.forEach((a, i) => { a.spot = snapshot[i] }) })

describe('live spot application', () => {
  it('maps precious metal symbols to metals-API symbols', () => {
    expect(SYMBOL_TO_SPOT.Au).toBe('XAU')
    expect(SYMBOL_TO_SPOT.Ag).toBe('XAG')
    expect(SYMBOL_TO_SPOT.Pt).toBe('XPT')
    expect(SYMBOL_TO_SPOT.Pd).toBe('XPD')
    expect(SYMBOL_TO_SPOT.Ti).toBeUndefined()   // non-precious → no spot
  })

  it('overwrites gold alloys with the live gold price, leaving others', () => {
    const silverBefore = ALLOYS.find(a => a.symbol === 'Ag')!.spot
    const n = applyLiveSpot({ XAU: 3123.45 })
    expect(n).toBe(ALLOYS.filter(a => a.symbol === 'Au').length)
    for (const a of ALLOYS.filter(a => a.symbol === 'Au')) expect(a.spot).toBe(3123.45)
    expect(ALLOYS.find(a => a.symbol === 'Ag')!.spot).toBe(silverBefore)
  })

  it('applies all four metals when provided', () => {
    applyLiveSpot({ XAU: 3000, XAG: 40, XPT: 1100, XPD: 1200 })
    expect(ALLOYS.find(a => a.symbol === 'Au')!.spot).toBe(3000)
    expect(ALLOYS.find(a => a.symbol === 'Ag')!.spot).toBe(40)
    expect(ALLOYS.find(a => a.symbol === 'Pt')!.spot).toBe(1100)
    expect(ALLOYS.find(a => a.symbol === 'Pd')!.spot).toBe(1200)
  })

  it('ignores missing, zero, or negative prices', () => {
    const goldBefore = ALLOYS.find(a => a.symbol === 'Au')!.spot
    const n = applyLiveSpot({ XAU: 0, XPT: -5 })
    expect(n).toBe(0)
    expect(ALLOYS.find(a => a.symbol === 'Au')!.spot).toBe(goldBefore)
  })

  it('reports how many alloys it updated', () => {
    const n = applyLiveSpot({ XPT: 1050 })
    expect(n).toBe(ALLOYS.filter(a => a.symbol === 'Pt').length)
  })
})
