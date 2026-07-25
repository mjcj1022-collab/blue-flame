import { describe, it, expect } from 'vitest'
import { parseAiReply, normalizeAiDesign, buildSystemPrompt } from '../lib/aiAssistant'

describe('AI assistant reply parsing', () => {
  it('parses a clean JSON envelope with a valid design', () => {
    const r = parseAiReply('{"reply":"Here is a rose-gold solitaire.","design":{"category":"ring","alloyId":"14kr","shapeId":"ov","carat":1.5,"settingId":"p4"}}')
    expect(r.reply).toContain('rose-gold')
    expect(r.design).toEqual({ category: 'ring', alloyId: '14kr', shapeId: 'ov', carat: 1.5, settingId: 'p4' })
    expect(r.matched).toContain('1.50 ct')
  })

  it('extracts JSON from a fenced code block amid prose', () => {
    const text = 'Sure! Here you go:\n```json\n{"reply":"Done","design":{"finish":"satin"}}\n```\nHope that helps.'
    const r = parseAiReply(text)
    expect(r.design).toEqual({ finish: 'satin' })
  })

  it('does not truncate on braces or quotes inside the reply text', () => {
    const r = parseAiReply('{"reply":"Try a } shape with a { motif, \\"cathedral\\" style","design":{"category":"ring","finish":"matte"}}')
    expect(r.design).toEqual({ category: 'ring', finish: 'matte' })
    expect(r.reply).toContain('cathedral')
  })

  it('treats a non-JSON reply as plain chat', () => {
    const r = parseAiReply('A halo setting frames the center stone with accent diamonds.')
    expect(r.design).toBeNull()
    expect(r.reply).toContain('halo')
  })

  it('drops hallucinated ids but keeps the valid ones', () => {
    const d = normalizeAiDesign({ alloyId: 'unobtainium', shapeId: 'ov', stoneTypeId: 'sap', carat: 2 })
    expect(d).toEqual({ shapeId: 'ov', stoneTypeId: 'sap', carat: 2 })
  })

  it('clamps out-of-range numbers', () => {
    expect(normalizeAiDesign({ carat: 999 })).toEqual({ carat: 20 })
    expect(normalizeAiDesign({ size: 0 })).toEqual({ size: 2 })
  })

  it('accepts the no-stone sentinel', () => {
    expect(normalizeAiDesign({ stoneTypeId: 'none' })).toEqual({ stoneTypeId: 'none' })
  })

  it('returns null when nothing valid remains', () => {
    expect(normalizeAiDesign({ alloyId: 'nope', foo: 'bar' })).toBeNull()
    expect(normalizeAiDesign(null)).toBeNull()
    expect(normalizeAiDesign('a string')).toBeNull()
  })

  it('system prompt advertises real catalog ids', () => {
    const p = buildSystemPrompt()
    expect(p).toContain('14kr')      // an alloy id
    expect(p).toContain('none')      // the no-stone sentinel
    expect(p).toContain('category:')
  })
})
