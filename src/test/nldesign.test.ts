import { describe, it, expect } from 'vitest'
import { parseDesign } from '../lib/nlDesign'
import { DEFAULT_SPEC, NO_STONE } from '../spec/types'

const p = (s: string) => parseDesign(s, DEFAULT_SPEC).spec

describe('parseDesign', () => {
  it('parses a full ring description', () => {
    const s = p('1.5 ct oval halo in 18k rose gold')
    expect(s.category).toBe('ring')
    expect(s.center.shapeId).toBe('ov')
    expect(s.center.carat).toBeCloseTo(1.5, 3)
    expect(s.setting.typeId).toBe('hal')
    expect(s.metal.alloyId).toBe('18kr')
  })

  it('emerald CUT keeps a diamond, emerald STONE does not', () => {
    const cut = p('2 carat emerald cut diamond solitaire in platinum size 7')
    expect(cut.center.shapeId).toBe('em')
    expect(cut.center.stoneTypeId).toBe('dia')
    expect(cut.setting.typeId).toBe('p4')
    expect(cut.metal.alloyId).toBe('pt95')
    expect(cut.center.carat).toBeCloseTo(2, 3)
    expect(cut.ring.size).toBe(7)

    const stone = p('round emerald pendant')
    expect(stone.category).toBe('pendant')
    expect(stone.center.stoneTypeId).toBe('eme')
    expect(stone.center.shapeId).toBe('rd')
  })

  it('handles plain bands with no centre stone', () => {
    const s = p('plain wedding band in 14k white gold')
    expect(s.category).toBe('ring')
    expect(s.center.stoneTypeId).toBe(NO_STONE)
    expect(s.metal.alloyId).toBe('14kw')
  })

  it('defaults karat to 14 and a setting implies a ring', () => {
    const s = p('rose gold pavé')
    expect(s.metal.alloyId).toBe('14kr')
    expect(s.setting.typeId).toBe('pav')
    expect(s.category).toBe('ring')
  })

  it('distinguishes multi-word stones and reports matches', () => {
    const r = parseDesign('white sapphire studs', DEFAULT_SPEC)
    expect(r.spec.center.stoneTypeId).toBe('wsp')
    expect(r.spec.category).toBe('earring')
    expect(r.matched.some(m => /White Sapphire/.test(m))).toBe(true)
  })

  it('returns no matches for gibberish', () => {
    expect(parseDesign('qwerty zzz', DEFAULT_SPEC).matched).toHaveLength(0)
  })
})
