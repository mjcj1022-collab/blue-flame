import { describe, it, expect } from 'vitest'
import { normalizeAiDesign, applyAiDesign, parseAiReply } from '../lib/aiAssistant'
import { useDesign } from '../state/design'
import { DEFAULT_SPEC } from '../spec/types'

describe('deepened AI design patch', () => {
  it('accepts dimensional ring fields and clamps them', () => {
    const d = normalizeAiDesign({ bandWidth: 99, bandProfile: 'knife' })
    expect(d?.bandWidth).toBe(12)          // clamped to max
    expect(d?.bandProfile).toBe('knife')
  })

  it('accepts necklace chain style + length', () => {
    const d = normalizeAiDesign({ chainStyle: 'rope', necklaceLength: 20 })
    expect(d?.chainStyle).toBe('rope')
    expect(d?.necklaceLength).toBe(20)
  })

  it('accepts body-jewelry style + gauge and drops junk', () => {
    const d = normalizeAiDesign({ bodyStyle: 'septum', bodyGauge: 1.2, bodySize: 8, braceletKind: 'nope' })
    expect(d?.bodyStyle).toBe('septum')
    expect(d?.bodyGauge).toBe(1.2)
    expect(d?.braceletKind).toBeUndefined()   // invalid enum dropped
  })

  it('applies a body-jewelry patch to the live store', () => {
    useDesign.setState({ spec: { ...DEFAULT_SPEC } })
    applyAiDesign({ category: 'body', bodyStyle: 'circular', bodyGauge: 2.0, bodySize: 12 })
    const s = useDesign.getState().spec
    expect(s.category).toBe('body')
    expect(s.body.style).toBe('circular')
    expect(s.body.gauge).toBe(2.0)
    expect(s.body.size).toBe(12)
  })

  it('applies ring band width + profile', () => {
    useDesign.setState({ spec: { ...DEFAULT_SPEC } })
    applyAiDesign({ category: 'ring', bandWidth: 7, bandProfile: 'flat' })
    const s = useDesign.getState().spec
    expect(s.ring.width).toBe(7)
    expect(s.ring.profile).toBe('flat')
  })

  it('parses a full descriptive reply end to end', () => {
    const text = JSON.stringify({
      reply: 'A 20-inch rope chain in yellow gold.',
      design: { category: 'necklace', chainStyle: 'rope', necklaceLength: 20 },
    })
    const r = parseAiReply(text)
    expect(r.design?.chainStyle).toBe('rope')
    expect(r.matched).toContain('rope chain')
  })
})
