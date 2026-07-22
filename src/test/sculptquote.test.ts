import { describe, it, expect } from 'vitest'
import { sculptQuote } from '../lib/sculptDoc'
import { sculptHandoff } from '../lib/sculptHandoff'
import { money } from '../lib/units'
import type { SculptObject } from '../state/modeler'

const obj = (over: Partial<SculptObject> & { kind: SculptObject['kind'] }): SculptObject => ({
  id: Math.random().toString(36).slice(2), name: 'o',
  position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  size: 6, material: 'metal', color: 0xffffff, ...over,
})
const band = () => obj({ kind: 'shank', params: { ringSize: 7, profile: 'flat', width: 2.2, thickness: 1.8 } })
const stone = () => obj({ kind: 'gem', material: 'gem', params: { shapeId: 'rd', carat: 1, stoneTypeId: 'dia' } })

const AT = new Date('2026-03-01T12:00:00Z')   // fixed so the doc is deterministic

describe('sculptQuote — the client-facing document', () => {
  it('leads with the brand and the piece', () => {
    const h = sculptHandoff('Wave band', [band()], '14ky')
    const q = sculptQuote(h, { brand: 'Aurum Studio', today: AT })
    expect(q.split('\n')[0]).toBe('AURUM STUDIO — QUOTE')
    expect(q).toContain('Wave band')
  })

  it('states the spec a buyer cares about', () => {
    const h = sculptHandoff('Signet', [band()], '18kw')
    const q = sculptQuote(h, { today: AT })
    expect(q).toContain('18K White')
    expect(q).toContain(`${h.spec.metal.castGrams.toFixed(2)} g`)
    expect(q).toContain('dwt')
  })

  it('quotes the same total as the order — no divergent pricing', () => {
    const h = sculptHandoff('Piece', [band(), stone()], '14ky')
    const q = sculptQuote(h, { today: AT })
    expect(q).toContain(money(h.total))
    for (const line of h.lines) expect(q).toContain(money(line.amount))
  })

  it('dates the quote and expires it, because metal moves', () => {
    const h = sculptHandoff('Piece', [band()], '14ky')
    const q = sculptQuote(h, { today: AT, validDays: 14 })
    expect(q).toContain('2026-03-01')   // quoted
    expect(q).toContain('2026-03-15')   // valid until
    expect(q).toMatch(/holds for 14 days/)
  })

  it('spells out the deposit in money, not just a percentage', () => {
    const h = sculptHandoff('Piece', [band()], '14ky')
    const q = sculptQuote(h, { today: AT, depositRate: 0.5 })
    expect(q).toContain('50% deposit')
    expect(q).toContain(money(h.total * 0.5))
  })

  it('mentions stones only when the piece has them', () => {
    expect(sculptQuote(sculptHandoff('Plain', [band()], '14ky'), { today: AT })).not.toContain('Stones')
    const set = sculptQuote(sculptHandoff('Set', [band(), stone()], '14ky'), { today: AT })
    expect(set).toContain('Stones')
    expect(set).toContain('1.00 ct')
  })

  it('separates sections with blank lines, with or without stones', () => {
    for (const parts of [[band()], [band(), stone()]]) {
      const q = sculptQuote(sculptHandoff('Piece', parts, '14ky'), { today: AT })
      expect(q).toMatch(/\n\nSPECIFICATION\n/)
      expect(q).toMatch(/\n\nPRICE\n/)
      expect(q).toMatch(/\n\nTERMS\n/)
    }
  })

  it('stays a client document — no shop-floor detail', () => {
    const q = sculptQuote(sculptHandoff('Piece', [band()], '14ky'), { today: AT })
    expect(q).not.toMatch(/tech sheet|bounding|watertight|STL|PRODUCTION NOTES/i)
  })
})
